"""
LegalLens — Pydantic Schemas
Request/response models for all API endpoints.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class DocumentType(str, Enum):
    EMPLOYMENT = "employment_contract"
    RENTAL = "rental_agreement"
    LOAN = "loan_agreement"
    NDA = "nda"
    SERVICE = "service_agreement"
    PARTNERSHIP = "partnership_agreement"
    OTHER = "other"


class RiskSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ObligationType(str, Enum):
    RIGHT = "right"
    OBLIGATION = "obligation"
    RESTRICTION = "restriction"


# ──────────────────────────────────────────────
# Document Models
# ──────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""
    id: str
    filename: str
    file_type: str
    page_count: int
    status: str = "processing"
    uploaded_at: str


class DocumentMetadata(BaseModel):
    """Metadata extracted from a document."""
    document_type: Optional[str] = None
    title: Optional[str] = None
    parties: list[str] = Field(default_factory=list)
    effective_date: Optional[str] = None
    duration: Optional[str] = None
    governing_law: Optional[str] = None
    total_pages: int = 0
    total_clauses: int = 0


class DocumentSummary(BaseModel):
    """AI-generated document summary."""
    id: str
    filename: str
    metadata: DocumentMetadata
    summary: str
    key_points: list[str] = Field(default_factory=list)
    important_clauses: list[str] = Field(default_factory=list)
    disclaimer: str = (
        "LegalLens provides document explanations and informational assistance. "
        "It does not provide legal advice or replace a qualified legal professional."
    )


class DocumentInfo(BaseModel):
    """Full document info for the dashboard."""
    id: str
    filename: str
    file_type: str
    page_count: int
    status: str
    uploaded_at: str
    metadata: Optional[DocumentMetadata] = None
    summary: Optional[str] = None
    key_points: list[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Chat / Q&A Models
# ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    """User question about a document."""
    question: str = Field(..., min_length=1, max_length=2000)
    simplicity_level: str = Field(default="simple", pattern="^(original|simple|very_simple)$")
    session_id: Optional[str] = None


class SourceReference(BaseModel):
    """Source citation for an AI answer."""
    section: str
    page: Optional[int] = None
    text_snippet: str
    relevance_score: float = 0.0


class ChatResponse(BaseModel):
    """AI answer to a document question."""
    answer: str
    sources: list[SourceReference] = Field(default_factory=list)
    confidence: str = "medium"  # low, medium, high
    not_found: bool = False
    session_id: Optional[str] = None
    disclaimer: str = (
        "This is an explanation of the uploaded document, not legal advice."
    )


class ChatMessageItem(BaseModel):
    """A persisted message item."""
    id: int
    role: str
    text: str
    sources: list[SourceReference] = Field(default_factory=list)
    confidence: Optional[str] = "medium"
    not_found: bool = False
    created_at: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """Chat message history for a document."""
    document_id: str
    session_id: Optional[str] = None
    messages: list[ChatMessageItem] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Analysis Models (Phase 2 — defined now for schema consistency)
# ──────────────────────────────────────────────

class ClauseExplanation(BaseModel):
    """A single clause with its explanation."""
    clause_number: str
    original_text: str
    simple_explanation: str
    very_simple_explanation: str
    clause_type: Optional[str] = None
    related_clauses: list[str] = Field(default_factory=list)


class RiskItem(BaseModel):
    """An identified risk or concern in the document."""
    title: str
    description: str
    severity: RiskSeverity = RiskSeverity.MEDIUM
    clause_reference: Optional[str] = None
    what_to_check: Optional[str] = None
    question_for_lawyer: Optional[str] = None


class ObligationItem(BaseModel):
    """An extracted obligation, right, or restriction."""
    party: str
    description: str
    type: ObligationType
    deadline: Optional[str] = None
    clause_reference: Optional[str] = None


class ImportantDate(BaseModel):
    """An important date or deadline from the document."""
    event: str
    date: Optional[str] = None
    recurring: bool = False
    clause_reference: Optional[str] = None


class LegalTerm(BaseModel):
    """A defined legal term and its meaning."""
    term: str
    definition: str
    defined_in: Optional[str] = None
    used_in: list[str] = Field(default_factory=list)


class FullAnalysis(BaseModel):
    """Complete document analysis results."""
    document_id: str
    clauses: list[ClauseExplanation] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    obligations: list[ObligationItem] = Field(default_factory=list)
    dates: list[ImportantDate] = Field(default_factory=list)
    legal_terms: list[LegalTerm] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Comparison Models (Phase 3)
# ──────────────────────────────────────────────

class ComparisonRow(BaseModel):
    """One row of a contract comparison."""
    topic: str
    document_a: str
    document_b: str
    has_change: bool = False
    severity: Optional[RiskSeverity] = None


class ComparisonResult(BaseModel):
    """Full comparison between two contracts."""
    document_a_name: str
    document_b_name: str
    comparison_table: list[ComparisonRow] = Field(default_factory=list)
    important_changes: list[str] = Field(default_factory=list)
    summary: str = ""


# ──────────────────────────────────────────────
# Lawyer Preparation & Interactive Requests
# ──────────────────────────────────────────────

class ClauseExplainRequest(BaseModel):
    """Request payload to explain a specific clause."""
    clause_text: str = Field(..., min_length=1)


class LawyerPrepTopic(BaseModel):
    topic: str
    clause_reference: Optional[str] = None
    why_discuss: str


class LawyerPrepReport(BaseModel):
    """Structured report to prepare a client for a lawyer consultation."""
    document_title: str
    key_areas_to_discuss: list[LawyerPrepTopic] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)
    documents_to_bring: list[str] = Field(default_factory=list)
    action_checklist: list[str] = Field(default_factory=list)


class RawTextResponse(BaseModel):
    """Raw extracted document text response."""
    id: str
    filename: str
    page_count: int
    full_text: str
    is_scanned: bool = False


class ClauseRewriteRequest(BaseModel):
    """Request to rewrite a clause towards a specific negotiating posture."""
    clause_text: str = Field(..., min_length=5)
    target_stance: str = Field(default="neutral_mutual", pattern="^(vendor_favorable|buyer_favorable|neutral_mutual)$")
    custom_instruction: Optional[str] = None


class ClauseRewriteResponse(BaseModel):
    """AI drafted counter-proposal clause."""
    original_text: str
    target_stance: str
    rewritten_clause: str
    key_changes: list[str] = Field(default_factory=list)
    negotiation_rationale: str = ""

