from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime

from .models import Diagram

router = Router()


# Schemas
class DiagramListSchema(Schema):
    id: int
    title: str
    thumbnail: str
    created_at: datetime
    updated_at: datetime


class DiagramSchema(Schema):
    id: int
    title: str
    content: dict
    thumbnail: str
    created_at: datetime
    updated_at: datetime


class DiagramCreateSchema(Schema):
    title: Optional[str] = 'Untitled'
    content: Optional[dict] = None


class DiagramUpdateSchema(Schema):
    title: Optional[str] = None
    content: Optional[dict] = None
    thumbnail: Optional[str] = None


class ErrorSchema(Schema):
    error: str


# Endpoints
@router.get('/', response=List[DiagramListSchema])
def list_diagrams(request):
    """List all diagrams for the current user"""
    return Diagram.objects.filter(user=request.user)


@router.post('/', response={201: DiagramSchema, 400: ErrorSchema})
def create_diagram(request, data: DiagramCreateSchema):
    """Create a new diagram"""
    diagram = Diagram.objects.create(
        user=request.user,
        title=data.title or 'Untitled',
        content=data.content or {}
    )
    return 201, diagram


@router.get('/{diagram_id}', response={200: DiagramSchema, 404: ErrorSchema})
def get_diagram(request, diagram_id: int):
    """Get a single diagram with full content"""
    diagram = get_object_or_404(Diagram, id=diagram_id, user=request.user)
    return diagram


@router.put('/{diagram_id}', response={200: DiagramSchema, 404: ErrorSchema})
def update_diagram(request, diagram_id: int, data: DiagramUpdateSchema):
    """Update a diagram"""
    diagram = get_object_or_404(Diagram, id=diagram_id, user=request.user)

    if data.title is not None:
        diagram.title = data.title
    if data.content is not None:
        diagram.content = data.content
    if data.thumbnail is not None:
        diagram.thumbnail = data.thumbnail

    diagram.save()
    return diagram


@router.delete('/{diagram_id}', response={204: None, 404: ErrorSchema})
def delete_diagram(request, diagram_id: int):
    """Delete a diagram"""
    diagram = get_object_or_404(Diagram, id=diagram_id, user=request.user)
    diagram.delete()
    return 204, None
