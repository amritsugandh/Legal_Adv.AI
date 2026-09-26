"""
LegalLens — Documents Router
Handles document upload, processing, summary retrieval, and database persistence.
"""

import os
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.config import settings
from app.db.database import get_db
from app.db.models import DocumentRecord, AnalysisRecord, LawyerPrepRecord
from app.models.schemas import (
    DocumentUploadResponse,
    DocumentSummary,
    DocumentInfo,
    FullAnalysis,
    ClauseExplainRequest,
    LawyerPrepReport,
    RawTextResponse,
    ClauseRewriteRequest,
    ClauseRewriteResponse,
)
from app.services.document_processor import DocumentProcessor
from app.services.text_chunker import TextChunker
from app.services.vector_store import vector_store
from app.services.rag_service import rag_service
from app.services.analysis_service import analysis_service
from app.utils.helpers import generate_id, get_timestamp, get_file_extension

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _get_doc_dir(doc_id: str) -> Path:
    """Get the storage directory for a document."""
    return Path(settings.UPLOAD_DIR) / doc_id


def _build_document_metadata(doc_dict: dict, record: Optional[DocumentRecord] = None) -> dict:
    """Build and sanitize document metadata dictionary for schema compatibility."""
    summary_data = (record.metadata_json if record else None) or doc_dict.get("summary_data") or {}
    raw_parties = summary_data.get("parties") or []
    if isinstance(raw_parties, list):
        parties = [
            str(p.get("name") or p.get("party") or p) if isinstance(p, dict) else str(p)
            for p in raw_parties
            if p
        ]
    elif isinstance(raw_parties, dict):
        parties = [str(v) for v in raw_parties.values() if v]
    elif raw_parties:
        parties = [str(raw_parties)]
    else:
        parties = []

    try:
        total_clauses = int(summary_data.get("total_clauses") or 0)
    except (ValueError, TypeError):
        total_clauses = 0

    page_count = record.page_count if record else doc_dict.get("page_count", 0)
    try:
        total_pages = int(page_count or summary_data.get("total_pages") or 0)
    except (ValueError, TypeError):
        total_pages = 0

    doc_type = (
        (record.document_type if record else None)
        or summary_data.get("document_type")
        or doc_dict.get("document_type")
        or "Unknown"
    )
    title = (
        summary_data.get("title")
        or (record.filename if record else None)
        or doc_dict.get("filename")
        or "Document"
    )

    return {
        "document_type": doc_type,
        "title": title,
        "parties": parties,
        "effective_date": summary_data.get("effective_date"),
        "duration": summary_data.get("duration"),
        "governing_law": summary_data.get("governing_law"),
        "total_pages": total_pages,
        "total_clauses": total_clauses,
    }


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a legal document (PDF or DOCX) for analysis.

    Steps:
    1. Validate file type and size
    2. Save file to disk
    3. Extract text (with OCR fallback for scanned pages)
    4. Chunk and embed into vector store
    5. Generate AI summary
    6. Persist Document record into SQLite database
    """
    # Validate
    contents = await file.read()
    is_valid, error = DocumentProcessor.validate_file(
        filename=file.filename or "unknown",
        file_size=len(contents),
        max_size_mb=settings.MAX_FILE_SIZE_MB,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Generate ID and save file
    doc_id = generate_id()
    doc_dir = _get_doc_dir(doc_id)
    doc_dir.mkdir(parents=True, exist_ok=True)

    file_ext = get_file_extension(file.filename or "document.pdf")
    saved_path = doc_dir / f"document.{file_ext}"

    with open(saved_path, "wb") as f:
        f.write(contents)

    # Extract text with OCR fallback
    try:
        extracted = await DocumentProcessor.extract(str(saved_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    # Chunk the document
    chunker = TextChunker()
    pages_data = [p.to_dict() for p in extracted.pages]
    chunks = chunker.chunk_document(pages_data)

    # Store chunks in vector store
    chunk_dicts = [c.to_dict() for c in chunks]
    vector_store.store_chunks(doc_id, chunk_dicts)

    # Generate summary
    try:
        summary_data = await rag_service.generate_summary(extracted.full_text)
    except Exception:
        summary_data = {
            "document_type": document_type or "Unknown",
            "summary": "Summary generation is in progress...",
            "key_points": [],
            "important_clauses": [],
        }

    safe_filename = file.filename or "uploaded_document"
    timestamp = get_timestamp()
    resolved_doc_type = document_type or summary_data.get("document_type") or "Unknown"

    # Persist in SQLite Database
    doc_record = DocumentRecord(
        id=doc_id,
        filename=safe_filename,
        file_type=file_ext,
        page_count=extracted.page_count,
        status="ready",
        uploaded_at=timestamp,
        document_type=resolved_doc_type,
        summary=summary_data.get("summary", ""),
        key_points=summary_data.get("key_points") or [],
        important_clauses=summary_data.get("important_clauses") or [],
        metadata_json=summary_data,
        full_text=extracted.full_text,
        chunk_count=len(chunks),
        is_scanned=extracted.is_scanned,
    )
    db.add(doc_record)
    await db.commit()
    await db.refresh(doc_record)

    # Save metadata to disk as local backup
    meta_path = doc_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        meta_save = {
            "id": doc_id,
            "filename": safe_filename,
            "file_type": file_ext,
            "page_count": extracted.page_count,
            "status": "ready",
            "uploaded_at": timestamp,
            "chunk_count": len(chunks),
            "summary_data": summary_data,
            "document_type": resolved_doc_type,
            "is_scanned": extracted.is_scanned,
        }
        json.dump(meta_save, f, indent=2)

    # Save full text to disk
    text_path = doc_dir / "extracted_text.txt"
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(extracted.full_text)

    return DocumentUploadResponse(
        id=doc_id,
        filename=safe_filename,
        file_type=file_ext,
        page_count=extracted.page_count,
        status="ready",
        uploaded_at=timestamp,
    )


@router.get("/{document_id}", response_model=DocumentInfo)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get document info and metadata from the database."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentInfo(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        page_count=doc.page_count,
        status=doc.status,
        uploaded_at=doc.uploaded_at,
        summary=doc.summary,
        key_points=doc.key_points or [],
        metadata=_build_document_metadata({}, record=doc),
    )


@router.get("/{document_id}/summary", response_model=DocumentSummary)
async def get_document_summary(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get the AI-generated document summary from database."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentSummary(
        id=doc.id,
        filename=doc.filename,
        metadata=_build_document_metadata({}, record=doc),
        summary=doc.summary or "",
        key_points=doc.key_points or [],
        important_clauses=doc.important_clauses or [],
    )


@router.get("/{document_id}/analysis", response_model=FullAnalysis)
async def get_full_analysis(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get full document analysis with database caching."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check cached analysis in database
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.document_id == document_id)
    )
    cached_analysis = result.scalar_one_or_none()
    if cached_analysis:
        return FullAnalysis(
            document_id=document_id,
            clauses=cached_analysis.clauses or [],
            risks=cached_analysis.risks or [],
            obligations=cached_analysis.obligations or [],
            dates=cached_analysis.dates or [],
            legal_terms=cached_analysis.legal_terms or [],
            action_items=cached_analysis.action_items or [],
        )

    # Compute analysis if not yet cached
    full_text = doc.full_text or ""
    if not full_text:
        text_path = _get_doc_dir(document_id) / "extracted_text.txt"
        if text_path.exists():
            full_text = text_path.read_text(encoding="utf-8")

    if not full_text:
        raise HTTPException(status_code=500, detail="Document text not available")

    analysis_res = await analysis_service.full_analysis(document_id, full_text)

    # Cache into database
    record = AnalysisRecord(
        document_id=document_id,
        clauses=[c.model_dump() for c in analysis_res.clauses],
        risks=[r.model_dump() for r in analysis_res.risks],
        obligations=[o.model_dump() for o in analysis_res.obligations],
        dates=[d.model_dump() for d in analysis_res.dates],
        legal_terms=[t.model_dump() for t in analysis_res.legal_terms],
        action_items=analysis_res.action_items,
    )
    db.add(record)
    await db.commit()

    return analysis_res


@router.get("/{document_id}/lawyer-prep", response_model=LawyerPrepReport)
async def get_lawyer_prep_report(document_id: str, db: AsyncSession = Depends(get_db)):
    """Generate or retrieve a structured lawyer preparation report with database caching."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check database cache
    result = await db.execute(
        select(LawyerPrepRecord).where(LawyerPrepRecord.document_id == document_id)
    )
    cached_prep = result.scalar_one_or_none()
    if cached_prep and cached_prep.report_data:
        return LawyerPrepReport(**cached_prep.report_data)

    full_text = doc.full_text or ""
    if not full_text:
        text_path = _get_doc_dir(document_id) / "extracted_text.txt"
        if text_path.exists():
            full_text = text_path.read_text(encoding="utf-8")

    if not full_text:
        raise HTTPException(status_code=500, detail="Document text not available")

    report = await analysis_service.generate_lawyer_prep(full_text)

    # Cache into database
    prep_record = LawyerPrepRecord(
        document_id=document_id,
        report_data=report.model_dump(),
    )
    db.add(prep_record)
    await db.commit()

    return report


