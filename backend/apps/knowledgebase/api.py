import os
import re
from ninja import Router, File, Schema
from ninja.files import UploadedFile
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime

from .models import Expert, ExpertDocument, DocumentChunk, ExpertConversation, ExpertMessage

router = Router()

# File upload constraints
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
ALLOWED_EXTENSIONS = {'.pdf', '.txt'}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special chars"""
    filename = os.path.basename(filename)
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    filename = re.sub(r'[\s_]+', '_', filename)
    name, ext = os.path.splitext(filename)
    if len(name) > 100:
        name = name[:100]
    return f"{name}{ext}"


def validate_file(file: UploadedFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    if file.size > MAX_FILE_SIZE:
        return False, f'Datei zu groß. Maximum: {MAX_FILE_SIZE // (1024*1024)} MB'
    _, ext = os.path.splitext(file.name.lower())
    if ext not in ALLOWED_EXTENSIONS:
        return False, f'Dateityp nicht erlaubt: {ext}. Erlaubt: PDF, TXT'
    return True, ''


# ===== Schemas =====

class ExpertSchema(Schema):
    id: int
    name: str
    icon: str
    description: str
    system_prompt: str
    is_indexed: bool
    document_count: int
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class ExpertCreateSchema(Schema):
    name: str
    icon: str = '📚'
    description: str = ''
    system_prompt: str = 'Du bist ein hilfreicher Experte. Beantworte Fragen basierend auf den bereitgestellten Dokumenten. Zitiere relevante Quellen.'


class ExpertUpdateSchema(Schema):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None


class DocumentSchema(Schema):
    id: int
    expert_id: int
    name: str
    file_url: str
    file_type: str
    file_size: int
    status: str
    error_message: str
    page_count: int
    chunk_count: int
    created_at: datetime

    @staticmethod
    def resolve_file_url(obj):
        if obj.file:
            return obj.file.url
        return ''


class ConversationSchema(Schema):
    id: int
    expert_id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationCreateSchema(Schema):
    title: str = 'Neue Konversation'


class SourceChunkSchema(Schema):
    document_name: str
    page_number: Optional[int]
    content_preview: str
    similarity: Optional[float] = None  # 0-1 relevance score


class MessageSchema(Schema):
    id: int
    role: str
    content: str
    source_chunks: List[dict]
    created_at: datetime


class ChatRequestSchema(Schema):
    message: str
    model: Optional[str] = None  # LLM model to use


class ChatResponseSchema(Schema):
    message: MessageSchema
    sources: List[SourceChunkSchema]


class QueryRequestSchema(Schema):
    question: str
    model: Optional[str] = None  # LLM model to use


class QueryResponseSchema(Schema):
    answer: str
    sources: List[SourceChunkSchema]


class ErrorSchema(Schema):
    error: str


# ===== Expert Endpoints =====

@router.get('/experts/', response=List[ExpertSchema])
def list_experts(request):
    """List all experts for the current user"""
    return Expert.objects.filter(user=request.user)


@router.post('/experts/', response={201: ExpertSchema, 400: ErrorSchema})
def create_expert(request, data: ExpertCreateSchema):
    """Create a new expert"""
    expert = Expert.objects.create(
        user=request.user,
        name=data.name,
        icon=data.icon,
        description=data.description,
        system_prompt=data.system_prompt
    )
    return 201, expert


@router.get('/experts/{expert_id}', response={200: ExpertSchema, 404: ErrorSchema})
def get_expert(request, expert_id: int):
    """Get a single expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    return expert


@router.put('/experts/{expert_id}', response={200: ExpertSchema, 404: ErrorSchema})
def update_expert(request, expert_id: int, data: ExpertUpdateSchema):
    """Update an expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    if data.name is not None:
        expert.name = data.name
    if data.icon is not None:
        expert.icon = data.icon
    if data.description is not None:
        expert.description = data.description
    if data.system_prompt is not None:
        expert.system_prompt = data.system_prompt
    expert.save()
    return expert


@router.delete('/experts/{expert_id}', response={204: None, 404: ErrorSchema})
def delete_expert(request, expert_id: int):
    """Delete an expert and all associated data"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    # Delete from vector store
    from .services.vector_store import delete_expert_collection
    delete_expert_collection(expert.id)
    expert.delete()
    return 204, None


# ===== Document Endpoints =====

