import os
import subprocess
import tempfile
import json
from datetime import datetime
from typing import List, Optional

from ninja import Router, Schema, File
from ninja.files import UploadedFile
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from django.conf import settings

from .models import VideoProject, ExportJob, MediaFile

router = Router()


# === Schemas ===

class ProjectSettingsSchema(Schema):
    resolution_width: int = 1920
    resolution_height: int = 1080
    frame_rate: int = 30


class ProjectDataSchema(Schema):
    project_id: str
    name: str
    duration: int
    resolution: dict
    frame_rate: int
    tracks: list


class ProjectCreateSchema(Schema):
    project_id: str
    name: str
    duration: int = 0
    resolution_width: int = 1920
    resolution_height: int = 1080
    frame_rate: int = 30
    project_data: dict = {}


class ProjectUpdateSchema(Schema):
    name: Optional[str] = None
    duration: Optional[int] = None
    project_data: Optional[dict] = None


class ProjectSchema(Schema):
    id: int
    project_id: str
    name: str
    resolution_width: int
    resolution_height: int
    frame_rate: int
    duration: int
    created_at: datetime
    updated_at: datetime


class ExportSettingsSchema(Schema):
    format: str = 'mp4'
    resolution: str = '1080p'
    frame_rate: int = 30
    quality: str = 'medium'


class ExportCreateSchema(Schema):
    project_id: str
    format: str = 'mp4'
    resolution: str = '1080p'
    frame_rate: int = 30
    quality: str = 'medium'


class ExportJobSchema(Schema):
    id: int
    project_id: str
    format: str
    resolution: str
    frame_rate: int
    quality: str
    status: str
    progress: int
    error_message: str
    file_size: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class MediaFileSchema(Schema):
    id: int
    original_name: str
    media_type: str
    mime_type: str
    file_size: int
    duration: Optional[int]
    width: Optional[int]
    height: Optional[int]
    client_asset_id: str
    created_at: datetime


# === Project Endpoints ===

@router.get('/projects', response=List[ProjectSchema])
def list_projects(request):
    """List all video projects for the current user"""
    projects = VideoProject.objects.filter(user=request.user)
    return projects


@router.get('/projects/{project_id}', response=ProjectSchema)
def get_project(request, project_id: str):
    """Get a specific project by client ID"""
    project = get_object_or_404(VideoProject, project_id=project_id, user=request.user)
    return project


@router.get('/projects/{project_id}/data')
def get_project_data(request, project_id: str):
    """Get full project data including tracks and clips"""
    project = get_object_or_404(VideoProject, project_id=project_id, user=request.user)
    return {
        'project_id': project.project_id,
        'name': project.name,
        'duration': project.duration,
        'resolution': {
            'width': project.resolution_width,
            'height': project.resolution_height,
        },
        'frame_rate': project.frame_rate,
        'tracks': project.project_data.get('tracks', []),
        'created_at': project.created_at.isoformat(),
        'updated_at': project.updated_at.isoformat(),
    }


@router.post('/projects', response=ProjectSchema)
def create_project(request, data: ProjectCreateSchema):
    """Create a new video project"""
    project = VideoProject.objects.create(
        user=request.user,
        project_id=data.project_id,
        name=data.name,
        duration=data.duration,
        resolution_width=data.resolution_width,
        resolution_height=data.resolution_height,
        frame_rate=data.frame_rate,
        project_data=data.project_data,
    )
    return project


@router.put('/projects/{project_id}', response=ProjectSchema)
def update_project(request, project_id: str, data: ProjectUpdateSchema):
    """Update an existing project"""
    project = get_object_or_404(VideoProject, project_id=project_id, user=request.user)

    if data.name is not None:
        project.name = data.name
    if data.duration is not None:
        project.duration = data.duration
    if data.project_data is not None:
        project.project_data = data.project_data

    project.save()
    return project


@router.delete('/projects/{project_id}')
def delete_project(request, project_id: str):
    """Delete a project and associated media files"""
    project = get_object_or_404(VideoProject, project_id=project_id, user=request.user)
    project.delete()
    return {'success': True}


# === Export Endpoints ===

@router.post('/export', response=ExportJobSchema)
def create_export_job(request, data: ExportCreateSchema):
    """Create a new export job for a project"""
    project = get_object_or_404(VideoProject, project_id=data.project_id, user=request.user)

    # Check for existing pending/processing jobs
    existing = ExportJob.objects.filter(
        project=project,
        status__in=['pending', 'processing']
    ).first()
    if existing:
        return existing

    job = ExportJob.objects.create(
        user=request.user,
        project=project,
        format=data.format,
        resolution=data.resolution,
        frame_rate=data.frame_rate,
        quality=data.quality,
        status='pending',
    )

    # TODO: Trigger async export task here
    # For now, mark as pending for manual processing
    # In production, use Celery or similar task queue

    return job


