"""
LegalLens — Analysis Service
Deep legal document analysis: clauses, risks, obligations, dates, terms.
"""

from app.services.llm_service import llm_service
from app.models.schemas import (
    FullAnalysis,
    RiskItem,
    ObligationItem,
    ImportantDate,
    LegalTerm,
    LawyerPrepReport,
    LawyerPrepTopic,
)
from app.utils.prompts import (
    CLAUSE_EXPLANATION_PROMPT,
    RISK_ANALYSIS_PROMPT,
    OBLIGATIONS_PROMPT,
    DATES_EXTRACTION_PROMPT,
    LEGAL_TERMS_PROMPT,
    LAWYER_PREP_PROMPT,
    CLAUSE_REWRITE_PROMPT,
)


# Valid enum values for sanitization
_VALID_SEVERITIES = {"low", "medium", "high"}
_VALID_OBLIGATION_TYPES = {"right", "obligation", "restriction"}


def _sanitize_severity(value: str) -> str:
    """Normalize severity to a valid RiskSeverity enum value."""
    v = str(value).strip().lower()
    return v if v in _VALID_SEVERITIES else "medium"


def _sanitize_obligation_type(value: str) -> str:
    """Normalize obligation type to a valid ObligationType enum value."""
    v = str(value).strip().lower()
    return v if v in _VALID_OBLIGATION_TYPES else "obligation"


