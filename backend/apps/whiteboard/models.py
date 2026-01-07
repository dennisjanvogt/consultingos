from django.db import models
from django.conf import settings


class WhiteboardProject(models.Model):
    """Project/folder for organizing diagrams"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='whiteboard_projects')
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Diagram(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='diagrams')
    project = models.ForeignKey(WhiteboardProject, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagrams')
    title = models.CharField(max_length=200, default='Untitled')
    content = models.JSONField(default=dict)
    thumbnail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.user.username})"
