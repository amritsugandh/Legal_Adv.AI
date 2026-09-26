"""
LegalLens — LLM Service
Wrapper for Google Gemini API with structured JSON output and
intelligent legal heuristic fallback.
"""

import json
import re
import logging
import asyncio
import warnings

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai


from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Handles all LLM interactions via Google Gemini API."""

    def __init__(self):
        self.api_configured = False
        self.model = None
        self._init_client()

    def _init_client(self):
        key = settings.GOOGLE_API_KEY.strip() if settings.GOOGLE_API_KEY else ""
        if key and key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=key)
                self.model = genai.GenerativeModel(
                    model_name=settings.LLM_MODEL,
                    generation_config=genai.GenerationConfig(
                        temperature=0.2,
                        top_p=0.95,
                        max_output_tokens=8192,
                    ),
                )
                self.api_configured = True
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Model: {e}")
                self.api_configured = False
        else:
            self.api_configured = False

    def update_api_key(self, api_key: str):
        """Update API key at runtime."""
        settings.GOOGLE_API_KEY = api_key.strip()
        self._init_client()

    def get_status(self) -> dict:
        """Return current LLM engine status."""
        has_key = bool(settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "your_gemini_api_key_here")
        return {
            "configured": self.api_configured,
            "has_key": has_key,
            "model": settings.LLM_MODEL,
            "engine": "Google Gemini 2.0 Flash" if self.api_configured else "Local Heuristic Fallback",
        }

    async def generate(self, prompt: str) -> str:
        """Generate a response asynchronously from the LLM."""
        if not self.api_configured or not self.model:
            # Re-check in case user updated settings
            self._init_client()

        if self.api_configured and self.model:
            try:
                response = await self.model.generate_content_async(prompt)
                return response.text
            except Exception as e:
                logger.warning(f"Gemini generate failed: {e}")

        # Fallback response
        return self._generate_fallback_text(prompt)

    async def transcribe_image(self, image_bytes: bytes, mime_type: str = "image/png") -> str:
        """Transcribe text from an image using Gemini Multimodal Vision."""
        if not self.api_configured or not self.model:
            self._init_client()

        if self.api_configured and self.model:
            try:
                response = await self.model.generate_content_async([
                    "You are an expert legal document OCR assistant. Transcribe all readable text from this scanned contract document accurately and completely. Maintain structure, headers, numbers, and clauses. Output only the transcribed text without extra commentary.",
                    {"mime_type": mime_type, "data": image_bytes},
                ])
                return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini multimodal OCR transcription failed: {e}")

        return ""

    async def generate_json(self, prompt: str) -> dict:
        """Generate a structured JSON response from the LLM with fallback."""
        if self.api_configured and self.model:
            try:
                response_text = await self.generate(prompt)
                json_data = self._extract_json(response_text)
                if json_data is not None and isinstance(json_data, dict) and json_data:
                    return json_data
            except Exception as e:
                logger.warning(f"Gemini generate_json failed: {e}")

        # Intelligent heuristic fallback
        return self._generate_fallback_json(prompt)

    def _extract_json(self, text: str) -> dict | None:
        """Extract JSON from LLM response text with cleanup."""
        text = text.strip()

        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown block
        code_match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
        if code_match:
            candidate = code_match.group(1).strip()
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                # Try fixing trailing commas
                fixed = re.sub(r',\s*([\}\]])', r'\1', candidate)
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    pass

        # Try finding outermost brace
        brace_match = re.search(r'\{.*\}', text, re.DOTALL)
        if brace_match:
            candidate = brace_match.group(0)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                fixed = re.sub(r',\s*([\}\]])', r'\1', candidate)
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    pass

        return None

    # ── helpers ──────────────────────────────────────────────────

    @staticmethod
    def _extract_doc_text_from_prompt(prompt: str, max_chars: int = 6000) -> str:
        """Pull the actual document text that was injected into the prompt.

        Every analysis prompt wraps the document text between '---' fences
        so we can extract it here and use it for document-specific fallbacks.
        """
        # Pattern: lines between the first pair of triple-dashes
        parts = re.split(r'\n---\n', prompt, maxsplit=2)
        if len(parts) >= 2:
            return parts[1].strip()[:max_chars]
        return ""

    @staticmethod
    def _extract_sentences(text: str, max_sentences: int = 8) -> list[str]:
        """Split raw document text into individual sentences."""
        # Simple sentence split on period/exclamation/question followed by space
        raw = re.split(r'(?<=[.!?])\s+', text.strip())
        # Filter: keep lines that are actual sentences (>20 chars, not a page header)
        sentences = [s.strip() for s in raw if len(s.strip()) > 20]
        return sentences[:max_sentences]

    @staticmethod
    def _detect_doc_type(text: str) -> str:
        """Heuristically detect document type from its text content."""
        lower = text.lower()
        if any(w in lower for w in ["employee", "employer", "employment", "salary", "designation", "probation"]):
            return "Employment Agreement"
        if any(w in lower for w in ["tenant", "landlord", "rent", "lease", "premises", "monthly rent"]):
            return "Rental / Lease Agreement"
        if any(w in lower for w in ["borrower", "lender", "loan", "principal amount", "interest rate", "repayment"]):
            return "Loan Agreement"
        if any(w in lower for w in ["nondisclosure", "non-disclosure", "confidential information", "proprietary"]):
            return "Non-Disclosure Agreement (NDA)"
        if any(w in lower for w in ["service provider", "client", "services", "deliverable", "milestone"]):
            return "Service Agreement"
        if any(w in lower for w in ["partner", "partnership", "profit sharing", "capital contribution"]):
            return "Partnership Agreement"
        if any(w in lower for w in ["purchase", "buyer", "seller", "sale of", "purchase price"]):
            return "Sale / Purchase Agreement"
        return "Legal Agreement"

    @staticmethod
    def _extract_parties(text: str) -> list[str]:
        """Try to extract party names mentioned near 'between' or 'party' keywords."""
        # Match patterns like "between ABC Corp" or "Party A: XYZ Ltd"
        parties: list[str] = []
        patterns = [
            r'between\s+([A-Z][A-Za-z0-9\s&.,]{3,50}?)\s+(?:and|,)',
            r'(?:Party\s*[A-Z1-9]|First Party|Second Party|Employer|Employee|Landlord|Tenant|Lender|Borrower)[:\s]+([A-Z][A-Za-z0-9\s&.,]{3,50}?)(?:\n|,|\()',
        ]
        for pat in patterns:
            for m in re.finditer(pat, text):
                name = m.group(1).strip().strip('.,')
                if name and name not in parties:
                    parties.append(name)
            if len(parties) >= 2:
                break
        return parties[:4] if parties else ["Party A", "Party B"]

    # ── text + json fallbacks ─────────────────────────────────

    def _generate_fallback_text(self, prompt: str) -> str:
        """Return a document-specific fallback text when the LLM is offline."""
        doc_text = self._extract_doc_text_from_prompt(prompt, max_chars=3000)
        if "User question:" in prompt:
            # Extract the question
            q_match = re.search(r'User question:\s*(.+)', prompt)
            question = q_match.group(1).strip() if q_match else "your question"
            # Pull relevant sentence from doc text
            if doc_text:
                sentences = self._extract_sentences(doc_text, max_sentences=3)
                snippet = " ".join(sentences) if sentences else ""
                if snippet:
                    return (
                        f"Based on the document content, here is what was found regarding '{question}': "
                        f"{snippet} Please review the relevant sections directly for precise terms."
                    )
            return (
                f"The document was reviewed for '{question}'. "
                "Please ensure your Gemini API key is configured for full AI-powered answers."
            )
        if doc_text:
            first_lines = doc_text[:300].replace('\n', ' ').strip()
            return f"Document analysis completed. Content preview: {first_lines}…"
        return "Analysis completed based on the uploaded document text."

    def _generate_fallback_json(self, prompt: str) -> dict:
        """Generate document-specific fallback JSON from the actual prompt text.

        Instead of returning static employment data, we extract the real document
        text that was injected into the prompt and build responses from it.
        This ensures every uploaded document gets relevant (not generic) fallback
        analysis even when the Gemini API key is not configured.
        """
        lower_prompt = prompt.lower()

        # Pull the actual document text embedded in this prompt
        doc_text  = self._extract_doc_text_from_prompt(prompt, max_chars=8000)
        doc_lower = doc_text.lower()
        doc_type  = self._detect_doc_type(doc_text)
        parties   = self._extract_parties(doc_text)
        sentences = self._extract_sentences(doc_text, max_sentences=10)

        # ── 1. Q&A / RAG Prompt ──────────────────────────────
        if "context excerpts from the document" in lower_prompt or (
            "user question:" in lower_prompt and "answer" in lower_prompt
        ):
            q_match  = re.search(r'User question:\s*(.+)', prompt)
            question = q_match.group(1).strip() if q_match else "the question"

            # Search for sentences in context that relate to the question keywords
            q_words  = set(re.findall(r'\b\w{4,}\b', question.lower()))
            relevant = [s for s in sentences if any(w in s.lower() for w in q_words)]
            answer_text = (
                " ".join(relevant[:3]) if relevant
                else (sentences[0] if sentences else
                      "The document does not appear to contain a direct answer to this question in the retrieved excerpts.")
            )
            # Extract excerpt label from context
            ctx_section = "Document"
            sec_match = re.search(r'Excerpt \d+.*?Section:\s*([^\]]+)\]', prompt)
            if sec_match:
                ctx_section = sec_match.group(1).strip()

            return {
                "answer": answer_text,
                "sources": [{
                    "section": ctx_section,
                    "page": 1,
                    "text_snippet": (sentences[0][:200] if sentences else "See document."),
                    "relevance_score": 0.75,
                }],
                "confidence": "medium" if relevant else "low",
                "not_found": len(relevant) == 0,
            }

        # ── 2. Risk Analysis ─────────────────────────────────
        if "potential areas that a user should review" in lower_prompt or (
            "risks" in lower_prompt and "severity" in lower_prompt
        ):
            risks = []
            # Detect real risk signals in the actual document text
            risk_patterns = [
                ("indemnif",  "Indemnification Scope",
                 "The document contains indemnification language. Review whether your liability exposure is capped.",
                 "high", "Indemnification Clause",
                 "Look for explicit monetary caps and carve-outs.",
                 "Is my indemnification liability capped under this agreement?"),
                ("terminat",  "Termination Rights",
                 "The document contains termination provisions. Check whether both parties have equal termination rights and cure periods.",
                 "medium", "Termination Section",
                 "Verify that notice requirements are symmetric and cure periods are reasonable.",
                 "Do I have an equal right to terminate for convenience?"),
                ("renew",     "Automatic Renewal Risk",
                 "The document contains renewal language that may auto-extend the agreement.",
                 "medium", "Renewal / Term Section",
                 "Check the exact opt-out deadline before the renewal date.",
                 "What is the last date I can cancel to avoid automatic renewal?"),
                ("confidential", "Confidentiality Obligations",
                 "The document imposes confidentiality obligations. Ensure scope and duration are acceptable.",
                 "medium", "Confidentiality Section",
                 "Clarify what information is covered and how long obligations survive termination.",
                 "Does my confidentiality obligation survive termination of the agreement?"),
                ("penalt",    "Penalty Clauses",
                 "The document references penalties or liquidated damages. Review the trigger conditions.",
                 "high", "Penalties / Damages Section",
                 "Determine whether penalties are proportionate and capped.",
                 "Are the penalty amounts proportionate and is there a maximum cap?"),
                ("non-compet", "Non-Compete Restriction",
                 "The document contains non-compete or restraint-of-trade language.",
                 "high", "Non-Compete / Restraint Clause",
                 "Assess geographic scope, duration, and enforceability in your jurisdiction.",
                 "Is this non-compete enforceable in my jurisdiction?"),
                ("arbitrat",  "Mandatory Arbitration",
                 "The document requires disputes to go to arbitration rather than court.",
                 "medium", "Dispute Resolution Section",
                 "Confirm the arbitration venue, cost allocation, and whether class actions are waived.",
                 "Can I still pursue claims in court or am I bound to arbitration only?"),
                ("governing law", "Governing Law / Jurisdiction",
                 "The agreement specifies a governing law or jurisdiction that may be unfavorable.",
                 "low", "Governing Law Section",
                 "Verify that the jurisdiction is practical and accessible for you.",
                 "What court or jurisdiction would handle disputes under this agreement?"),
            ]
            for keyword, title, desc, severity, clause_ref, what_to_check, q4lawyer in risk_patterns:
                if keyword in doc_lower:
                    risks.append({
                        "title": title,
                        "description": desc,
                        "severity": severity,
                        "clause_reference": clause_ref,
                        "what_to_check": what_to_check,
                        "question_for_lawyer": q4lawyer,
                    })
            # Always add at least one generic risk if none detected
            if not risks:
                risks.append({
                    "title": "Review All Key Terms",
                    "description": f"This {doc_type} contains standard legal provisions that warrant a thorough review before signing.",
                    "severity": "medium",
                    "clause_reference": "General Terms",
                    "what_to_check": "Read every clause carefully and highlight terms you do not understand.",
                    "question_for_lawyer": "Are there any clauses in this agreement that are unusual or unfavorable for my situation?",
                })
            return {"risks": risks}

        # ── 3. Obligations Extraction ─────────────────────────
        if "extract all obligations, rights, and restrictions" in lower_prompt or (
            "obligations" in lower_prompt and "restriction" in lower_prompt
        ):
            obligations = []
            ob_patterns = [
                ("shall", "obligation"),
                ("must", "obligation"),
                ("is required", "obligation"),
                ("may not", "restriction"),
                ("shall not", "restriction"),
                ("is prohibited", "restriction"),
                ("may ", "right"),
                ("is entitled", "right"),
                ("has the right", "right"),
            ]
            for keyword, ob_type in ob_patterns:
                for sent in sentences:
                    if keyword in sent.lower() and len(sent) > 30:
                        party = "Party"
                        for p in parties:
                            if p.split()[0] in sent:
                                party = p
                                break
                        obligations.append({
                            "party": party,
                            "description": sent.strip()[:200],
                            "type": ob_type,
                            "deadline": None,
                            "clause_reference": "See document",
                        })
                        if len(obligations) >= 6:
                            break
                if len(obligations) >= 6:
                    break
            if not obligations:
                obligations = [{
                    "party": parties[0] if parties else "Signatory",
                    "description": f"Review all obligations stated within this {doc_type}.",
                    "type": "obligation",
                    "deadline": None,
                    "clause_reference": "Full document",
                }]
            return {"obligations": obligations}

        # ── 4. Important Dates ───────────────────────────────
        if "extract all important dates" in lower_prompt or (
            "dates" in lower_prompt and "recurring" in lower_prompt
        ):
            dates = []
            date_patterns = [
                (r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',     "Date mentioned in document"),
                (r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}', "Date mentioned in document"),
                (r'(?:within|after)\s+(\d+)\s+days',    "Notice / deadline period"),
                (r'(\d+)\s*months',                       "Time-bound clause"),
            ]
            for pattern, label in date_patterns:
                for m in re.finditer(pattern, doc_text, re.IGNORECASE):
                    dates.append({
                        "event": label,
                        "date": m.group(0),
                        "recurring": False,
                        "clause_reference": "See document",
                    })
                    if len(dates) >= 5:
                        break
                if len(dates) >= 5:
                    break
            if not dates:
                dates = [{
                    "event": "Agreement Duration / Term",
                    "date": "As specified in the document",
                    "recurring": False,
                    "clause_reference": "Term Section",
                }]
            return {"dates": dates}

        # ── 5. Legal Terms ───────────────────────────────────
        if "extract all defined terms" in lower_prompt or (
            "defined_in" in lower_prompt and "used_in" in lower_prompt
        ):
            terms = []
            # Match quoted or capitalised defined terms
            term_matches = re.findall(
                r'"([A-Z][A-Za-z\s]{3,40})"(?:\s+(?:means|shall mean|refers to)\s+([^.]{10,200}))?',
                doc_text,
            )
            for term_name, definition in term_matches[:6]:
                terms.append({
                    "term": term_name.strip(),
                    "definition": definition.strip() if definition else f"As defined in the {doc_type}.",
                    "defined_in": "Definitions Section",
                    "used_in": ["Throughout the agreement"],
                })
            if not terms:
                terms = [{
                    "term": "Defined Terms",
                    "definition": f"This {doc_type} may contain defined terms. Review the Definitions section for precise meanings.",
                    "defined_in": "Definitions Section",
                    "used_in": ["Throughout the agreement"],
                }]
            return {"terms": terms}

        # ── 6. Document Summary ──────────────────────────────
        if "produce a structured json summary" in lower_prompt or (
            "document_type" in lower_prompt and "key_points" in lower_prompt
        ):
            summary_text = (
                " ".join(sentences[:3]) if sentences
                else f"This {doc_type} establishes the terms and conditions between the parties."
            )
            important_clauses: list[str] = []
            clause_keywords = [
                ("terminat",  "Termination clause present — review notice and cure requirements."),
                ("confidential", "Confidentiality obligations — review scope and duration."),
                ("indemnif",  "Indemnification clause — review liability exposure."),
                ("govern",    "Governing law clause — review applicable jurisdiction."),
                ("arbitrat",  "Dispute resolution clause — review arbitration requirements."),
                ("payment",   "Payment terms — review amounts, schedules, and late fees."),
                ("renew",     "Renewal clause — check for automatic renewal provisions."),
            ]
            for kw, desc in clause_keywords:
                if kw in doc_lower:
                    important_clauses.append(desc)
            if not important_clauses:
                important_clauses = [
                    "Review all terms carefully before signing.",
                    "Ensure all parties are correctly identified.",
                ]
            return {
                "document_type": doc_type,
                "title": doc_type,
                "parties": parties,
                "effective_date": None,
                "duration": None,
                "governing_law": None,
                "total_clauses": 0,
                "summary": summary_text,
                "key_points": [s.strip() for s in sentences[:4]] if sentences else [
                    f"This document is a {doc_type}.",
                    "Review all terms with a qualified legal professional before signing.",
                ],
                "important_clauses": important_clauses[:5],
            }

        # ── 7. Lawyer Prep ───────────────────────────────────
        if "lawyer preparation report" in lower_prompt or "key_areas_to_discuss" in lower_prompt:
            areas = []
            prep_patterns = [
                ("terminat",     "Termination & Notice Period",    "Section: Termination",
                 "Clarify the advance notice period and whether early termination triggers any damages or penalties."),
                ("indemnif",     "Liability & Indemnification",     "Section: Indemnity",
                 "Confirm whether financial liability has an explicit monetary cap and what triggers indemnification."),
                ("arbitrat",     "Dispute Resolution Mechanism",    "Section: Dispute Resolution",
                 "Verify whether disputes go to arbitration or court, and which jurisdiction applies."),
                ("confidential", "Confidentiality Scope",           "Section: Confidentiality",
                 "Understand what information is protected, for how long, and what happens on breach."),
                ("non-compet",   "Non-Compete / Restraint",         "Section: Restrictions",
                 "Assess whether geographic, duration, and activity restrictions are reasonable and enforceable."),
                ("renew",        "Auto-Renewal Risk",               "Section: Term & Renewal",
                 "Confirm the deadline and procedure to prevent automatic renewal of the agreement."),
                ("payment",      "Payment Terms & Late Fees",       "Section: Compensation",
                 "Clarify payment schedule, accepted methods, and consequences of delayed payment."),
            ]
            for kw, topic, ref, why in prep_patterns:
                if kw in doc_lower:
                    areas.append({"topic": topic, "clause_reference": ref, "why_discuss": why})
            if not areas:
                areas = [
                    {"topic": "Key Terms Review", "clause_reference": "Full Document",
                     "why_discuss": f"Discuss all main provisions of this {doc_type} with your lawyer before signing."},
                ]
            return {
                "document_title": doc_type,
                "key_areas_to_discuss": areas[:5],
                "questions_to_ask": [
                    "Are there any clauses that are unusual or one-sided in this agreement?",
                    "What is my maximum financial exposure under this document?",
                    "Are post-termination obligations enforceable in my jurisdiction?",
                    "Is there an automatic renewal I should be aware of?",
                ],
                "documents_to_bring": [
                    "The full signed or proposed agreement",
                    "Any prior correspondence, offer letters, or term sheets",
                    "Previous versions or amendments if any exist",
                ],
                "action_checklist": [
                    "Highlight every clause you do not fully understand",
                    "Confirm the governing law matches your location",
                    "Check all dates and notice periods against your calendar",
                    "Prepare your top negotiation priorities before the meeting",
                ],
            }

        # ── 8. Clause Explanation ────────────────────────────
        if "three levels of explanation" in lower_prompt or "clause_number" in lower_prompt:
            # The clause text is embedded directly in the prompt between ---
            clause_match = re.search(r'Legal clause:\s*---\s*(.*?)\s*---', prompt, re.DOTALL)
            clause_text  = clause_match.group(1).strip() if clause_match else ""
            if not clause_text:
                # Fallback: grab text after "Legal clause:" line
                lc_match  = re.search(r'Legal clause:\n(.*)', prompt, re.DOTALL)
                clause_text = lc_match.group(1).strip()[:500] if lc_match else "Clause text not found."

            plain = (
                f"This clause states: {clause_text[:300]}. "
                "In plain terms, it defines the rights and obligations of the parties involved."
            )
            simple = (
                "This part of the contract sets out what the parties must or cannot do in plain language. "
                "Read it carefully and ask a lawyer if anything is unclear."
            )
            return {
                "clause_number": "Clause",
                "original_text": clause_text[:500],
                "simple_explanation": plain,
                "very_simple_explanation": simple,
                "clause_type": "General Covenant",
                "who_is_affected": "The parties to this agreement",
                "potential_concern": "Review with a legal professional before signing.",
                "related_clauses": [],
                "question_for_lawyer": "What are the practical implications of this clause for my situation?",
            }

        # ── 9. Contract Comparison ───────────────────────────
        if "contract comparison engine" in lower_prompt or "comparison_table" in lower_prompt:
            # Extract doc A and doc B names from the prompt
            doc_a_match = re.search(r'Document A:\s*(.+)', prompt)
            doc_b_match = re.search(r'Document B:\s*(.+)', prompt)
            doc_a_name  = doc_a_match.group(1).strip() if doc_a_match else "Document A"
            doc_b_name  = doc_b_match.group(1).strip() if doc_b_match else "Document B"
            return {
                "comparison_table": [
                    {"topic": "Duration / Term",       "document_a": "See Document A", "document_b": "See Document B", "has_change": True,  "severity": "medium"},
                    {"topic": "Notice Period",          "document_a": "See Document A", "document_b": "See Document B", "has_change": True,  "severity": "medium"},
                    {"topic": "Liability Cap",          "document_a": "See Document A", "document_b": "See Document B", "has_change": True,  "severity": "high"  },
                    {"topic": "Dispute Resolution",     "document_a": "See Document A", "document_b": "See Document B", "has_change": True,  "severity": "medium"},
                    {"topic": "Governing Law",          "document_a": "See Document A", "document_b": "See Document B", "has_change": False, "severity": "low"   },
                ],
                "important_changes": [
                    f"Review {doc_a_name} and {doc_b_name} side-by-side for key differences.",
                    "Pay attention to liability, notice periods, and renewal provisions.",
                    "Configure your Gemini API key for a detailed AI-powered comparison.",
                ],
                "summary": (
                    f"A full AI comparison between {doc_a_name} and {doc_b_name} requires the Gemini API key. "
                    "Please add your GOOGLE_API_KEY to enable detailed analysis."
                ),
            }

        # ── Default ──────────────────────────────────────────
        return {}


# Singleton instance
llm_service = LLMService()
