from ninja import Router
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from typing import List, Optional
from pydantic import BaseModel
from .models import ImageProject
import json


router = Router()


class ProjectData(BaseModel):
    layers: list = []
    filters: dict = {}


class ProjectCreate(BaseModel):
    project_id: str
    name: str
    width: int = 1920
    height: int = 1080
    project_data: dict = {}
    thumbnail: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    project_data: Optional[dict] = None
    thumbnail: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    project_id: str
    name: str
    width: int
    height: int
    project_data: dict
    thumbnail: str
    created_at: str
    updated_at: str


class ProjectListOut(BaseModel):
    id: int
    project_id: str
    name: str
    width: int
    height: int
    thumbnail: str
    updated_at: str


@router.get("/projects", response=List[ProjectListOut])
def list_projects(request):
    """List all image editor projects for the current user"""
    if not request.user.is_authenticated:
        return []
    projects = ImageProject.objects.filter(user=request.user).order_by('-updated_at')
    return [
        ProjectListOut(
            id=p.id,
            project_id=p.project_id,
            name=p.name,
            width=p.width,
            height=p.height,
            thumbnail=p.thumbnail,
            updated_at=p.updated_at.isoformat(),
        )
        for p in projects
    ]


@router.get("/projects/{project_id}", response=ProjectOut)
def get_project(request, project_id: str):
    """Get a specific project by client-side project_id"""
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    project = get_object_or_404(ImageProject, user=request.user, project_id=project_id)
    return ProjectOut(
        id=project.id,
        project_id=project.project_id,
        name=project.name,
        width=project.width,
        height=project.height,
        project_data=project.project_data,
        thumbnail=project.thumbnail,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
    )


@router.post("/projects", response=ProjectOut)
def create_project(request, data: ProjectCreate):
    """Create a new image editor project"""
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    # Check if project with this ID already exists
    existing = ImageProject.objects.filter(user=request.user, project_id=data.project_id).first()
    if existing:
        # Update existing project
        existing.name = data.name
        existing.width = data.width
        existing.height = data.height
        existing.project_data = data.project_data
        existing.thumbnail = data.thumbnail
        existing.save()
        project = existing
    else:
        project = ImageProject.objects.create(
            user=request.user,
            project_id=data.project_id,
            name=data.name,
            width=data.width,
            height=data.height,
            project_data=data.project_data,
            thumbnail=data.thumbnail,
        )

    return ProjectOut(
        id=project.id,
        project_id=project.project_id,
        name=project.name,
        width=project.width,
        height=project.height,
        project_data=project.project_data,
        thumbnail=project.thumbnail,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
    )


@router.put("/projects/{project_id}", response=ProjectOut)
def update_project(request, project_id: str, data: ProjectUpdate):
    """Update an existing project"""
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    project = get_object_or_404(ImageProject, user=request.user, project_id=project_id)

    if data.name is not None:
        project.name = data.name
    if data.width is not None:
        project.width = data.width
    if data.height is not None:
        project.height = data.height
    if data.project_data is not None:
        project.project_data = data.project_data
    if data.thumbnail is not None:
        project.thumbnail = data.thumbnail

    project.save()

    return ProjectOut(
        id=project.id,
        project_id=project.project_id,
        name=project.name,
        width=project.width,
        height=project.height,
        project_data=project.project_data,
        thumbnail=project.thumbnail,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
    )


@router.delete("/projects/{project_id}")
def delete_project(request, project_id: str):
    """Delete a project"""
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    project = get_object_or_404(ImageProject, user=request.user, project_id=project_id)
    project.delete()
    return {"success": True}
