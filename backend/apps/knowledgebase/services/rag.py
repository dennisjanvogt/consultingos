"""
RAG (Retrieval Augmented Generation) service
"""
import os
import httpx
import logging
from typing import List, Dict, Tuple, Optional

from .embedding import get_embedding
from .vector_store import query_collection

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
DEFAULT_RAG_MODEL = 'google/gemini-2.0-flash-001'


def get_rag_response(
    expert,
    question: str,
    conversation=None,
    api_key: str = None,
    model: str = None
) -> Tuple[str, List[Dict]]:
    """
    Get a RAG-based response for a question

    Args:
        expert: Expert model instance
        question: User's question
        conversation: Optional conversation for context
        api_key: Optional API key
        model: LLM model to use (defaults to DEFAULT_RAG_MODEL)

    Returns:
        Tuple of (response_text, source_chunks)
    """
    if not api_key:
        api_key = OPENROUTER_API_KEY

    if not api_key:
        raise ValueError("OpenRouter API key not configured")

    # Get query embedding
    query_embedding = get_embedding(question, api_key)

    # Retrieve relevant chunks (dynamic count based on relevance)
    chunks = query_collection(
        expert.id,
        query_embedding,
        max_results=10,           # Fetch up to 10 candidates
        relevance_threshold=0.5,  # Only include if similarity > 0.75
        min_results=1             # Always return at least 1
    )

    if not chunks:
        return "Ich konnte keine relevanten Informationen in den Dokumenten finden.", []

    # Get document names for sources
    from ..models import ExpertDocument
    doc_ids = set(c['document_id'] for c in chunks if c.get('document_id'))
    docs = {d.id: d for d in ExpertDocument.objects.filter(id__in=doc_ids)}

    source_chunks = []
    for chunk in chunks:
        doc = docs.get(chunk.get('document_id'))
        source_chunks.append({
            'document_name': doc.name if doc else 'Unbekannt',
            'page_number': chunk.get('page_number'),
            'content_preview': chunk['content'][:300] + '...' if len(chunk['content']) > 300 else chunk['content'],
            'similarity': chunk.get('similarity', 0)  # 0-1 relevance score
        })

    # Build context from chunks
    context_parts = []
    for i, chunk in enumerate(chunks):
        doc = docs.get(chunk.get('document_id'))
        doc_name = doc.name if doc else 'Unbekannt'
        page = chunk.get('page_number')
        page_info = f" (Seite {page})" if page else ""

        context_parts.append(f"[Quelle {i+1}: {doc_name}{page_info}]\n{chunk['content']}")

    context = "\n\n---\n\n".join(context_parts)

    # Build messages
    messages = [
        {
            'role': 'system',
            'content': f"""{expert.system_prompt}

WICHTIG: Basiere deine Antworten auf den folgenden Dokumenten. Wenn du Informationen aus den Dokumenten verwendest, verweise auf die Quellen.

=== DOKUMENT-KONTEXT ===
{context}
=== ENDE KONTEXT ===

Beantworte die Frage des Benutzers basierend auf den obigen Dokumenten. Wenn die Antwort nicht in den Dokumenten zu finden ist, sage das ehrlich."""
        }
    ]

    # Add conversation history if available
    if conversation:
        history = conversation.messages.order_by('created_at')[:10]  # Last 10 messages
        for msg in history:
            messages.append({
                'role': msg.role,
                'content': msg.content
            })

    # Add current question
    messages.append({
        'role': 'user',
        'content': question
    })

    # Use provided model or default
    llm_model = model or DEFAULT_RAG_MODEL
    logger.info(f"Using LLM model: {llm_model}")

    # Call LLM
    try:
        response = httpx.post(
            OPENROUTER_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            json={
                'model': llm_model,
                'messages': messages,
                'max_tokens': 2000,
                'temperature': 0.3  # Lower temperature for more factual responses
            },
            timeout=60.0
        )

        if response.status_code != 200:
            logger.error(f"LLM API error: {response.text}")
            return f"Fehler bei der Verarbeitung: {response.status_code}", source_chunks

        result = response.json()
        choices = result.get('choices', [])

        if not choices:
            return "Keine Antwort vom Modell erhalten.", source_chunks

        answer = choices[0].get('message', {}).get('content', '')
        return answer, source_chunks

    except httpx.TimeoutException:
        logger.error("Timeout calling LLM")
        return "Zeitüberschreitung bei der Anfrage.", source_chunks
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        return f"Fehler: {str(e)}", source_chunks
