import os
import base64
import uuid
import logging
import httpx
from ninja import Router, Schema
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from typing import Optional, List

logger = logging.getLogger(__name__)

from apps.documents.models import Folder, Document
from .models import Conversation, Message, Helper

router = Router()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
DEFAULT_CHAT_MODEL = 'google/gemini-2.0-flash-001'
DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-preview-image-generation'


class ImageGenerateSchema(Schema):
    prompt: str
    filename: Optional[str] = None
    model: Optional[str] = None


class ImageResponseSchema(Schema):
    id: int
    name: str
    file_url: str
    folder_id: int
    folder_name: str


class ErrorSchema(Schema):
    error: str


@router.post('/generate-image', response={201: ImageResponseSchema, 400: ErrorSchema, 500: ErrorSchema})
def generate_image(request, data: ImageGenerateSchema):
    """Generate an image using Gemini and save it to the Bilder folder"""

    if not OPENROUTER_API_KEY:
        return 500, {'error': 'OpenRouter API key not configured'}

    # Get or create Bilder folder for user
    bilder_folder, _ = Folder.objects.get_or_create(
        user=request.user,
        name='Bilder',
        parent=None,
        defaults={'show_in_sidebar': True}
    )

    # Use provided model or fall back to default
    image_model = data.model or DEFAULT_IMAGE_MODEL
    logger.debug(f'Using image model: {image_model}')

    try:
        logger.debug(f'Calling OpenRouter API with model: {image_model}')

        # Call OpenRouter with selected image model
        response = httpx.post(
            OPENROUTER_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            },
            json={
                'model': image_model,
                'messages': [
                    {
                        'role': 'user',
                        'content': f'Generate an image: {data.prompt}'
                    }
                ],
                'max_tokens': 4096,
            },
            timeout=120.0  # Image generation can take time
        )

        logger.debug(f'OpenRouter response status: {response.status_code}')

        if response.status_code != 200:
            error_text = response.text
            return 500, {'error': f'OpenRouter API error: {error_text}'}

        result = response.json()

        # Extract image from response
        # Gemini returns images as inline_data in parts
        choices = result.get('choices', [])
        if not choices:
            return 500, {'error': 'No response from image model'}

        message = choices[0].get('message', {})
        content = message.get('content', '')

        # Check for images array in message (OpenRouter/Gemini format)
        images = message.get('images', [])
        if images:
            for img in images:
                if img.get('type') == 'image_url':
                    image_url = img.get('image_url', {}).get('url', '')
                    if image_url.startswith('data:image'):
                        parts = image_url.split(',', 1)
                        if len(parts) == 2:
                            mime_part = parts[0]
                            image_data = parts[1]
                            mime_type = mime_part.split(':')[1].split(';')[0] if ':' in mime_part else 'image/png'
                            return save_image(request.user, bilder_folder, image_data, mime_type, data)

        # Check if content is a list (multimodal response with image)
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    # Check for inline_data (base64 image)
                    inline_data = part.get('inline_data')
                    if inline_data:
                        image_data = inline_data.get('data')
                        mime_type = inline_data.get('mime_type', 'image/png')
                        if image_data:
                            return save_image(request.user, bilder_folder, image_data, mime_type, data)

        # Try to find base64 image in text content (some models embed it)
        if isinstance(content, str):
            # Check if it's a data URL
            if content.startswith('data:image'):
                parts = content.split(',', 1)
                if len(parts) == 2:
                    mime_part = parts[0]  # e.g., "data:image/png;base64"
                    image_data = parts[1]
                    mime_type = mime_part.split(':')[1].split(';')[0] if ':' in mime_part else 'image/png'
                    return save_image(request.user, bilder_folder, image_data, mime_type, data)

        logger.warning(f'Could not extract image. Message keys: {message.keys()}, Content type: {type(content)}')
        return 500, {'error': 'Could not extract image from response. Model may not support image generation.'}

    except httpx.TimeoutException:
        logger.warning('Timeout during image generation')
        return 500, {'error': 'Request timeout - image generation took too long'}
    except Exception as e:
        logger.exception(f'Error during image generation: {e}')
        return 500, {'error': f'Error generating image: {str(e)}'}


