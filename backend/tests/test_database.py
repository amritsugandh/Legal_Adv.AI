"""
Tests for LegalLens database models and CRUD operations.
"""

import pytest
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import DocumentRecord, AnalysisRecord, ChatSessionRecord, ChatMessageRecord


@pytest.mark.asyncio
async def test_document_record_crud():
    """Test inserting, reading, and updating DocumentRecord."""
    test_id = "test_doc_db_001"

    async with AsyncSessionLocal() as session:
        # Create
        doc = DocumentRecord(
            id=test_id,
            filename="NDA_Sample.pdf",
            file_type="pdf",
            page_count=3,
            status="ready",
            uploaded_at="2026-09-26T00:00:00Z",
            document_type="Non-Disclosure Agreement",
            summary="A standard reciprocal NDA.",
            full_text="This agreement is entered into...",
            key_points=["Mutual confidentiality", "2-year survival"]
        )
        session.add(doc)
        await session.commit()

    async with AsyncSessionLocal() as session:
        # Read
        retrieved = await session.get(DocumentRecord, test_id)
        assert retrieved is not None
        assert retrieved.filename == "NDA_Sample.pdf"
        assert retrieved.page_count == 3
        assert len(retrieved.key_points) == 2

        # Update
        retrieved.status = "analyzed"
        await session.commit()

    async with AsyncSessionLocal() as session:
        # Verify update
        updated = await session.get(DocumentRecord, test_id)
        assert updated.status == "analyzed"

        # Cleanup
        await session.delete(updated)
        await session.commit()


@pytest.mark.asyncio
async def test_chat_persistence_crud():
    """Test saving and retrieving multi-turn chat messages."""
    session_id = "test_chat_session_001"
    doc_id = "test_chat_doc_001"

    async with AsyncSessionLocal() as session:
        doc = DocumentRecord(
            id=doc_id,
            filename="Chat_Doc.pdf",
            file_type="pdf",
            uploaded_at="2026-09-26T00:00:00Z",
            status="ready"
        )
        session.add(doc)
        await session.flush()

        chat_sess = ChatSessionRecord(
            id=session_id,
            document_id=doc_id
        )
        session.add(chat_sess)
        await session.flush()

        msg1 = ChatMessageRecord(
            session_id=session_id,
            document_id=doc_id,
            role="user",
            text="What is the notice period?"
        )
        msg2 = ChatMessageRecord(
            session_id=session_id,
            document_id=doc_id,
            role="assistant",
            text="The notice period is 30 days written notice."
        )
        session.add_all([msg1, msg2])
        await session.commit()

    async with AsyncSessionLocal() as session:
        stmt = (
            select(ChatMessageRecord)
            .where(ChatMessageRecord.session_id == session_id)
            .order_by(ChatMessageRecord.created_at.asc())
        )
        result = await session.execute(stmt)
        messages = result.scalars().all()
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[1].text == "The notice period is 30 days written notice."

        # Cleanup
        for m in messages:
            await session.delete(m)
        cs = await session.get(ChatSessionRecord, session_id)
        if cs:
            await session.delete(cs)
        d = await session.get(DocumentRecord, doc_id)
        if d:
            await session.delete(d)
        await session.commit()
