from django.db import models
from django.conf import settings
import json


class VideoProject(models.Model):
    """Stores video project metadata on the server for export processing"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='video_projects')
    project_id = models.CharField(max_length=100, unique=True)  # Client-side UUID
    name = models.CharField(max_length=255)

    # Project settings stored as JSON
    resolution_width = models.IntegerField(default=1920)
    resolution_height = models.IntegerField(default=1080)
    frame_rate = models.IntegerField(default=30)
    duration = models.IntegerField(default=0)  # milliseconds

    # Full project data as JSON (tracks, clips, effects, keyframes)
    project_data = models.JSONField(default=dict)

    # Thumbnail for preview
    thumbnail = models.ImageField(upload_to='videoeditor/thumbnails/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class ExportJob(models.Model):
    """Tracks video export jobs processed by FFmpeg"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    FORMAT_CHOICES = [
        ('mp4', 'MP4 (H.264)'),
        ('webm', 'WebM (VP9)'),
    ]

    RESOLUTION_CHOICES = [
        ('720p', '1280x720'),
        ('1080p', '1920x1080'),
        ('4k', '3840x2160'),
    ]

    QUALITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='export_jobs')
    project = models.ForeignKey(VideoProject, on_delete=models.CASCADE, related_name='export_jobs')

    # Export settings
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='mp4')
    resolution = models.CharField(max_length=10, choices=RESOLUTION_CHOICES, default='1080p')
    frame_rate = models.IntegerField(default=30)
    quality = models.CharField(max_length=10, choices=QUALITY_CHOICES, default='medium')

    # Job status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)  # 0-100
    error_message = models.TextField(blank=True)

    # Output file
    output_file = models.FileField(upload_to='videoeditor/exports/', null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Export {self.id} - {self.project.name} ({self.status})"

    def get_resolution_dimensions(self):
        """Return width, height tuple for the selected resolution"""
        resolutions = {
            '720p': (1280, 720),
            '1080p': (1920, 1080),
            '4k': (3840, 2160),
        }
        return resolutions.get(self.resolution, (1920, 1080))

    def get_crf_value(self):
        """Return FFmpeg CRF value based on quality setting"""
        # Lower CRF = better quality, larger file
        crf_values = {
            'low': 28,
            'medium': 23,
            'high': 18,
        }
        return crf_values.get(self.quality, 23)


class MediaFile(models.Model):
    """Server-side storage for media files used in projects"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='video_media_files')
    project = models.ForeignKey(VideoProject, on_delete=models.CASCADE, related_name='media_files', null=True, blank=True)

    # Original file reference (can be from Documents app)
    document = models.ForeignKey('documents.Document', on_delete=models.SET_NULL, null=True, blank=True)

    # File info
    file = models.FileField(upload_to='videoeditor/media/')
    original_name = models.CharField(max_length=255)
    media_type = models.CharField(max_length=20)  # video, audio, image
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()

    # Media metadata
    duration = models.IntegerField(null=True, blank=True)  # milliseconds
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    frame_rate = models.FloatField(null=True, blank=True)

    # Client-side asset ID for mapping
    client_asset_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.original_name} ({self.media_type})"
