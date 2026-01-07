import os
import re
from ninja import Router, File, Schema
from ninja.files import UploadedFile
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime

from .models import Folder, Document
from .signals import create_default_folders_for_user

router = Router()

# File upload constraints
MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024  # 10 GB
ALLOWED_EXTENSIONS = {
    # Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.odt', '.ods',
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
    # Audio
    '.mp3', '.wav', '.ogg', '.webm', '.m4a', '.flac',
    # Video
    '.mp4', '.avi', '.mov', '.mkv', '.wmv',
    # Archives
    '.zip', '.rar', '.7z', '.tar', '.gz',
}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special chars"""
    # Get base name (remove path)
    filename = os.path.basename(filename)
    # Replace potentially dangerous characters
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    # Remove multiple consecutive underscores/spaces
    filename = re.sub(r'[\s_]+', '_', filename)
    # Limit length
    name, ext = os.path.splitext(filename)
    if len(name) > 100:
        name = name[:100]
    return f"{name}{ext}"


def validate_file(file: UploadedFile) -> tuple[bool, str]:
    """Validate uploaded file. Returns (is_valid, error_message)"""
    # Check file size
    if file.size > MAX_FILE_SIZE:
        return False, f'Datei zu groß. Maximum: {MAX_FILE_SIZE // (1024*1024*1024)} GB'

    # Check extension
    _, ext = os.path.splitext(file.name.lower())
    if ext not in ALLOWED_EXTENSIONS:
        return False, f'Dateityp nicht erlaubt: {ext}'

    return True, ''


# Schemas
class FolderSchema(Schema):
    id: int
    name: str
    parent_id: Optional[int]
    show_in_sidebar: bool
    created_at: datetime


class FolderCreateSchema(Schema):
    name: str
    parent_id: Optional[int] = None
    show_in_sidebar: Optional[bool] = True


class DocumentSchema(Schema):
    id: int
    name: str
    folder_id: Optional[int]
    file_url: str
    file_type: str
    file_size: int
    duration: Optional[float]  # Duration in seconds for video/audio
    description: str
    customer_id: Optional[int]
    invoice_id: Optional[int]
    created_at: datetime

    @staticmethod
    def resolve_file_url(obj):
        if obj.file:
            return obj.file.url
        return ''


class DocumentUpdateSchema(Schema):
    name: Optional[str] = None
    folder_id: Optional[int] = None
    description: Optional[str] = None


class ErrorSchema(Schema):
    error: str


# Folder endpoints
@router.post('/folders/init-defaults', response=List[FolderSchema])
def init_default_folders(request):
    """Create default folders for the current user if they don't exist"""
    created = create_default_folders_for_user(request.user)
    # Return all root folders
    return Folder.objects.filter(user=request.user, parent__isnull=True)


@router.get('/folders/', response=List[FolderSchema])
def list_folders(request, parent_id: Optional[int] = None):
    """List all folders for the current user"""
    folders = Folder.objects.filter(user=request.user)
    if parent_id is not None:
        folders = folders.filter(parent_id=parent_id)
    else:
        folders = folders.filter(parent__isnull=True)
    return folders


@router.post('/folders/', response={201: FolderSchema, 400: ErrorSchema})
def create_folder(request, data: FolderCreateSchema):
    """Create a new folder"""
    # Check if parent folder exists and belongs to user
    parent = None
    if data.parent_id:
        parent = get_object_or_404(Folder, id=data.parent_id, user=request.user)

    folder = Folder.objects.create(
        user=request.user,
        name=data.name,
        parent=parent,
        show_in_sidebar=data.show_in_sidebar if data.show_in_sidebar is not None else True
    )
    return 201, folder


@router.put('/folders/{folder_id}', response={200: FolderSchema, 404: ErrorSchema})
def update_folder(request, folder_id: int, data: FolderCreateSchema):
    """Update a folder"""
    folder = get_object_or_404(Folder, id=folder_id, user=request.user)
    folder.name = data.name
    if data.parent_id:
        folder.parent = get_object_or_404(Folder, id=data.parent_id, user=request.user)
    else:
        folder.parent = None
    if data.show_in_sidebar is not None:
        folder.show_in_sidebar = data.show_in_sidebar
    folder.save()
    return folder


@router.delete('/folders/{folder_id}', response={204: None, 404: ErrorSchema})
def delete_folder(request, folder_id: int):
    """Delete a folder and all its contents"""
    folder = get_object_or_404(Folder, id=folder_id, user=request.user)
    folder.delete()
    return 204, None


# Document endpoints
@router.get('/', response=List[DocumentSchema])
def list_documents(request, folder_id: Optional[int] = None, search: str = ''):
    """List all documents for the current user"""
    docs = Document.objects.filter(user=request.user).select_related('folder')

    if folder_id is not None:
        docs = docs.filter(folder_id=folder_id)
    elif folder_id is None and not search:
        # Root level - no folder
        docs = docs.filter(folder__isnull=True)

    if search:
        docs = docs.filter(name__icontains=search)

    return docs


@router.post('/', response={201: DocumentSchema, 400: ErrorSchema})
def upload_document(request, file: UploadedFile = File(...), folder_id: Optional[int] = None, description: str = ''):
    """Upload a new document"""
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        return 400, {'error': error_msg}

    # Sanitize filename
    safe_name = sanitize_filename(file.name)

    folder = None
    if folder_id:
        folder = get_object_or_404(Folder, id=folder_id, user=request.user)

    doc = Document.objects.create(
        user=request.user,
        folder=folder,
        name=safe_name,
        file=file,
        description=description
    )
    return 201, doc


@router.get('/{document_id}', response={200: DocumentSchema, 404: ErrorSchema})
def get_document(request, document_id: int):
    """Get a single document"""
    doc = get_object_or_404(Document, id=document_id, user=request.user)
    return doc


@router.put('/{document_id}', response={200: DocumentSchema, 404: ErrorSchema})
def update_document(request, document_id: int, data: DocumentUpdateSchema):
    """Update a document"""
    doc = get_object_or_404(Document, id=document_id, user=request.user)

    if data.name is not None:
        doc.name = data.name
    if data.folder_id is not None:
        doc.folder = get_object_or_404(Folder, id=data.folder_id, user=request.user)
    elif data.folder_id is None:
        doc.folder = None
    if data.description is not None:
        doc.description = data.description

    doc.save()
    return doc


@router.delete('/{document_id}', response={204: None, 404: ErrorSchema})
def delete_document(request, document_id: int):
    """Delete a document"""
    doc = get_object_or_404(Document, id=document_id, user=request.user)
    # Delete the file from storage
    if doc.file:
        doc.file.delete(save=False)
    doc.delete()
    return 204, None
