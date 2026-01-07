from django.db import models
from django.conf import settings


class Note(models.Model):
    COLOR_CHOICES = [
        ('default', 'Default'),
        ('yellow', 'Yellow'),
        ('green', 'Green'),
        ('blue', 'Blue'),
        ('pink', 'Pink'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    title = models.CharField(max_length=255, blank=True, default='')
    content = models.TextField(blank=True, default='')
    is_pinned = models.BooleanField(default=False)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='default')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-updated_at']

    def __str__(self):
        return self.title or f'Note {self.id}'