@router.post("/{document_id}/explain-clause")
async def explain_clause(
    document_id: str,
    payload: ClauseExplainRequest,
    db: AsyncSession = Depends(get_db),
):
    """Explain a specific clause in plain language."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    result = await analysis_service.explain_clause(payload.clause_text)
    return result


@router.post("/{document_id}/rewrite-clause", response_model=ClauseRewriteResponse)
async def rewrite_clause(
    document_id: str,
    payload: ClauseRewriteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Draft an amended counter-proposal clause tailored to a desired stance."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    result = await analysis_service.rewrite_clause(
        clause_text=payload.clause_text,
        target_stance=payload.target_stance,
        custom_instruction=payload.custom_instruction or "",
    )
    return ClauseRewriteResponse(**result)


@router.get("/{document_id}/raw-text", response_model=RawTextResponse)
async def get_raw_text(document_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full unformatted extracted text of the document."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    full_text = doc.full_text or ""
    if not full_text:
        text_path = _get_doc_dir(document_id) / "extracted_text.txt"
        if text_path.exists():
            full_text = text_path.read_text(encoding="utf-8")

    return RawTextResponse(
        id=doc.id,
        filename=doc.filename,
        page_count=doc.page_count,
        full_text=full_text,
        is_scanned=doc.is_scanned,
    )


@router.get("/{document_id}/export/lawyer-prep")
async def export_lawyer_prep(document_id: str, db: AsyncSession = Depends(get_db)):
    """Export the lawyer consultation brief as a clean Markdown report."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get cached report or generate
    result = await db.execute(
        select(LawyerPrepRecord).where(LawyerPrepRecord.document_id == document_id)
    )
    cached = result.scalar_one_or_none()
    if cached and cached.report_data:
        report = LawyerPrepReport(**cached.report_data)
    else:
        full_text = doc.full_text or ""
        if not full_text:
            text_path = _get_doc_dir(document_id) / "extracted_text.txt"
            if text_path.exists():
                full_text = text_path.read_text(encoding="utf-8")
        report = await analysis_service.generate_lawyer_prep(full_text)

    # Format into markdown dossier
    lines = [
        f"# Legal Consultation Dossier",
        f"**Subject Document:** {report.document_title} ({doc.filename})",
        f"**Generated:** {doc.uploaded_at}",
        f"",
        f"---",
        f"",
        f"## 1. Priority Areas to Discuss with Counsel",
    ]
    for i, topic in enumerate(report.key_areas_to_discuss, 1):
        clause_str = f" (*{topic.clause_reference}*)" if topic.clause_reference else ""
        lines.append(f"### {i}. {topic.topic}{clause_str}")
        lines.append(f"{topic.why_discuss}\n")

    lines.append("## 2. Targeted Questions to Ask Your Attorney")
    for i, q in enumerate(report.questions_to_ask, 1):
        lines.append(f"{i}. {q}")

    lines.append("\n## 3. Documents & Evidence to Bring")
    for item in report.documents_to_bring:
        lines.append(f"- [ ] {item}")

    lines.append("\n## 4. Pre-Consultation Action Items")
    for item in report.action_checklist:
        lines.append(f"- [ ] {item}")

    md_content = "\n".join(lines)
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="Lawyer_Prep_{doc.id}.md"'
        },
    )


