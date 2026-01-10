from django.db import models
from django.conf import settings
import subprocess
import json


class Folder(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='folders')
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    show_in_sidebar = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name', 'parent']

    def __str__(self):
        return self.name


class Document(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/%Y/%m/')
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    duration = models.FloatField(null=True, blank=True)  # Duration in seconds for video/audio
    description = models.TextField(blank=True)

    # Optional links to other entities
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    invoice = models.ForeignKey('invoices.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def _extract_duration(self, file_path: str) -> float | None:
        """Extract duration from video/audio file using ffprobe"""
        try:
            result = subprocess.run(
                [
                    'ffprobe', '-v', 'quiet', '-print_format', 'json',
                    '-show_format', file_path
                ],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                duration = data.get('format', {}).get('duration')
                if duration:
                    return float(duration)
        except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError, ValueError):
            pass
        return None

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            # Get file extension
            name = self.file.name
            if '.' in name:
                self.file_type = name.split('.')[-1].lower()

        # Save first to ensure file is written to disk
        super().save(*args, **kwargs)

        # Extract duration for video/audio files
        if self.file and self.file_type in ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'm4a']:
            if self.duration is None:
                duration = self._extract_duration(self.file.path)
                if duration:
                    self.duration = duration
                    # Save again with duration (avoid recursion by using update)
                    Document.objects.filter(pk=self.pk).update(duration=duration)


class TextStyleFavorite(models.Model):
    """Text style preset for the Image Editor"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='text_style_favorites')
    name = models.CharField(max_length=100)
    font_family = models.CharField(max_length=100, default='SF Pro Display')
    font_size = models.PositiveIntegerField(default=48)
    font_weight = models.PositiveIntegerField(default=400)
    font_color = models.CharField(max_length=20, default='#ffffff')
    text_align = models.CharField(max_length=10, default='center')  # left, center, right
    text_effects = models.JSONField(default=dict)  # Store shadow, outline, glow, curve settings
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class LayerAsset(models.Model):
    """Saved layer/graphic asset for the Image Editor library"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='layer_assets')
    name = models.CharField(max_length=100)
    # Store the full image as base64 data URL
    image_data = models.TextField()
    # Store a smaller thumbnail for preview (base64)
    thumbnail = models.TextField(blank=True)
    # Original dimensions
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    # Optional category for organization
    category = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"
