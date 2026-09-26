"""
LegalLens — Chat Router
Document Q&A endpoint using RAG pipeline with persistent multi-turn conversational memory.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.database import get_db
from app.db.models import DocumentRecord, ChatSessionRecord, ChatMessageRecord
from app.models.schemas import ChatRequest, ChatResponse, ChatHistoryResponse, ChatMessageItem, SourceReference
from app.services.rag_service import rag_service
from app.services.vector_store import vector_store
from app.services.text_chunker import TextChunker
from app.routers.documents import _get_doc_dir
from app.utils.helpers import generate_id

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _get_or_create_session(
    document_id: str,
    session_id: Optional[str],
    db: AsyncSession,
) -> ChatSessionRecord:
    """Retrieve existing chat session or create a new one for this document."""
    if session_id:
        existing = await db.get(ChatSessionRecord, session_id)
        if existing and existing.document_id == document_id:
            return existing

    # Find the most recent session for this document
    result = await db.execute(
        select(ChatSessionRecord)
        .where(ChatSessionRecord.document_id == document_id)
        .order_by(ChatSessionRecord.updated_at.desc())
    )
    latest = result.scalars().first()
    if latest:
        return latest

    # Create new session
    new_session = ChatSessionRecord(
        id=generate_id(),
        document_id=document_id,
        title="Document Q&A",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session


@router.get("/{document_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    document_id: str,
    session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve persistent chat history for a document."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    session = await _get_or_create_session(document_id, session_id, db)

    result = await db.execute(
        select(ChatMessageRecord)
        .where(ChatMessageRecord.session_id == session.id)
        .order_by(ChatMessageRecord.created_at.asc())
    )
    db_messages = result.scalars().all()

    messages = []
    for msg in db_messages:
        sources_list = [
            SourceReference(
                section=s.get("section", "Document"),
                page=s.get("page"),
                text_snippet=s.get("text_snippet", ""),
                relevance_score=s.get("relevance_score", 0.0),
            )
            for s in (msg.sources or [])
        ]
        created_str = msg.created_at.isoformat() if msg.created_at else None
        messages.append(
            ChatMessageItem(
                id=msg.id,
                role=msg.role,
                text=msg.text,
                sources=sources_list,
                confidence=msg.confidence,
                not_found=msg.not_found,
                created_at=created_str,
            )
        )

    return ChatHistoryResponse(
        document_id=document_id,
        session_id=session.id,
        messages=messages,
    )


@router.delete("/{document_id}/history")
async def clear_chat_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear all chat messages and reset sessions for a document."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.execute(
        delete(ChatMessageRecord).where(ChatMessageRecord.document_id == document_id)
    )
    await db.execute(
        delete(ChatSessionRecord).where(ChatSessionRecord.document_id == document_id)
    )
    await db.commit()

    return {"message": "Chat history cleared successfully", "document_id": document_id}


@router.post("/{document_id}", response_model=ChatResponse)
async def ask_document_question(
    document_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about an uploaded document with multi-turn memory.

    Uses RAG pipeline:
    1. Loads prior conversation turns for contextual continuity
    2. Retrieves relevant document chunks via semantic search
    3. Builds grounded context and invokes LLM
    4. Persists user question and assistant answer in the database
    """
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found. Please upload a document first.",
        )

    # Ensure vector store indexing
    if not vector_store.document_exists(document_id):
        full_text = doc.full_text or ""
        if not full_text:
            text_path = _get_doc_dir(document_id) / "extracted_text.txt"
            if text_path.exists():
                full_text = text_path.read_text(encoding="utf-8")
        if full_text:
            chunker = TextChunker()
            chunks = chunker.chunk_text(full_text)
            vector_store.store_chunks(document_id, [c.to_dict() for c in chunks])

    # Get or create chat session
    session = await _get_or_create_session(document_id, request.session_id, db)

    # Load recent conversation turns for conversational memory
    history_res = await db.execute(
        select(ChatMessageRecord)
        .where(ChatMessageRecord.session_id == session.id)
        .order_by(ChatMessageRecord.created_at.desc())
        .limit(6)
    )
    recent_records = list(reversed(history_res.scalars().all()))
    history_turns = [{"role": m.role, "text": m.text} for m in recent_records]

    # Save user message
    user_msg = ChatMessageRecord(
        session_id=session.id,
        document_id=document_id,
        role="user",
        text=request.question,
    )
    db.add(user_msg)
    await db.flush()

    try:
        result = await rag_service.ask_question(
            document_id=document_id,
            question=request.question,
            simplicity_level=request.simplicity_level,
            history=history_turns,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process question: {str(e)}",
        )

    sources = [
        {
            "section": s.get("section", "Document"),
            "page": s.get("page"),
            "text_snippet": s.get("text_snippet", ""),
            "relevance_score": s.get("relevance_score", 0),
        }
        for s in result.get("sources", [])
    ]
    answer_text = result.get("answer", "Unable to generate an answer.")
    confidence = result.get("confidence", "medium")
    not_found = result.get("not_found", False)

    # Save assistant message
    ai_msg = ChatMessageRecord(
        session_id=session.id,
        document_id=document_id,
        role="assistant",
        text=answer_text,
        sources=sources,
        confidence=confidence,
        not_found=not_found,
    )
    db.add(ai_msg)
    await db.commit()

    return ChatResponse(
        answer=answer_text,
        sources=[SourceReference(**s) for s in sources],
        confidence=confidence,
        not_found=not_found,
        session_id=session.id,
    )
