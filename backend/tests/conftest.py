"""
Pytest configuration and fixtures for LegalLens backend.
"""

import pytest
import pytest_asyncio
import httpx
from app.main import app
from app.db.database import init_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Ensure database schema is initialized before tests run."""
    await init_db()


@pytest_asyncio.fixture
async def async_client():
    """Async HTTP test client bound to FastAPI application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
