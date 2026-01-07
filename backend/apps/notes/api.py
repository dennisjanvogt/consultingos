from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime

from .models import Note

router = Router()


# Schemas
class NoteSchema(Schema):
    id: int
    title: str
    content: str
    is_pinned: bool
    color: str
    created_at: datetime
    updated_at: datetime


class NoteCreateSchema(Schema):
    title: Optional[str] = ''
    content: str = ''
    color: Optional[str] = 'default'
    is_pinned: Optional[bool] = False


class NoteUpdateSchema(Schema):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None


class ErrorSchema(Schema):
    error: str


class SuccessSchema(Schema):
    success: bool


# Endpoints
@router.get('/', response=List[NoteSchema])
def list_notes(request, search: Optional[str] = None):
    """List all notes for the current user"""
    notes = Note.objects.filter(user=request.user)

    if search:
        notes = notes.filter(title__icontains=search) | notes.filter(content__icontains=search)

    return notes


@router.post('/', response={201: NoteSchema, 400: ErrorSchema})
def create_note(request, data: NoteCreateSchema):
    """Create a new note"""
    note = Note.objects.create(
        user=request.user,
        title=data.title or '',
        content=data.content or '',
        color=data.color or 'default',
        is_pinned=data.is_pinned or False,
    )
    return 201, note


@router.get('/{note_id}', response={200: NoteSchema, 404: ErrorSchema})
def get_note(request, note_id: int):
    """Get a single note"""
    note = get_object_or_404(Note, id=note_id, user=request.user)
    return note


@router.put('/{note_id}', response={200: NoteSchema, 404: ErrorSchema})
def update_note(request, note_id: int, data: NoteUpdateSchema):
    """Update a note"""
    note = get_object_or_404(Note, id=note_id, user=request.user)

    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
    if data.color is not None:
        note.color = data.color
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned

    note.save()
    return note


@router.delete('/{note_id}', response={200: SuccessSchema, 404: ErrorSchema})
def delete_note(request, note_id: int):
    """Delete a note"""
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.delete()
    return {'success': True}


@router.post('/{note_id}/pin', response={200: NoteSchema, 404: ErrorSchema})
def toggle_pin(request, note_id: int):
    """Toggle pin status of a note"""
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_pinned = not note.is_pinned
    note.save()
    return note
