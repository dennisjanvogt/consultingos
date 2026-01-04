import os
import base64
import uuid
import httpx
from ninja import Router, Schema
from django.core.files.base import ContentFile
from typing import Optional

from apps.documents.models import Folder, Document

router = Router()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
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
    print(f'Using image model: {image_model}')

    try:
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

        return 500, {'error': 'Could not extract image from response. Model may not support image generation.'}

    except httpx.TimeoutException:
        return 500, {'error': 'Request timeout - image generation took too long'}
    except Exception as e:
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
