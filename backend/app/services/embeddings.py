"""
LegalLens — Embedding Service
Generates text embeddings using Google Generative AI (text-embedding-004),
with robust local fallback if API key is not configured or offline.
"""

import hashlib
import logging
import warnings
import numpy as np

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai


from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates embeddings for text chunks using Google's embedding model,

    with fallback to local normalized hashing embeddings if unconfigured.
    """

    def __init__(self):
        self.api_configured = False
        self.model_name = settings.EMBEDDING_MODEL
        self._init_client()

    def _init_client(self):
        key = settings.GOOGLE_API_KEY.strip() if settings.GOOGLE_API_KEY else ""
        if key and key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=key)
                self.api_configured = True
            except Exception as e:
                logger.warning(f"Could not configure Google GenAI: {e}")
                self.api_configured = False
        else:
            self.api_configured = False

    def update_api_key(self, api_key: str):
        """Update API key at runtime."""
        self._init_client()

    def _local_embed(self, text: str, dim: int = 768) -> list[float]:
        """Generate a deterministic 768-dim normalized embedding vector."""
        vec = np.zeros(dim, dtype=np.float32)
        tokens = text.lower().split()
        if not tokens:
            return vec.tolist()

        for token in tokens:
            idx = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16) % dim
            vec[idx] += 1.0

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_text(self, text: str) -> list[float]:
        """Generate an embedding for a single text string."""
        if self.api_configured:
            try:
                result = genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type="retrieval_document",
                )
                return result["embedding"]
            except Exception as e:
                logger.warning(f"Gemini embedding failed, using local fallback: {e}")

        return self._local_embed(text)

    def embed_query(self, query: str) -> list[float]:
        """Generate an embedding for a search query."""
        if self.api_configured:
            try:
                result = genai.embed_content(
                    model=self.model_name,
                    content=query,
                    task_type="retrieval_query",
                )
                return result["embedding"]
            except Exception as e:
                logger.warning(f"Gemini query embedding failed, using local fallback: {e}")

        return self._local_embed(query)

    def embed_batch(self, texts: list[str], batch_size: int = 50) -> list[list[float]]:
        """Generate embeddings for multiple texts in batches."""
        if not texts:
            return []

        if self.api_configured:
            all_embeddings = []
            try:
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    result = genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document",
                    )
                    embedding = result["embedding"]
                    # Gemini returns a flat list[float] for single content,
                    # but list[list[float]] for multiple — normalize to list[list[float]]
                    if embedding and not isinstance(embedding[0], list):
                        embedding = [embedding]
                    all_embeddings.extend(embedding)
                return all_embeddings
            except Exception as e:
                logger.warning(f"Batch embedding failed, switching to local: {e}")

        return [self._local_embed(t) for t in texts]


# Singleton instance
embedding_service = EmbeddingService()