def save_image(user, folder, base64_data: str, mime_type: str, data: ImageGenerateSchema):
    """Save base64 image data to a Document in the specified folder"""

    # Determine file extension
    ext_map = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
    }
    extension = ext_map.get(mime_type, 'png')

    # Generate filename
    if data.filename:
        filename = f"{data.filename}.{extension}"
    else:
        # Generate from prompt (first 30 chars) + uuid
        safe_prompt = ''.join(c for c in data.prompt[:30] if c.isalnum() or c in ' -_').strip()
        safe_prompt = safe_prompt.replace(' ', '_')
        filename = f"{safe_prompt}_{uuid.uuid4().hex[:8]}.{extension}"

    # Decode base64
    try:
        image_bytes = base64.b64decode(base64_data)
    except Exception:
        return 500, {'error': 'Invalid base64 image data'}

    # Create document
    doc = Document(
        user=user,
        folder=folder,
        name=filename,
        description=f'AI-generiert: {data.prompt}'
    )

    # Save file
    doc.file.save(filename, ContentFile(image_bytes), save=True)

    return 201, {
        'id': doc.id,
        'name': doc.name,
        'file_url': doc.file.url,
        'folder_id': folder.id,
        'folder_name': folder.name
    }


# ==================== Conversation Endpoints ====================

class MessageSchema(Schema):
    id: int
    role: str
    content: str
    image_url: Optional[str] = None
    created_at: str

    @staticmethod
    def resolve_created_at(obj):
        return obj.created_at.isoformat()


class ConversationSchema(Schema):
    id: int
    title: str
    created_at: str
    updated_at: str

    @staticmethod
    def resolve_created_at(obj):
        return obj.created_at.isoformat()

    @staticmethod
    def resolve_updated_at(obj):
        return obj.updated_at.isoformat()


class ConversationDetailSchema(Schema):
    id: int
    title: str
    messages: List[MessageSchema]
    created_at: str
    updated_at: str

    @staticmethod
    def resolve_created_at(obj):
        return obj.created_at.isoformat()

    @staticmethod
    def resolve_updated_at(obj):
        return obj.updated_at.isoformat()

    @staticmethod
    def resolve_messages(obj):
        return list(obj.messages.all())


class ConversationCreateSchema(Schema):
    title: Optional[str] = None


class MessageCreateSchema(Schema):
    role: str
    content: str
    image_url: Optional[str] = None


@router.get('/conversations', response=List[ConversationSchema])
def list_conversations(request):
    """List all conversations for current user"""
    return Conversation.objects.filter(user=request.user)


@router.post('/conversations', response={201: ConversationSchema})
def create_conversation(request, data: ConversationCreateSchema):
    """Create a new conversation"""
    conv = Conversation.objects.create(
        user=request.user,
        title=data.title or 'Neues Gespräch'
    )
    return 201, conv


@router.get('/conversations/{conversation_id}', response={200: ConversationDetailSchema, 404: ErrorSchema})
def get_conversation(request, conversation_id: int):
    """Get a conversation with all messages"""
    conv = get_object_or_404(Conversation, id=conversation_id, user=request.user)
    return 200, conv


@router.delete('/conversations/{conversation_id}', response={204: None, 404: ErrorSchema})
def delete_conversation(request, conversation_id: int):
    """Delete a conversation"""
    conv = get_object_or_404(Conversation, id=conversation_id, user=request.user)
    conv.delete()
    return 204, None


@router.post('/conversations/{conversation_id}/messages', response={201: MessageSchema, 404: ErrorSchema})
def add_message(request, conversation_id: int, data: MessageCreateSchema):
    """Add a message to a conversation"""
    conv = get_object_or_404(Conversation, id=conversation_id, user=request.user)

    msg = Message.objects.create(
        conversation=conv,
        role=data.role,
        content=data.content,
        image_url=data.image_url
    )

    # Update conversation title from first user message if still default
    if conv.title == 'Neues Gespräch' and data.role == 'user':
        conv.title = data.content[:100] if len(data.content) > 100 else data.content
        conv.save()

    # Touch updated_at
    conv.save()

    return 201, msg


# ==================== Helper Endpoints ====================

class HelperSchema(Schema):
    id: int
    name: str
    icon: str
    description: str
    system_prompt: str
    enabled_tools: List[str]
    is_default: bool
    created_at: str
    updated_at: str

    @staticmethod
    def resolve_created_at(obj):
        return obj.created_at.isoformat()

    @staticmethod
    def resolve_updated_at(obj):
        return obj.updated_at.isoformat()


