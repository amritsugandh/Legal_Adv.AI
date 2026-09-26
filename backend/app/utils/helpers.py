"""
LegalLens — Shared Utility Functions
"""

import uuid
import re
from datetime import datetime, timezone


def generate_id() -> str:
    """Generate a unique document ID."""
    return uuid.uuid4().hex[:12]


def get_timestamp() -> str:
    """Get current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def get_file_extension(filename: str) -> str:
    """Extract and normalize file extension."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from a filename."""
    return re.sub(r'[^\w\s\-.]', '', filename).strip()


def truncate_text(text: str, max_length: int = 500) -> str:
    """Truncate text to max_length with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


def estimate_reading_time(text: str, wpm: int = 200) -> int:
    """Estimate reading time in minutes."""
    word_count = len(text.split())
    return max(1, round(word_count / wpm))


def clean_extracted_text(text: str) -> str:
    """Clean up text extracted from documents.

    Removes excessive whitespace and non-printable characters
    while preserving paragraph structure.
    """
    # Replace form feeds and other control chars (keep newlines, tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Normalize whitespace within lines
    text = re.sub(r'[^\S\n]+', ' ', text)
    # Collapse 3+ consecutive newlines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
