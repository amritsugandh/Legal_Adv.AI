"""
Tests for DocumentProcessor and TextChunker.
"""

import pytest
from app.services.document_processor import DocumentProcessor
from app.services.text_chunker import TextChunker
from app.utils.helpers import clean_extracted_text


def test_validate_file_extensions():
    """Test validation of supported and unsupported file extensions."""
    # Valid
    valid, msg = DocumentProcessor.validate_file("contract.pdf", file_size=1024)
    assert valid is True
    assert msg == ""

    valid, msg = DocumentProcessor.validate_file("agreement.docx", file_size=2048)
    assert valid is True

    # Invalid extension
    valid, msg = DocumentProcessor.validate_file("script.exe", file_size=500)
    assert valid is False
    assert "Unsupported file type" in msg

    # File exceeding limit
    valid, msg = DocumentProcessor.validate_file("huge.pdf", file_size=60 * 1024 * 1024, max_size_mb=50)
    assert valid is False
    assert "File too large" in msg


def test_clean_extracted_text():
    """Test cleaning weird whitespace and noise in extracted text."""
    dirty_text = "Clause  1.1:   Confidentiality.\n\n\n\rThis   is a    test.   "
    cleaned = clean_extracted_text(dirty_text)
    assert "  " not in cleaned
    assert "Clause 1.1: Confidentiality." in cleaned


def test_text_chunker_semantic_splitting():
    """Test text chunker chunks legal text and preserves metadata."""
    sample_text = (
        "SECTION 1. CONFIDENTIAL INFORMATION\n"
        "The receiving party shall hold all proprietary information in strict confidence for 3 years.\n\n"
        "SECTION 2. GOVERNING LAW\n"
        "This agreement shall be governed by the laws of California.\n\n"
        "SECTION 3. TERMINATION\n"
        "Either party may terminate this agreement with thirty (30) days prior written notice."
    )

    chunker = TextChunker(max_chunk_size=300, min_chunk_size=50)
    chunks = chunker.chunk_text(sample_text)

    assert len(chunks) >= 1
    for c in chunks:
        assert hasattr(c, "text")
        assert hasattr(c, "chunk_index")
        assert len(c.text) > 0
