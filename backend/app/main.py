"""
LegalLens — FastAPI Application Entrypoint
Main application with CORS, startup, and router registration.
"""

from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select, func

from app.config import settings, ensure_directories
from app.db.database import init_db, AsyncSessionLocal
from app.db.models import DocumentRecord
from app.services.llm_service import llm_service
from app.routers import documents, chat, comparison


async def _backfill_legacy_disk_documents():
    """Migrate any documents persisted on disk into the database."""
    upload_root = Path(settings.UPLOAD_DIR)
    if not upload_root.exists():
        return

    async with AsyncSessionLocal() as session:
        for child in upload_root.iterdir():
            if not child.is_dir():
                continue
            meta_path = child / "metadata.json"
            if not meta_path.exists():
                continue

            doc_id = child.name
            existing = await session.get(DocumentRecord, doc_id)
            if existing:
                continue

            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)

                full_text = ""
                text_path = child / "extracted_text.txt"
                if text_path.exists():
                    full_text = text_path.read_text(encoding="utf-8")

                summary_data = meta.get("summary_data") or {}
                doc_record = DocumentRecord(
                    id=doc_id,
                    filename=meta.get("filename", "unknown"),
                    file_type=meta.get("file_type", "pdf"),
                    page_count=meta.get("page_count", 0),
                    status=meta.get("status", "ready"),
                    uploaded_at=meta.get("uploaded_at", ""),
                    document_type=meta.get("document_type") or summary_data.get("document_type"),
                    summary=summary_data.get("summary"),
                    key_points=summary_data.get("key_points", []),
                    important_clauses=summary_data.get("important_clauses", []),
                    metadata_json=summary_data,
                    full_text=full_text,
                    chunk_count=meta.get("chunk_count", 0),
                )
                session.add(doc_record)
                await session.commit()
                print(f"[LegalLens] Backfilled document {doc_id} into database.")
            except Exception as e:
                print(f"[LegalLens] Failed to backfill document {doc_id}: {e}")
                await session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # Startup
    ensure_directories()
    await init_db()
    await _backfill_legacy_disk_documents()
    print(f"[LegalLens] Database initialized and verified.")
    print(f"[LegalLens] Upload directory: {settings.UPLOAD_DIR}")
    print(f"[LegalLens] LLM Model: {settings.LLM_MODEL}")
    print(f"[LegalLens] Vector DB: {settings.CHROMA_PERSIST_DIR}")
    yield
    # Shutdown
    print(f"[LegalLens] backend shutting down...")


app = FastAPI(
    title="LegalLens API",
    description=(
        "AI Legal Document Intelligence Platform — "
        "Upload, understand, and analyze legal documents with AI."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(comparison.router)


@app.get("/")
async def root():
    """Health check and API info."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "description": "AI Legal Document Intelligence Platform",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/api/status")
async def system_status():
    """System engine and intelligence status."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(DocumentRecord.id)))
        count = result.scalar() or 0

    llm_info = llm_service.get_status()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "database": "sqlite_async",
        "total_documents": count,
        "llm": llm_info,
    }


# ─── Production SPA Serving (Single-Platform Unified Deployment) ───

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        # Exclude API endpoints and Swagger documentation — use "api/" prefix
        # to avoid matching paths like "apidocs" or "apikeys" that should be SPA routes.
        if full_path.startswith("api/") or full_path in ("api", "docs", "redoc", "openapi.json"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        target_file = frontend_dist / full_path
        if full_path and target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(frontend_dist / "index.html"))