class AnalysisService:
    """Performs deep analysis on legal documents."""

    def __init__(self):
        self.llm = llm_service

    async def analyze_risks(self, document_text: str) -> list[dict]:
        """Identify potential areas of concern in the document."""
        if len(document_text) > 20000:
            document_text = document_text[:15000] + "\n\n[...]\n\n" + document_text[-5000:]

        prompt = RISK_ANALYSIS_PROMPT.format(document_text=document_text)
        try:
            result = await self.llm.generate_json(prompt)
            risks = result.get("risks", [])
            # Sanitize severity enum values from LLM responses
            for risk in risks:
                if "severity" in risk:
                    risk["severity"] = _sanitize_severity(risk["severity"])
            return risks
        except ValueError:
            return []

    async def extract_obligations(self, document_text: str) -> list[dict]:
        """Extract obligations, rights, and restrictions."""
        if len(document_text) > 20000:
            document_text = document_text[:15000] + "\n\n[...]\n\n" + document_text[-5000:]

        prompt = OBLIGATIONS_PROMPT.format(document_text=document_text)
        try:
            result = await self.llm.generate_json(prompt)
            obligations = result.get("obligations", [])
            # Sanitize obligation type enum values from LLM responses
            for ob in obligations:
                if "type" in ob:
                    ob["type"] = _sanitize_obligation_type(ob["type"])
            return obligations
        except ValueError:
            return []

    async def extract_dates(self, document_text: str) -> list[dict]:
        """Extract important dates and deadlines."""
        if len(document_text) > 20000:
            document_text = document_text[:15000] + "\n\n[...]\n\n" + document_text[-5000:]

        prompt = DATES_EXTRACTION_PROMPT.format(document_text=document_text)
        try:
            result = await self.llm.generate_json(prompt)
            return result.get("dates", [])
        except ValueError:
            return []

    async def extract_legal_terms(self, document_text: str) -> list[dict]:
        """Extract defined legal terms and their meanings."""
        if len(document_text) > 20000:
            document_text = document_text[:15000] + "\n\n[...]\n\n" + document_text[-5000:]

        prompt = LEGAL_TERMS_PROMPT.format(document_text=document_text)
        try:
            result = await self.llm.generate_json(prompt)
            return result.get("terms", [])
        except ValueError:
            return []

    async def explain_clause(self, clause_text: str) -> dict:
        """Generate multi-level explanation of a single clause."""
        prompt = CLAUSE_EXPLANATION_PROMPT.format(clause_text=clause_text)
        try:
            return await self.llm.generate_json(prompt)
        except ValueError:
            return {
                "clause_number": "Unknown",
                "original_text": clause_text,
                "simple_explanation": "Unable to generate explanation.",
                "very_simple_explanation": "Unable to generate explanation.",
                "clause_type": None,
                "related_clauses": [],
            }

    async def full_analysis(self, document_id: str, document_text: str) -> FullAnalysis:
        """Run all analysis modules on a document.

        Returns a FullAnalysis Pydantic model with all extracted data.
        """
        import asyncio

        # Run analyses concurrently
        risks_task = self.analyze_risks(document_text)
        obligations_task = self.extract_obligations(document_text)
        dates_task = self.extract_dates(document_text)
        terms_task = self.extract_legal_terms(document_text)

        risks_raw, obligations_raw, dates_raw, terms_raw = await asyncio.gather(
            risks_task, obligations_task, dates_task, terms_task,
            return_exceptions=True,
        )

        # Handle any exceptions — fall back to empty lists
        if isinstance(risks_raw, Exception):
            risks_raw = []
        if isinstance(obligations_raw, Exception):
            obligations_raw = []
        if isinstance(dates_raw, Exception):
            dates_raw = []
        if isinstance(terms_raw, Exception):
            terms_raw = []

        # Convert raw dicts → validated Pydantic models
        risks = [RiskItem(**r) for r in (risks_raw if isinstance(risks_raw, list) else [])]
        obligations = [ObligationItem(**o) for o in (obligations_raw if isinstance(obligations_raw, list) else [])]
        dates = [ImportantDate(**d) for d in (dates_raw if isinstance(dates_raw, list) else [])]
        legal_terms = [LegalTerm(**t) for t in (terms_raw if isinstance(terms_raw, list) else [])]

        # Generate action items from risks and obligations
        action_items: list[str] = []
        for risk in risks:
            if risk.what_to_check:
                action_items.append(risk.what_to_check)
        for ob in obligations:
            if ob.deadline and ob.description:
                action_items.append(f"{ob.description} — Deadline: {ob.deadline}")

        return FullAnalysis(
            document_id=document_id,
            clauses=[],  # Populated when clause-level analysis is invoked
            risks=risks,
            obligations=obligations,
            dates=dates,
            legal_terms=legal_terms,
            action_items=action_items,
        )

    async def generate_lawyer_prep(self, document_text: str) -> LawyerPrepReport:
        """Generate a Lawyer Preparation Report."""
        if len(document_text) > 20000:
            document_text = document_text[:15000] + "\n\n[...]\n\n" + document_text[-5000:]

        prompt = LAWYER_PREP_PROMPT.format(document_text=document_text)
        try:
            raw = await self.llm.generate_json(prompt)
            # Normalise key_areas_to_discuss entries into LawyerPrepTopic models
            raw_topics = raw.get("key_areas_to_discuss", [])
            topics = [
                LawyerPrepTopic(**t) if isinstance(t, dict) else t
                for t in raw_topics
            ]
            return LawyerPrepReport(
                document_title=raw.get("document_title", "Legal Agreement"),
                key_areas_to_discuss=topics,
                questions_to_ask=raw.get("questions_to_ask", []),
                documents_to_bring=raw.get("documents_to_bring", []),
                action_checklist=raw.get("action_checklist", []),
            )
        except Exception:
            return LawyerPrepReport(
                document_title="Legal Agreement",
                key_areas_to_discuss=[
                    LawyerPrepTopic(topic="Termination & Notice", clause_reference="Termination Section", why_discuss="Clarify notice requirements and whether early exit triggers damages."),
                    LawyerPrepTopic(topic="Liability & Indemnification", clause_reference="Liability Section", why_discuss="Verify if liability has an explicit monetary cap."),
                    LawyerPrepTopic(topic="Dispute Resolution", clause_reference="Dispute / Governing Law", why_discuss="Confirm court jurisdiction or arbitration venue rules."),
                ],
                questions_to_ask=[
                    "What happens if either party terminates without notice?",
                    "Is my financial liability capped under this agreement?",
                    "Are there post-termination obligations or restrictions I must comply with?",
                    "Does this contract automatically renew?",
                ],
                documents_to_bring=[
                    "Full printed or digital copy of the agreement",
                    "Any previous versions or amendments",
                    "Written correspondence, emails, or offer letters",
                ],
                action_checklist=[
                    "Highlight any uncertain definitions",
                    "Check dates against your calendar",
                    "Prepare your list of negotiation priorities",
                ],
            )

    async def rewrite_clause(
        self,
        clause_text: str,
        target_stance: str = "neutral_mutual",
        custom_instruction: str = "",
    ) -> dict:
        """Draft an amended counter-proposal clause."""
        prompt = CLAUSE_REWRITE_PROMPT.format(
            clause_text=clause_text,
            target_stance=target_stance,
            custom_instruction=custom_instruction or "None provided",
        )
        try:
            res = await self.llm.generate_json(prompt)
            return {
                "original_text": clause_text,
                "target_stance": target_stance,
                "rewritten_clause": res.get("rewritten_clause") or clause_text,
                "key_changes": res.get("key_changes") or ["Revised language to adjust liability and notice symmetry."],
                "negotiation_rationale": res.get("negotiation_rationale") or "Aligns terms with standard commercial practice.",
            }
        except Exception:
            prefix = "MUTUAL AMENDMENT: " if target_stance == "neutral_mutual" else "PROPOSED REVISION: "
            return {
                "original_text": clause_text,
                "target_stance": target_stance,
                "rewritten_clause": f"{prefix}{clause_text} Provided, however, that both parties shall be afforded a thirty (30) day written notice and cure period prior to enforcement.",
                "key_changes": ["Added standard 30-day notice and cure window", "Balanced mutual enforcement remedies"],
                "negotiation_rationale": "Ensures reasonable opportunity to resolve disputes without unilateral penalization.",
            }


# Singleton instance
analysis_service = AnalysisService()

