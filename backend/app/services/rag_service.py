"""
LegalLens — RAG Service
Retrieval-Augmented Generation pipeline for document Q&A.
Retrieves relevant chunks → builds context → generates grounded answer.
"""

from app.services.vector_store import vector_store
from app.services.llm_service import llm_service
from app.utils.prompts import RAG_QA_PROMPT, DOCUMENT_SUMMARY_PROMPT


class RAGService:
    """Handles retrieval-augmented generation for document Q&A."""

    def __init__(self):
        self.vector_store = vector_store
        self.llm = llm_service

    async def ask_question(
        self,
        document_id: str,
        question: str,
        simplicity_level: str = "simple",
        top_k: int = 5,
        history: list[dict] = None,
    ) -> dict:
        """Answer a question about a document using RAG with conversational memory.

        Pipeline:
        1. Embed the question
        2. Retrieve top-k relevant chunks from vector store
        3. Build context from retrieved chunks
        4. Integrate prior conversation history for context
        5. Generate answer with source citations

        Args:
            document_id: Document to query.
            question: User's question.
            simplicity_level: "original", "simple", or "very_simple".
            top_k: Number of chunks to retrieve.
            history: Optional list of past messages dicts [{"role": "user"|"assistant", "text": "..."}].

        Returns:
            Dict with answer, sources, confidence, not_found.
        """
        # Step 1 & 2: Retrieve relevant chunks
        search_results = self.vector_store.search(
            document_id=document_id,
            query=question,
            top_k=top_k,
        )

        if not search_results:
            return {
                "answer": "I couldn't find relevant information in the document to answer this question. The document may not contain information about this topic.",
                "sources": [],
                "confidence": "low",
                "not_found": True,
            }

        # Step 3: Build context from retrieved chunks
        context_parts = []
        for i, result in enumerate(search_results):
            section = result["metadata"].get("section_header", "")
            page = result["metadata"].get("page_number", "Unknown")
            section_label = f"[Section: {section}]" if section else ""
            context_parts.append(
                f"--- Excerpt {i+1} (Page {page}) {section_label} ---\n{result['text']}"
            )

        context = "\n\n".join(context_parts)

        # Build conversation history context
        conv_str = ""
        if history:
            turns = []
            for item in history[-6:]:
                role = "User" if item.get("role") == "user" else "LegalLens"
                text = (item.get("text") or "").strip()
                if text:
                    turns.append(f"{role}: {text}")
            if turns:
                conv_str = "Prior Conversation History:\n" + "\n".join(turns) + "\n\n"

        # Map simplicity level to prompt language
        simplicity_map = {
            "original": "the original legal language, keeping technical terms",
            "simple": "plain, everyday language that a non-lawyer can understand",
            "very_simple": "very simple language, as if explaining to someone with no legal or business background",
        }
        level_description = simplicity_map.get(simplicity_level, simplicity_map["simple"])

        # Step 4: Generate answer with LLM
        prompt = RAG_QA_PROMPT.format(
            context=context,
            conversation_history=conv_str,
            question=question,
            simplicity_level=level_description,
        )

        try:
            result = await self.llm.generate_json(prompt)

            # Enrich sources with page numbers from search results
            if "sources" in result:
                for i, source in enumerate(result["sources"]):
                    if i < len(search_results):
                        source["page"] = search_results[i]["metadata"].get("page_number")
                        if "relevance_score" not in source:
                            source["relevance_score"] = search_results[i].get("relevance_score", 0)

            return result

        except ValueError:
            # Fallback if JSON parsing fails
            raw_answer = await self.llm.generate(prompt)
            return {
                "answer": raw_answer,
                "sources": [
                    {
                        "section": r["metadata"].get("section_header", "Document"),
                        "page": r["metadata"].get("page_number"),
                        "text_snippet": r["text"][:200],
                        "relevance_score": r.get("relevance_score", 0),
                    }
                    for r in search_results[:3]
                ],
                "confidence": "medium",
                "not_found": False,
            }

    async def generate_summary(self, document_text: str) -> dict:
        """Generate a comprehensive document summary.

        Args:
            document_text: Full extracted text of the document.

        Returns:
            Dict with document_type, summary, key_points, etc.
        """
        # Truncate very long documents for summary (use first ~15000 chars + last ~5000)
        if len(document_text) > 20000:
            truncated = document_text[:15000] + "\n\n[...middle sections omitted for summary...]\n\n" + document_text[-5000:]
        else:
            truncated = document_text

        prompt = DOCUMENT_SUMMARY_PROMPT.format(document_text=truncated)

        try:
            return await self.llm.generate_json(prompt)
        except ValueError:
            # Return a basic summary on failure
            return {
                "document_type": "Unknown",
                "title": None,
                "parties": [],
                "effective_date": None,
                "duration": None,
                "governing_law": None,
                "total_clauses": 0,
                "summary": "Unable to generate summary. Please try again.",
                "key_points": [],
                "important_clauses": [],
            }


# Singleton instance
rag_service = RAGService()
