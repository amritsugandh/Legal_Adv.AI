"""
API Endpoint tests for LegalLens backend.
"""

import pytest
from app.db.database import AsyncSessionLocal
from app.db.models import DocumentRecord


@pytest.mark.asyncio
async def test_get_status(async_client):
    """Test engine status health check endpoint."""
    response = await async_client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "sqlite_async"
    assert "llm" in data
    assert "engine" in data["llm"]
    assert "total_documents" in data


@pytest.mark.asyncio
async def test_list_documents(async_client):
    """Test listing documents returns a 200 dictionary with documents array."""
    response = await async_client.get("/api/documents/", follow_redirects=True)
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert isinstance(data["documents"], list)


@pytest.mark.asyncio
async def test_get_nonexistent_document(async_client):
    """Test 404 response for non-existent document ID."""
    response = await async_client.get("/api/documents/non_existent_id_12345")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_rewrite_clause_endpoint(async_client):
    """Test counter-proposal drafting endpoint."""
    test_id = "test_doc_for_rewrite"
    async with AsyncSessionLocal() as session:
        doc = DocumentRecord(
            id=test_id,
            filename="Test_Agreement.pdf",
            file_type="pdf",
            page_count=1,
            status="ready",
            uploaded_at="2026-09-26T00:00:00Z",
            full_text="Test agreement text",
            summary="Test summary"
        )
        session.add(doc)
        await session.commit()

    try:
        payload = {
            "clause_text": "The Employee agrees not to compete with the Employer for a period of 5 years globally.",
            "target_stance": "neutral_mutual",
            "custom_instruction": "Make it reasonable to 1 year and within 25 miles."
        }
        response = await async_client.post(f"/api/documents/{test_id}/rewrite-clause", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "rewritten_clause" in data
        assert "key_changes" in data
        assert "negotiation_rationale" in data
        assert len(data["rewritten_clause"]) > 0
    finally:
        async with AsyncSessionLocal() as session:
            d = await session.get(DocumentRecord, test_id)
            if d:
                await session.delete(d)
                await session.commit()


@pytest.mark.asyncio
async def test_export_comparison_csv(async_client):
    """Test exporting comparison matrix as CSV."""
    payload = {
        "document_a_name": "Standard NDA v1.pdf",
        "document_b_name": "Standard NDA v2.pdf",
        "summary": "Comparison of confidentiality terms.",
        "important_changes": ["Term reduced from 3 years to 1 year."],
        "comparison_table": [
            {
                "topic": "Confidentiality Term",
                "document_a": "3 years from disclosure",
                "document_b": "1 year from disclosure",
                "has_change": True,
                "severity": "medium",
                "details": "Shorter survival window"
            },
            {
                "topic": "Governing Law",
                "document_a": "State of Delaware",
                "document_b": "State of Delaware",
                "has_change": False,
                "severity": "low",
                "details": "Identical"
            }
        ]
    }
    response = await async_client.post("/api/compare/export-csv", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text
    assert "Topic / Clause" in csv_text
    assert "Confidentiality Term" in csv_text
    assert "State of Delaware" in csv_text


@pytest.mark.asyncio
async def test_chat_history_lifecycle(async_client):
    """Test retrieving and clearing chat history for a document."""
    doc_id = "test_chat_doc_lifecycle"

    async with AsyncSessionLocal() as session:
        doc = DocumentRecord(
            id=doc_id,
            filename="Test_Chat.pdf",
            file_type="pdf",
            page_count=1,
            status="ready",
            uploaded_at="2026-09-26T00:00:00Z",
            full_text="Test chat doc",
            summary="Test chat summary"
        )
        session.add(doc)
        await session.commit()

    try:
        # Get history (should start empty)
        resp = await async_client.get(f"/api/chat/{doc_id}/history")
        assert resp.status_code == 200
        data = resp.json()
        assert "messages" in data
        assert data["messages"] == []

        # Clear history
        del_resp = await async_client.delete(f"/api/chat/{doc_id}/history")
        assert del_resp.status_code == 200
        assert "cleared" in del_resp.json()["message"].lower()
    finally:
        async with AsyncSessionLocal() as session:
            d = await session.get(DocumentRecord, doc_id)
            if d:
                await session.delete(d)
                await session.commit()