@router.get("/{document_id}/download")
async def download_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Download the original uploaded document file."""
    doc = await db.get(DocumentRecord, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_dir = _get_doc_dir(document_id)
    file_path = doc_dir / f"document.{doc.file_type}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Physical document file not found")

    media_type = "application/pdf" if doc.file_type == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(
        path=str(file_path),
        filename=doc.filename,
        media_type=media_type,
    )


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document, its database records, and indexed vector embeddings."""
    doc = await db.get(DocumentRecord, document_id)
    if doc:
        await db.delete(doc)
        await db.commit()

    vector_store.delete_document(document_id)

    doc_dir = _get_doc_dir(document_id)
    if doc_dir.exists():
        import shutil
        shutil.rmtree(doc_dir, ignore_errors=True)

    return {"message": "Document deleted successfully", "id": document_id}


@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all uploaded documents from the database."""
    result = await db.execute(
        select(DocumentRecord).order_by(DocumentRecord.created_at.desc())
    )
    docs_records = result.scalars().all()

    docs = []
    for doc in docs_records:
        summary_data = doc.metadata_json or {}
        docs.append({
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "page_count": doc.page_count,
            "status": doc.status,
            "uploaded_at": doc.uploaded_at,
            "document_type": doc.document_type or summary_data.get("document_type") or "Unknown",
            "is_scanned": doc.is_scanned,
        })
    return {"documents": docs}
