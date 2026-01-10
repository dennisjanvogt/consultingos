from django.db import models
from django.conf import settings


class ImageProject(models.Model):
    """Stores image editor project data"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='image_projects')
    project_id = models.CharField(max_length=100)  # Client-side UUID
    name = models.CharField(max_length=255)

    # Project settings
    width = models.IntegerField(default=1920)
    height = models.IntegerField(default=1080)

    # Full project data as JSON (layers, filters, etc.)
    project_data = models.JSONField(default=dict)

    # Thumbnail for preview (base64 or URL)
    thumbnail = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ['user', 'project_id']

    def __str__(self):
        return f"{self.name} ({self.user.email})"
