"""
Text embedding using OpenRouter API
"""
import os
import httpx
import logging
from typing import List

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_EMBEDDING_URL = 'https://openrouter.ai/api/v1/embeddings'
EMBEDDING_MODEL = 'openai/text-embedding-3-small'


def get_embeddings(texts: List[str], api_key: str = None) -> List[List[float]]:
    """
    Get embeddings for a list of texts using OpenRouter

    Args:
        texts: List of texts to embed
        api_key: Optional API key (uses env var if not provided)

    Returns:
        List of embedding vectors
    """
    if not api_key:
        api_key = OPENROUTER_API_KEY

    if not api_key:
        raise ValueError("OpenRouter API key not configured")

    # Process in batches to avoid timeout
    BATCH_SIZE = 50
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]

        try:
            response = httpx.post(
                OPENROUTER_EMBEDDING_URL,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}',
                },
                json={
                    'model': EMBEDDING_MODEL,
                    'input': batch
                },
                timeout=60.0
            )

            if response.status_code != 200:
                logger.error(f"Embedding API error: {response.text}")
                raise Exception(f"Embedding API error: {response.status_code}")

            result = response.json()
            data = result.get('data', [])

            # Sort by index to maintain order
            sorted_data = sorted(data, key=lambda x: x.get('index', 0))
            embeddings = [item['embedding'] for item in sorted_data]
            all_embeddings.extend(embeddings)

            logger.debug(f"Got {len(embeddings)} embeddings for batch {i // BATCH_SIZE + 1}")

        except httpx.TimeoutException:
            logger.error("Timeout getting embeddings")
            raise
        except Exception as e:
            logger.error(f"Error getting embeddings: {e}")
            raise

    return all_embeddings


def get_embedding(text: str, api_key: str = None) -> List[float]:
    """
    Get embedding for a single text

    Args:
        text: Text to embed
        api_key: Optional API key

    Returns:
        Embedding vector
    """
    embeddings = get_embeddings([text], api_key)
    return embeddings[0] if embeddings else []