@router.get('/export/{job_id}', response=ExportJobSchema)
def get_export_status(request, job_id: int):
    """Get the status of an export job"""
    job = get_object_or_404(ExportJob, id=job_id, user=request.user)
    return job


@router.get('/export', response=List[ExportJobSchema])
def list_export_jobs(request, project_id: Optional[str] = None):
    """List all export jobs, optionally filtered by project"""
    jobs = ExportJob.objects.filter(user=request.user)
    if project_id:
        jobs = jobs.filter(project__project_id=project_id)
    return jobs


@router.post('/export/{job_id}/cancel')
def cancel_export(request, job_id: int):
    """Cancel a pending or processing export job"""
    job = get_object_or_404(ExportJob, id=job_id, user=request.user)

    if job.status in ['pending', 'processing']:
        job.status = 'cancelled'
        job.save()
        return {'success': True, 'message': 'Export cancelled'}

    return {'success': False, 'message': f'Cannot cancel job with status: {job.status}'}


@router.get('/export/{job_id}/download')
def download_export(request, job_id: int):
    """Download the exported video file"""
    job = get_object_or_404(ExportJob, id=job_id, user=request.user)

    if job.status != 'completed' or not job.output_file:
        return HttpResponse('Export not ready', status=400)

    response = FileResponse(
        job.output_file.open('rb'),
        content_type='video/mp4' if job.format == 'mp4' else 'video/webm'
    )
    response['Content-Disposition'] = f'attachment; filename="{job.project.name}.{job.format}"'
    return response


# === Media File Endpoints ===

@router.post('/media', response=MediaFileSchema)
def upload_media(request, file: UploadedFile = File(...), project_id: str = None, client_asset_id: str = ''):
    """Upload a media file for use in video projects"""
    # Determine media type from mime type
    mime_type = file.content_type or 'application/octet-stream'
    if mime_type.startswith('video/'):
        media_type = 'video'
    elif mime_type.startswith('audio/'):
        media_type = 'audio'
    elif mime_type.startswith('image/'):
        media_type = 'image'
    else:
        media_type = 'unknown'

    # Get project if specified
    project = None
    if project_id:
        project = get_object_or_404(VideoProject, project_id=project_id, user=request.user)

    # Create media file record
    media_file = MediaFile.objects.create(
        user=request.user,
        project=project,
        file=file,
        original_name=file.name,
        media_type=media_type,
        mime_type=mime_type,
        file_size=file.size,
        client_asset_id=client_asset_id,
    )

    # Extract metadata using ffprobe if available
    try:
        _extract_media_metadata(media_file)
    except Exception:
        pass  # Continue even if metadata extraction fails

    return media_file


@router.get('/media', response=List[MediaFileSchema])
def list_media(request, project_id: Optional[str] = None):
    """List all media files, optionally filtered by project"""
    files = MediaFile.objects.filter(user=request.user)
    if project_id:
        files = files.filter(project__project_id=project_id)
    return files


@router.delete('/media/{media_id}')
def delete_media(request, media_id: int):
    """Delete a media file"""
    media_file = get_object_or_404(MediaFile, id=media_id, user=request.user)
    media_file.file.delete()
    media_file.delete()
    return {'success': True}


# === Helper Functions ===

def _extract_media_metadata(media_file: MediaFile):
    """Extract duration, dimensions, and frame rate from media file using ffprobe"""
    file_path = media_file.file.path

    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            data = json.loads(result.stdout)

            # Get duration from format
            if 'format' in data and 'duration' in data['format']:
                media_file.duration = int(float(data['format']['duration']) * 1000)

            # Get video stream info
            for stream in data.get('streams', []):
                if stream.get('codec_type') == 'video':
                    media_file.width = stream.get('width')
                    media_file.height = stream.get('height')

                    # Calculate frame rate from r_frame_rate (e.g., "30/1")
                    r_frame_rate = stream.get('r_frame_rate', '0/1')
                    if '/' in r_frame_rate:
                        num, den = map(int, r_frame_rate.split('/'))
                        if den > 0:
                            media_file.frame_rate = num / den
                    break

            media_file.save()

    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        pass  # ffprobe not available or failed
