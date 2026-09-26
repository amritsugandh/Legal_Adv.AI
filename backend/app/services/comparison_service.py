"""
LegalLens — Comparison Service
Compares two legal contracts side-by-side and highlights key changes,
differences in terms, rights, and potential risks.
"""

from app.services.llm_service import llm_service
from app.utils.prompts import CONTRACT_COMPARISON_PROMPT


class ComparisonService:
    """Service to compare two legal documents."""

    def __init__(self):
        self.llm = llm_service

    async def compare_documents(
        self,
        doc_a_name: str,
        doc_a_text: str,
        doc_b_name: str,
        doc_b_text: str,
    ) -> dict:
        """Compare two documents side-by-side using the LLM.

        Args:
            doc_a_name: Filename or title of Document A (e.g. original).
            doc_a_text: Extracted text of Document A.
            doc_b_name: Filename or title of Document B (e.g. proposed revision).
            doc_b_text: Extracted text of Document B.

        Returns:
            Dict containing comparison_table, important_changes, and summary.
        """
        # Truncate if excessively long for comparison prompt
        text_a = doc_a_text[:14000] if len(doc_a_text) > 14000 else doc_a_text
        text_b = doc_b_text[:14000] if len(doc_b_text) > 14000 else doc_b_text

        prompt = CONTRACT_COMPARISON_PROMPT.format(
            doc_a_name=doc_a_name,
            doc_a_text=text_a,
            doc_b_name=doc_b_name,
            doc_b_text=text_b,
        )

        try:
            result = await self.llm.generate_json(prompt)
            raw_table = result.get("comparison_table") or []
            sanitized_table = []
            valid_severities = {"low", "medium", "high"}

            for row in raw_table:
                if not isinstance(row, dict):
                    continue
                raw_sev = str(row.get("severity", "medium")).strip().lower()
                sev = raw_sev if raw_sev in valid_severities else "medium"
                sanitized_table.append({
                    "topic": str(row.get("topic") or "General Clause"),
                    "document_a": str(row.get("document_a") or "-"),
                    "document_b": str(row.get("document_b") or "-"),
                    "has_change": bool(row.get("has_change", False)),
                    "severity": sev,
                })

            raw_changes = result.get("important_changes") or []
            sanitized_changes = [
                str(c.get("change") or c.get("text") or c) if isinstance(c, dict) else str(c)
                for c in raw_changes
                if c
            ]

            return {
                "document_a_name": doc_a_name,
                "document_b_name": doc_b_name,
                "comparison_table": sanitized_table,
                "important_changes": sanitized_changes,
                "summary": str(result.get("summary") or "Comparison generated successfully."),
            }
        except Exception as e:
            # Fallback heuristic comparison
            return self._heuristic_fallback_comparison(
                doc_a_name, doc_a_text, doc_b_name, doc_b_text
            )

    def _heuristic_fallback_comparison(
        self,
        doc_a_name: str,
        doc_a_text: str,
        doc_b_name: str,
        doc_b_text: str,
    ) -> dict:
        """Provide a fallback structural comparison if LLM is unavailable."""
        topics = [
            ("Duration / Term", "term" in doc_a_text.lower(), "term" in doc_b_text.lower()),
            ("Notice Period", "notice" in doc_a_text.lower(), "notice" in doc_b_text.lower()),
            ("Termination", "termination" in doc_a_text.lower(), "termination" in doc_b_text.lower()),
            ("Indemnification", "indemn" in doc_a_text.lower(), "indemn" in doc_b_text.lower()),
            ("Governing Law", "jurisdiction" in doc_a_text.lower() or "governing law" in doc_a_text.lower(), "jurisdiction" in doc_b_text.lower() or "governing law" in doc_b_text.lower()),
        ]

        table = []
        for topic, has_a, has_b in topics:
            table.append({
                "topic": topic,
                "document_a": "Referenced in document" if has_a else "Not explicitly detected",
                "document_b": "Referenced in document" if has_b else "Not explicitly detected",
                "has_change": has_a != has_b,
                "severity": "medium" if has_a != has_b else "low",
            })

        return {
            "document_a_name": doc_a_name,
            "document_b_name": doc_b_name,
            "comparison_table": table,
            "important_changes": [
                f"Document lengths differ: {len(doc_a_text.split())} words vs {len(doc_b_text.split())} words."
            ],
            "summary": f"Side-by-side comparison between {doc_a_name} and {doc_b_name}.",
        }


# Singleton instance
comparison_service = ComparisonService()
