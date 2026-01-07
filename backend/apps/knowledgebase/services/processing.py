"""
Document processing pipeline
"""
import os
import logging

logger = logging.getLogger(__name__)


def process_document(document_id: int):
    """
    Process a document: extract text, chunk, embed, and store in vector DB

    This runs synchronously for now. Could be converted to async/celery later.
    """
    from ..models import ExpertDocument, DocumentChunk
    from .text_extraction import extract_text
    from .chunking import chunk_document
    from .embedding import get_embeddings
    from .vector_store import add_chunks_to_collection

    try:
        doc = ExpertDocument.objects.get(id=document_id)
    except ExpertDocument.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return

    # Update status to processing
    doc.status = 'processing'
    doc.save()

    try:
        # 1. Extract text
        logger.info(f"Extracting text from {doc.name}")
        file_path = doc.file.path
        text, page_count = extract_text(file_path, doc.file_type)

        if not text.strip():
            raise ValueError("Keine Textinhalte im Dokument gefunden")

        doc.page_count = page_count
        doc.save()

        # 2. Chunk text
        logger.info(f"Chunking document {doc.name}")
        chunks = chunk_document(text)

        if not chunks:
            raise ValueError("Keine Chunks aus dem Dokument erstellt")

        # 3. Get embeddings
        logger.info(f"Getting embeddings for {len(chunks)} chunks")
        chunk_texts = [c['content'] for c in chunks]
        embeddings = get_embeddings(chunk_texts)

        # 4. Store in vector DB
        logger.info(f"Storing chunks in vector DB")
        chroma_ids = add_chunks_to_collection(
            expert_id=doc.expert_id,
            document_id=doc.id,
            chunks=chunks,
            embeddings=embeddings
        )

        # 5. Save chunks to database for reference
        for i, (chunk, chroma_id) in enumerate(zip(chunks, chroma_ids)):
            DocumentChunk.objects.create(
                document=doc,
                chunk_index=i,
                content=chunk['content'],
                page_number=chunk.get('page_number'),
                chroma_id=chroma_id
            )

        # 6. Update document status
        doc.chunk_count = len(chunks)
        doc.status = 'completed'
        doc.error_message = ''
        doc.save()

        # 7. Update expert counts
        doc.expert.update_counts()

        logger.info(f"Successfully processed document {doc.name}: {len(chunks)} chunks")

    except Exception as e:
        logger.exception(f"Error processing document {doc.name}: {e}")
        doc.status = 'failed'
        doc.error_message = str(e)
        doc.save()


def reprocess_document(document_id: int):
    """
    Reprocess a document (delete old chunks and reprocess)
    """
    from ..models import ExpertDocument
    from .vector_store import delete_document_chunks

    try:
        doc = ExpertDocument.objects.get(id=document_id)
    except ExpertDocument.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return

    # Delete old chunks from DB and vector store
    doc.chunks.all().delete()
    delete_document_chunks(doc.expert_id, doc.id)

    # Reset counts
    doc.chunk_count = 0
    doc.status = 'pending'
    doc.error_message = ''
    doc.save()

    # Reprocess
    process_document(document_id)
