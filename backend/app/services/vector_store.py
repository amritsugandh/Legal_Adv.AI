"""
LegalLens — Vector Store Service
ChromaDB integration for storing and retrieving document chunks.
"""

import re
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.services.embeddings import embedding_service


class VectorStore:
    """Manages ChromaDB collections for document storage and retrieval."""

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    def _get_collection_name(self, document_id: str) -> str:
        """Generate a valid collection name for a document (3-63 chars, alphanumeric/hyphen/underscore)."""
        clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', document_id)
        name = f"doc_{clean_id}"
        return name[:63]

    def store_chunks(
        self,
        document_id: str,
        chunks: list[dict],
    ) -> int:
        """Store document chunks with their embeddings in ChromaDB.

        Args:
            document_id: Unique document identifier.
            chunks: List of chunk dicts with 'text', 'chunk_index',
                    'page_number', 'section_header'.

        Returns:
            Number of chunks stored.
        """
        collection_name = self._get_collection_name(document_id)

        # Delete existing collection if re-processing
        try:
            self.client.delete_collection(collection_name)
        except Exception:
            pass

        if not chunks:
            return 0

        collection = self.client.create_collection(
            name=collection_name,
            metadata={"document_id": document_id},
        )

        # Prepare data for ChromaDB
        texts = [c["text"] for c in chunks]
        ids = [f"{document_id}_chunk_{c['chunk_index']}" for c in chunks]
        metadatas = [
            {
                "chunk_index": c["chunk_index"],
                "page_number": c.get("page_number", 0),
                "section_header": c.get("section_header", "") or "",
                "document_id": document_id,
            }
            for c in chunks
        ]

        # Generate embeddings
        embeddings = embedding_service.embed_batch(texts)

        # Store in ChromaDB
        collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return len(texts)

    def search(
        self,
        document_id: str,
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Search for relevant chunks given a query.

        Args:
            document_id: Document to search within.
            query: User query string.
            top_k: Number of results to return.

        Returns:
            List of dicts with 'text', 'metadata', 'distance', 'relevance_score'.
        """
        collection_name = self._get_collection_name(document_id)

        try:
            collection = self.client.get_collection(collection_name)
        except Exception:
            return []

        count = collection.count()
        if count == 0:
            return []

        # Generate query embedding
        query_embedding = embedding_service.embed_query(query)

        # Search with safe n_results bound
        n_results = max(1, min(top_k, count))
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        # Format results
        search_results = []
        if results and results.get("documents") and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") and results["metadatas"] else [{}] * len(docs)
            dists = results["distances"][0] if results.get("distances") and results["distances"] else [0.0] * len(docs)

            for i, doc in enumerate(docs):
                dist = dists[i] if i < len(dists) else 0.0
                # Normalized distance into [0.0, 1.0] relevance score
                relevance = round(1.0 / (1.0 + max(0.0, float(dist))), 3)

                search_results.append({
                    "text": doc,
                    "metadata": metas[i] if i < len(metas) else {},
                    "distance": dist,
                    "relevance_score": relevance,
                })

        return search_results

    def delete_document(self, document_id: str) -> bool:
        """Delete all stored data for a document."""
        collection_name = self._get_collection_name(document_id)
        try:
            self.client.delete_collection(collection_name)
            return True
        except Exception:
            return False

    def document_exists(self, document_id: str) -> bool:
        """Check if a document has been indexed."""
        collection_name = self._get_collection_name(document_id)
        try:
            col = self.client.get_collection(collection_name)
            return col.count() > 0
        except Exception:
            return False


# Singleton instance
vector_store = VectorStore()
