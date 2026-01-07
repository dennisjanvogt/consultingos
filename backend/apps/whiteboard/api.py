from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime

from .models import Diagram, WhiteboardProject

router = Router()


# Schemas
class ProjectSchema(Schema):
    id: int
    name: str
    diagram_count: int
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_diagram_count(obj):
        return obj.diagrams.count()


class ProjectCreateSchema(Schema):
    name: str


class ProjectUpdateSchema(Schema):
    name: Optional[str] = None


class DiagramListSchema(Schema):
    id: int
    title: str
    thumbnail: str
    project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DiagramSchema(Schema):
    id: int
    title: str
    content: dict
    thumbnail: str
    project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DiagramCreateSchema(Schema):
    title: Optional[str] = 'Untitled'
    content: Optional[dict] = None
    project_id: Optional[int] = None


class DiagramUpdateSchema(Schema):
    title: Optional[str] = None
    content: Optional[dict] = None
    thumbnail: Optional[str] = None
    project_id: Optional[int] = None


class ErrorSchema(Schema):
    error: str


# Project Endpoints
@router.get('/projects', response=List[ProjectSchema])
def list_projects(request):
    """List all projects for the current user"""
    return WhiteboardProject.objects.filter(user=request.user)


@router.post('/projects', response={201: ProjectSchema, 400: ErrorSchema})
def create_project(request, data: ProjectCreateSchema):
    """Create a new project"""
    project = WhiteboardProject.objects.create(
        user=request.user,
        name=data.name
    )
    return 201, project


@router.put('/projects/{project_id}', response={200: ProjectSchema, 404: ErrorSchema})
def update_project(request, project_id: int, data: ProjectUpdateSchema):
    """Update a project"""
    project = get_object_or_404(WhiteboardProject, id=project_id, user=request.user)
    if data.name is not None:
        project.name = data.name
    project.save()
    return project


@router.delete('/projects/{project_id}', response={204: None, 404: ErrorSchema})
def delete_project(request, project_id: int):
    """Delete a project (diagrams become ungrouped)"""
    project = get_object_or_404(WhiteboardProject, id=project_id, user=request.user)
    project.delete()
    return 204, None


# Diagram Endpoints
@router.get('/', response=List[DiagramListSchema])
def list_diagrams(request, project_id: Optional[int] = None):
    """List diagrams. If project_id is provided, filter by project. Use project_id=0 for ungrouped."""
    qs = Diagram.objects.filter(user=request.user)
    if project_id is not None:
        if project_id == 0:
            qs = qs.filter(project__isnull=True)
        else:
            qs = qs.filter(project_id=project_id)
    return qs


@router.post('/', response={201: DiagramSchema, 400: ErrorSchema})
def create_diagram(request, data: DiagramCreateSchema):
    """Create a new diagram"""
    project = None
    if data.project_id:
        project = get_object_or_404(WhiteboardProject, id=data.project_id, user=request.user)

    diagram = Diagram.objects.create(
        user=request.user,
        title=data.title or 'Untitled',
        content=data.content or {},
        project=project
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
    if data.project_id is not None:
        if data.project_id == 0:
            diagram.project = None
        else:
            diagram.project = get_object_or_404(WhiteboardProject, id=data.project_id, user=request.user)

    diagram.save()
    return diagram


@router.delete('/{diagram_id}', response={204: None, 404: ErrorSchema})
def delete_diagram(request, diagram_id: int):
    """Delete a diagram"""
    diagram = get_object_or_404(Diagram, id=diagram_id, user=request.user)
    diagram.delete()
    return 204, None
