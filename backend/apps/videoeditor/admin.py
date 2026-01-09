from django.contrib import admin
from .models import VideoProject, ExportJob, MediaFile


@admin.register(VideoProject)
class VideoProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'resolution_width', 'resolution_height', 'frame_rate', 'updated_at']
    list_filter = ['user', 'frame_rate', 'created_at']
    search_fields = ['name', 'user__email']
    readonly_fields = ['project_id', 'created_at', 'updated_at']


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'user', 'format', 'resolution', 'quality', 'status', 'progress', 'created_at']
    list_filter = ['status', 'format', 'resolution', 'quality', 'created_at']
    search_fields = ['project__name', 'user__email']
    readonly_fields = ['created_at', 'started_at', 'completed_at']


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'user', 'media_type', 'file_size', 'created_at']
    list_filter = ['media_type', 'created_at']
    search_fields = ['original_name', 'user__email']
