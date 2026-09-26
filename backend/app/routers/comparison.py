"""
LegalLens — Comparison Router
Endpoints to compare two contracts side-by-side.
"""

from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import ComparisonResult
from app.db.database import get_db
from app.db.models import DocumentRecord
from app.services.document_processor import DocumentProcessor
from app.services.comparison_service import comparison_service
from app.routers.documents import _get_doc_dir

router = APIRouter(prefix="/api/compare", tags=["compare"])


class CompareExistingRequest(BaseModel):
    document_a_id: str
    document_b_id: str


@router.post("/by-ids", response_model=ComparisonResult)
async def compare_by_ids(request: CompareExistingRequest, db: AsyncSession = Depends(get_db)):
    """Compare two documents that were already uploaded."""
    doc_a = await db.get(DocumentRecord, request.document_a_id)
    doc_b = await db.get(DocumentRecord, request.document_b_id)

    if not doc_a or not doc_b:
        raise HTTPException(
            status_code=404,
            detail="One or both documents not found. Ensure both are uploaded.",
        )

    text_a = doc_a.full_text or ""
    text_b = doc_b.full_text or ""

    # Fallback: load extracted text from disk
    if not text_a:
        text_path = _get_doc_dir(request.document_a_id) / "extracted_text.txt"
        if text_path.exists():
            text_a = text_path.read_text(encoding="utf-8")
    if not text_b:
        text_path = _get_doc_dir(request.document_b_id) / "extracted_text.txt"
        if text_path.exists():
            text_b = text_path.read_text(encoding="utf-8")

    if not text_a or not text_b:
        raise HTTPException(status_code=400, detail="Document text could not be loaded.")

    result = await comparison_service.compare_documents(
        doc_a_name=doc_a.filename or "Contract A",
        doc_a_text=text_a,
        doc_b_name=doc_b.filename or "Contract B",
        doc_b_text=text_b,
    )
    return result


@router.post("/upload", response_model=ComparisonResult)
async def compare_upload_files(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
):
    """Upload two documents simultaneously and receive a full comparison."""
    content_a = await file_a.read()
    content_b = await file_b.read()

    # Validate both files
    valid_a, err_a = DocumentProcessor.validate_file(file_a.filename or "file_a.pdf", len(content_a))
    if not valid_a:
        raise HTTPException(status_code=400, detail=f"File A error: {err_a}")

    valid_b, err_b = DocumentProcessor.validate_file(file_b.filename or "file_b.pdf", len(content_b))
    if not valid_b:
        raise HTTPException(status_code=400, detail=f"File B error: {err_b}")

    # Temporary write and extraction
    import tempfile
    import os

    ext_a = (file_a.filename or "").rsplit(".", 1)[-1].lower() if "." in (file_a.filename or "") else "pdf"
    ext_b = (file_b.filename or "").rsplit(".", 1)[-1].lower() if "." in (file_b.filename or "") else "pdf"

    tmp_a_path = None
    tmp_b_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext_a}", delete=False) as tmp_a:
            tmp_a.write(content_a)
            tmp_a_path = tmp_a.name

        with tempfile.NamedTemporaryFile(suffix=f".{ext_b}", delete=False) as tmp_b:
            tmp_b.write(content_b)
            tmp_b_path = tmp_b.name

        extracted_a = await DocumentProcessor.extract(tmp_a_path)
        extracted_b = await DocumentProcessor.extract(tmp_b_path)

        result = await comparison_service.compare_documents(
            doc_a_name=file_a.filename or "Contract A",
            doc_a_text=extracted_a.full_text,
            doc_b_name=file_b.filename or "Contract B",
            doc_b_text=extracted_b.full_text,
        )
        return result
    finally:
        for path in (tmp_a_path, tmp_b_path):
            if path:
                try:
                    os.remove(path)
                except (OSError, PermissionError):
                    pass


@router.post("/export-csv")
async def export_comparison_csv(data: ComparisonResult):
    """Export comparison table into a downloadable CSV spreadsheet."""
    import csv
    import io
    from fastapi import Response

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Topic / Clause",
        f"Document A: {data.document_a_name}",
        f"Document B: {data.document_b_name}",
        "Has Substantive Change",
        "Risk / Impact Severity",
    ])

    for row in data.comparison_table:
        writer.writerow([
            row.topic,
            row.document_a.replace("\n", " "),
            row.document_b.replace("\n", " "),
            "YES" if row.has_change else "NO",
            (row.severity or "medium").upper(),
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="Contract_Comparison_Matrix.csv"'
        },
    )

