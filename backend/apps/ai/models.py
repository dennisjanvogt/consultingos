from django.db import models
from django.conf import settings


class Helper(models.Model):
    """AI Helper with custom system prompt and tool configuration"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_helpers'
    )
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🤖')
    description = models.CharField(max_length=255, blank=True, default='')
    system_prompt = models.TextField()
    enabled_tools = models.JSONField(default=list)  # List of tool names
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_helpers'
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f'{self.icon} {self.name}'


class Conversation(models.Model):
    """AI chat conversation"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_conversations'
    )
    helper = models.ForeignKey(
        Helper,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_conversations'
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.title[:50]}...' if len(self.title) > 50 else self.title


class Message(models.Model):
    """Message in an AI conversation"""

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    image_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_messages'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.role}: {self.content[:50]}...'
