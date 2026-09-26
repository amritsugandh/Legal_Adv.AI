"""
LegalLens — Database Package
"""
from app.db.database import get_db, init_db, AsyncSessionLocal
from app.db.models import (
    Base,
    DocumentRecord,
    AnalysisRecord,
    LawyerPrepRecord,
    ChatSessionRecord,
    ChatMessageRecord,
)

__all__ = [
    "get_db",
    "init_db",
    "AsyncSessionLocal",
    "Base",
    "DocumentRecord",
    "AnalysisRecord",
    "LawyerPrepRecord",
    "ChatSessionRecord",
    "ChatMessageRecord",
]
