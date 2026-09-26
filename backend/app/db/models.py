"""
LegalLens — SQLAlchemy Database Models
Persistent storage for Documents, Analysis, Chat Sessions, and Messages.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DocumentRecord(Base):
    """Stores uploaded document records and their extracted metadata."""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)
    page_count = Column(Integer, default=0)
    status = Column(String(50), default="ready")
    uploaded_at = Column(String(50), nullable=False)
    document_type = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    key_points = Column(JSON, default=list)
    important_clauses = Column(JSON, default=list)
    metadata_json = Column(JSON, default=dict)
    full_text = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    is_scanned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    analysis = relationship("AnalysisRecord", back_populates="document", uselist=False, cascade="all, delete-orphan")
    lawyer_prep = relationship("LawyerPrepRecord", back_populates="document", uselist=False, cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSessionRecord", back_populates="document", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessageRecord", back_populates="document", cascade="all, delete-orphan")


class AnalysisRecord(Base):
    """Caches deep legal analysis results (risks, obligations, dates, terms)."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    risks = Column(JSON, default=list)
    obligations = Column(JSON, default=list)
    dates = Column(JSON, default=list)
    legal_terms = Column(JSON, default=list)
    action_items = Column(JSON, default=list)
    clauses = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    # Relationship
    document = relationship("DocumentRecord", back_populates="analysis")


class LawyerPrepRecord(Base):
    """Caches generated lawyer preparation report."""
    __tablename__ = "lawyer_prep_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    report_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    # Relationship
    document = relationship("DocumentRecord", back_populates="lawyer_prep")


class ChatSessionRecord(Base):
    """Represents a conversation session for a document."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Document Q&A")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    document = relationship("DocumentRecord", back_populates="chat_sessions")
    messages = relationship("ChatMessageRecord", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageRecord.created_at")


class ChatMessageRecord(Base):
    """Stores individual user and assistant messages in a chat session."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    text = Column(Text, nullable=False)
    sources = Column(JSON, default=list)
    confidence = Column(String(20), default="medium")
    not_found = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    session = relationship("ChatSessionRecord", back_populates="messages")
    document = relationship("DocumentRecord", back_populates="chat_messages")
