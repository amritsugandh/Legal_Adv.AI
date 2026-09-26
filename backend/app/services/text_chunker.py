"""
LegalLens — Semantic Text Chunker
Splits legal documents into meaningful chunks preserving clause boundaries.
"""

import re
from typing import Optional


class TextChunk:
    """A semantically meaningful chunk of document text."""

    def __init__(
        self,
        text: str,
        chunk_index: int,
        page_number: Optional[int] = None,
        section_header: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        self.text = text
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.section_header = section_header
        self.metadata = metadata or {}

    @property
    def char_count(self) -> int:
        return len(self.text)

    @property
    def word_count(self) -> int:
        return len(self.text.split())

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "chunk_index": self.chunk_index,
            "page_number": self.page_number,
            "section_header": self.section_header,
            "metadata": self.metadata,
        }


class TextChunker:
    """Splits legal document text into semantic chunks.

    Strategy:
    1. First try to split on section/clause boundaries
    2. Fall back to paragraph-level splitting
    3. Final fallback: sentence-level splitting with overlap
    """

    def __init__(
        self,
        max_chunk_size: int = 1500,
        min_chunk_size: int = 200,
        overlap_size: int = 150,
    ):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap_size = overlap_size

        # Patterns that indicate clause/section boundaries
        self._section_patterns = [
            r'\n(?=(?:SECTION|Section|CLAUSE|Clause|Article|ARTICLE)\s+\d+)',
            r'\n(?=\d+\.\d*\s+[A-Z])',
            r'\n(?=[IVXLC]+\.\s+)',
            r'\n(?=(?:SCHEDULE|Schedule|APPENDIX|Appendix)\s+)',
        ]

    def chunk_document(self, pages: list[dict]) -> list[TextChunk]:
        """Chunk a document from its extracted pages.

        Args:
            pages: List of page dicts with 'text', 'page_number', 'section_header'.

        Returns:
            List of TextChunk objects with metadata.
        """
        chunks = []
        chunk_index = 0

        for page in pages:
            page_text = page.get("text", "")
            page_num = page.get("page_number", 1)
            section = page.get("section_header")

            if not page_text.strip():
                continue

            # Try section-level splitting first
            sections = self._split_by_sections(page_text)

            for section_text in sections:
                clean_sec = section_text.strip()
                if not clean_sec:
                    continue

                if len(clean_sec) <= self.max_chunk_size:
                    chunks.append(TextChunk(
                        text=clean_sec,
                        chunk_index=chunk_index,
                        page_number=page_num,
                        section_header=section or self._extract_header(clean_sec),
                    ))
                    chunk_index += 1
                else:
                    # Section too large — split by paragraphs with overlap
                    sub_chunks = self._split_with_overlap(clean_sec)
                    for sc in sub_chunks:
                        clean_sc = sc.strip()
                        if clean_sc:
                            chunks.append(TextChunk(
                                text=clean_sc,
                                chunk_index=chunk_index,
                                page_number=page_num,
                                section_header=section or self._extract_header(clean_sc),
                            ))
                            chunk_index += 1

        # Merge tiny trailing chunks with the previous one
        chunks = self._merge_small_chunks(chunks)

        return chunks

    def chunk_text(self, text: str) -> list[TextChunk]:
        """Chunk plain text (convenience method for text without page info)."""
        pages = [{"text": text, "page_number": 1, "section_header": None}]
        return self.chunk_document(pages)

    def _split_by_sections(self, text: str) -> list[str]:
        """Split text by section/clause boundaries."""
        combined_pattern = "|".join(self._section_patterns)

        parts = re.split(combined_pattern, text)
        parts = [p for p in parts if p and p.strip()]

        if len(parts) <= 1:
            # No section boundaries found, split by double newlines
            parts = text.split("\n\n")
            parts = [p for p in parts if p and p.strip()]

        return parts if parts else [text]

    def _split_with_overlap(self, text: str) -> list[str]:
        """Split text into chunks with overlap for context preservation."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_chunk = []
        current_size = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            # Safety: if a single sentence exceeds max_chunk_size, hard-split it
            if sentence_len > self.max_chunk_size:
                # Flush current chunk first
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_size = 0
                # Hard-split the oversized sentence
                for start in range(0, sentence_len, self.max_chunk_size - self.overlap_size):
                    end = min(start + self.max_chunk_size, sentence_len)
                    chunks.append(sentence[start:end])
                continue

            if current_size + sentence_len > self.max_chunk_size and current_chunk:
                # Save current chunk
                chunk_text = " ".join(current_chunk)
                chunks.append(chunk_text)

                # Start new chunk with overlap from end of previous
                overlap_text = chunk_text[-self.overlap_size:]
                current_chunk = [overlap_text, sentence]
                current_size = len(overlap_text) + sentence_len
            else:
                current_chunk.append(sentence)
                current_size += sentence_len

        # Add final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def _merge_small_chunks(self, chunks: list[TextChunk]) -> list[TextChunk]:
        """Merge chunks smaller than min_chunk_size with their predecessor."""
        if len(chunks) <= 1:
            return chunks

        merged = [chunks[0]]

        for chunk in chunks[1:]:
            if chunk.char_count < self.min_chunk_size and merged:
                # Merge with previous chunk
                prev = merged[-1]
                prev.text = prev.text + "\n\n" + chunk.text
            else:
                merged.append(chunk)

        for i, c in enumerate(merged):
            c.chunk_index = i

        return merged

    def _extract_header(self, text: str) -> Optional[str]:
        """Try to extract a section header from the beginning of text."""
        first_line = text.strip().split("\n")[0].strip()
        if len(first_line) < 100 and (
            first_line.isupper()
            or re.match(r'^\d+\.', first_line)
            or re.match(r'^(?:Section|Clause|Article)', first_line, re.IGNORECASE)
        ):
            return first_line
        return None
