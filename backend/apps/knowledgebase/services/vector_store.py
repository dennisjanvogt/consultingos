"""
ChromaDB vector store for document embeddings
"""
import os
import uuid
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ChromaDB settings
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'chroma_data')

_client = None


def get_chroma_client():
    """Get or create ChromaDB client"""
    global _client
    if _client is None:
        try:
            import chromadb
            from chromadb.config import Settings
        except ImportError:
            logger.error("ChromaDB not installed. Run: pip install chromadb")
            raise ImportError("ChromaDB is required for vector storage")

        # Ensure persist directory exists
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

        _client = chromadb.PersistentClient(
            path=CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        logger.info(f"ChromaDB initialized at {CHROMA_PERSIST_DIR}")

    return _client


def get_collection_name(expert_id: int) -> str:
    """Generate collection name for an expert"""
    return f"expert_{expert_id}"


def get_or_create_collection(expert_id: int):
    """Get or create a collection for an expert"""
    client = get_chroma_client()
    collection_name = get_collection_name(expert_id)

    try:
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        return collection
    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        raise


def add_chunks_to_collection(
    expert_id: int,
    document_id: int,
    chunks: List[Dict],
    embeddings: List[List[float]]
) -> List[str]:
    """
    Add document chunks to the vector store

    Args:
        expert_id: Expert ID
        document_id: Document ID
        chunks: List of chunk dicts with 'content' and 'page_number'
        embeddings: List of embedding vectors

    Returns:
        List of chroma_ids for the chunks
    """
    collection = get_or_create_collection(expert_id)

    ids = []
    documents = []
    metadatas = []

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chroma_id = f"doc_{document_id}_chunk_{i}_{uuid.uuid4().hex[:8]}"
        ids.append(chroma_id)
        documents.append(chunk['content'])
        metadatas.append({
            'document_id': document_id,
            'chunk_index': i,
            'page_number': chunk.get('page_number') or 0
        })

    try:
        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        logger.info(f"Added {len(ids)} chunks to collection for expert {expert_id}")
        return ids
    except Exception as e:
        logger.error(f"Error adding chunks to collection: {e}")
        raise


def query_collection(
    expert_id: int,
    query_embedding: List[float],
    max_results: int = 10,
    relevance_threshold: float = 0.6,
    min_results: int = 1
) -> List[Dict]:
    """
    Query the vector store for similar chunks with dynamic result count.

    Uses relevance threshold to return only chunks above a similarity score.
    With cosine distance: 0 = identical, 1 = unrelated, 2 = opposite.
    threshold 0.6 means: similarity > 0.7 (1 - 0.6/2)

    Args:
        expert_id: Expert ID
        query_embedding: Query embedding vector
        max_results: Maximum candidates to fetch
        relevance_threshold: Max distance to include (lower = stricter)
        min_results: Always return at least this many (if available)

    Returns:
        List of relevant chunks with 'content', 'document_id', 'page_number', 'distance', 'similarity'
    """
    collection = get_or_create_collection(expert_id)

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=max_results,
            include=['documents', 'metadatas', 'distances']
        )

        chunks = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 1.0
                # Convert cosine distance to similarity (0-1 scale)
                similarity = 1 - (distance / 2)

                chunks.append({
                    'content': doc,
                    'document_id': metadata.get('document_id'),
                    'page_number': metadata.get('page_number'),
                    'chunk_index': metadata.get('chunk_index'),
                    'distance': distance,
                    'similarity': round(similarity, 3)
                })

        # Filter by relevance threshold
        relevant_chunks = [c for c in chunks if c['distance'] <= relevance_threshold]

        # Ensure minimum results (take best available if threshold too strict)
        if len(relevant_chunks) < min_results and chunks:
            relevant_chunks = chunks[:min_results]

        logger.info(f"Query returned {len(relevant_chunks)}/{len(chunks)} chunks above threshold {relevance_threshold}")

        return relevant_chunks

    except Exception as e:
        logger.error(f"Error querying collection: {e}")
        raise


def delete_document_chunks(expert_id: int, document_id: int):
    """Delete all chunks for a document from the vector store"""
    try:
        collection = get_or_create_collection(expert_id)

        # Get all chunks for this document
        results = collection.get(
            where={"document_id": document_id}
        )

        if results['ids']:
            collection.delete(ids=results['ids'])
            logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
    except Exception as e:
        logger.error(f"Error deleting document chunks: {e}")


def delete_expert_collection(expert_id: int):
    """Delete the entire collection for an expert"""
    try:
        client = get_chroma_client()
        collection_name = get_collection_name(expert_id)

        try:
            client.delete_collection(collection_name)
            logger.info(f"Deleted collection for expert {expert_id}")
        except Exception:
            pass  # Collection might not exist

    except Exception as e:
        logger.error(f"Error deleting expert collection: {e}")