@router.get('/experts/{expert_id}/documents', response=List[DocumentSchema])
def list_documents(request, expert_id: int):
    """List all documents for an expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    return expert.documents.all()


@router.post('/experts/{expert_id}/documents', response={201: DocumentSchema, 400: ErrorSchema})
def upload_document(request, expert_id: int, file: UploadedFile = File(...)):
    """Upload a document to an expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)

    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        return 400, {'error': error_msg}

    # Sanitize filename
    safe_name = sanitize_filename(file.name)

    # Create document
    doc = ExpertDocument.objects.create(
        expert=expert,
        name=safe_name,
        file=file
    )

    # Start processing
    from .services.processing import process_document
    process_document(doc.id)

    return 201, doc


@router.get('/experts/{expert_id}/documents/{doc_id}', response={200: DocumentSchema, 404: ErrorSchema})
def get_document(request, expert_id: int, doc_id: int):
    """Get a single document"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    doc = get_object_or_404(ExpertDocument, id=doc_id, expert=expert)
    return doc


@router.delete('/experts/{expert_id}/documents/{doc_id}', response={204: None, 404: ErrorSchema})
def delete_document(request, expert_id: int, doc_id: int):
    """Delete a document"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    doc = get_object_or_404(ExpertDocument, id=doc_id, expert=expert)

    # Delete chunks from vector store
    from .services.vector_store import delete_document_chunks
    delete_document_chunks(expert.id, doc.id)

    doc.delete()
    return 204, None


# ===== Conversation Endpoints =====

@router.get('/experts/{expert_id}/conversations', response=List[ConversationSchema])
def list_conversations(request, expert_id: int):
    """List all conversations for an expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    return expert.conversations.filter(user=request.user)


@router.post('/experts/{expert_id}/conversations', response={201: ConversationSchema})
def create_conversation(request, expert_id: int, data: ConversationCreateSchema):
    """Create a new conversation with an expert"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)
    conv = ExpertConversation.objects.create(
        expert=expert,
        user=request.user,
        title=data.title
    )
    return 201, conv


@router.get('/conversations/{conv_id}', response={200: ConversationSchema, 404: ErrorSchema})
def get_conversation(request, conv_id: int):
    """Get a conversation"""
    conv = get_object_or_404(ExpertConversation, id=conv_id, user=request.user)
    return conv


@router.get('/conversations/{conv_id}/messages', response=List[MessageSchema])
def list_messages(request, conv_id: int):
    """Get all messages in a conversation"""
    conv = get_object_or_404(ExpertConversation, id=conv_id, user=request.user)
    return conv.messages.all()


@router.post('/conversations/{conv_id}/chat', response={200: ChatResponseSchema, 400: ErrorSchema})
def chat(request, conv_id: int, data: ChatRequestSchema):
    """Send a message and get a RAG-based response"""
    conv = get_object_or_404(ExpertConversation, id=conv_id, user=request.user)
    expert = conv.expert

    if not expert.is_indexed:
        return 400, {'error': 'Dieser Experte hat noch keine indexierten Dokumente.'}

    # Save user message
    user_msg = ExpertMessage.objects.create(
        conversation=conv,
        role='user',
        content=data.message
    )

    # Get RAG response
    from .services.rag import get_rag_response
    response_content, source_chunks = get_rag_response(expert, data.message, conv, model=data.model)

    # Save assistant message
    assistant_msg = ExpertMessage.objects.create(
        conversation=conv,
        role='assistant',
        content=response_content,
        source_chunks=[{
            'document_name': s['document_name'],
            'page_number': s['page_number'],
            'content_preview': s['content_preview'][:200]
        } for s in source_chunks]
    )

    # Update conversation title if it's the first message
    if conv.messages.count() == 2:  # user + assistant
        conv.title = data.message[:50] + ('...' if len(data.message) > 50 else '')
        conv.save()

    return {
        'message': assistant_msg,
        'sources': source_chunks
    }


@router.delete('/conversations/{conv_id}', response={204: None, 404: ErrorSchema})
def delete_conversation(request, conv_id: int):
    """Delete a conversation"""
    conv = get_object_or_404(ExpertConversation, id=conv_id, user=request.user)
    conv.delete()
    return 204, None


# ===== Quick Query Endpoint =====

@router.post('/experts/{expert_id}/query', response={200: QueryResponseSchema, 400: ErrorSchema})
def quick_query(request, expert_id: int, data: QueryRequestSchema):
    """Ask a question without creating a conversation"""
    expert = get_object_or_404(Expert, id=expert_id, user=request.user)

    if not expert.is_indexed:
        return 400, {'error': 'Dieser Experte hat noch keine indexierten Dokumente.'}

    from .services.rag import get_rag_response
    response_content, source_chunks = get_rag_response(expert, data.question, model=data.model)

    return {
        'answer': response_content,
        'sources': source_chunks
    }