class HelperCreateSchema(Schema):
    name: str
    icon: Optional[str] = '🤖'
    description: Optional[str] = ''
    system_prompt: str
    enabled_tools: List[str] = []


class HelperUpdateSchema(Schema):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    enabled_tools: Optional[List[str]] = None


class PromptGenerateSchema(Schema):
    description: str
    model: Optional[str] = None


class PromptResponseSchema(Schema):
    prompt: str


@router.get('/helpers', response=List[HelperSchema])
def list_helpers(request):
    """List all helpers for current user"""
    return Helper.objects.filter(user=request.user)


@router.post('/helpers', response={201: HelperSchema})
def create_helper(request, data: HelperCreateSchema):
    """Create a new helper"""
    helper = Helper.objects.create(
        user=request.user,
        name=data.name,
        icon=data.icon or '🤖',
        description=data.description or '',
        system_prompt=data.system_prompt,
        enabled_tools=data.enabled_tools or []
    )
    return 201, helper


@router.post('/helpers/generate-prompt', response={200: PromptResponseSchema, 500: ErrorSchema})
def generate_prompt(request, data: PromptGenerateSchema):
    """Generate a system prompt using AI based on description"""
    if not OPENROUTER_API_KEY:
        return 500, {'error': 'OpenRouter API key not configured'}

    # Use provided model or fall back to default
    chat_model = data.model or DEFAULT_CHAT_MODEL

    try:
        response = httpx.post(
            OPENROUTER_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            },
            json={
                'model': chat_model,
                'messages': [
                    {
                        'role': 'system',
                        'content': '''Du bist ein Experte für das Schreiben von System-Prompts für KI-Assistenten.
Erstelle einen professionellen, detaillierten System-Prompt auf Deutsch basierend auf der Beschreibung des Benutzers.

Der Prompt sollte:
- Die Rolle und Persönlichkeit des Assistenten klar definieren
- Den Ton und Stil festlegen (formell/informell, kurz/ausführlich)
- Spezifische Verhaltensregeln enthalten
- Auf Deutsch sein
- Zwischen 100-500 Wörter lang sein

Antworte NUR mit dem System-Prompt, keine Erklärungen oder Einleitungen.'''
                    },
                    {
                        'role': 'user',
                        'content': f'Erstelle einen System-Prompt für: {data.description}'
                    }
                ],
                'max_tokens': 2000,
            },
            timeout=60.0
        )

        if response.status_code != 200:
            return 500, {'error': f'OpenRouter API error: {response.text}'}

        result = response.json()
        choices = result.get('choices', [])
        if not choices:
            return 500, {'error': 'No response from AI'}

        prompt = choices[0].get('message', {}).get('content', '')
        return 200, {'prompt': prompt}

    except httpx.TimeoutException:
        return 500, {'error': 'Request timeout'}
    except Exception as e:
        return 500, {'error': f'Error generating prompt: {str(e)}'}


@router.get('/helpers/{helper_id}', response={200: HelperSchema, 404: ErrorSchema})
def get_helper(request, helper_id: int):
    """Get a helper by ID"""
    helper = get_object_or_404(Helper, id=helper_id, user=request.user)
    return 200, helper


@router.put('/helpers/{helper_id}', response={200: HelperSchema, 404: ErrorSchema})
def update_helper(request, helper_id: int, data: HelperUpdateSchema):
    """Update a helper"""
    helper = get_object_or_404(Helper, id=helper_id, user=request.user)

    if data.name is not None:
        helper.name = data.name
    if data.icon is not None:
        helper.icon = data.icon
    if data.description is not None:
        helper.description = data.description
    if data.system_prompt is not None:
        helper.system_prompt = data.system_prompt
    if data.enabled_tools is not None:
        helper.enabled_tools = data.enabled_tools

    helper.save()
    return 200, helper


@router.delete('/helpers/{helper_id}', response={204: None, 404: ErrorSchema})
def delete_helper(request, helper_id: int):
    """Delete a helper"""
    helper = get_object_or_404(Helper, id=helper_id, user=request.user)

    # Don't allow deletion of default helper
    if helper.is_default:
        return 400, {'error': 'Cannot delete default helper'}

    helper.delete()
    return 204, None
