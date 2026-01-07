import os
from django.db import models
from django.conf import settings


class Expert(models.Model):
    """Ein Wissens-Experte mit eigenen Dokumenten und System-Prompt"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='experts'
    )
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='📚')
    description = models.TextField(blank=True)
    system_prompt = models.TextField(
        default='Du bist ein hilfreicher Experte. Beantworte Fragen basierend auf den bereitgestellten Dokumenten. Zitiere relevante Quellen.'
    )
    is_indexed = models.BooleanField(default=False)
    document_count = models.PositiveIntegerField(default=0)
    chunk_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Experte'
        verbose_name_plural = 'Experten'

    def __str__(self):
        return f"{self.icon} {self.name}"

    def update_counts(self):
        """Aktualisiert document_count und chunk_count"""
        self.document_count = self.documents.filter(status='completed').count()
        self.chunk_count = sum(
            doc.chunk_count for doc in self.documents.filter(status='completed')
        )
        self.is_indexed = self.chunk_count > 0
        self.save(update_fields=['document_count', 'chunk_count', 'is_indexed'])


class ExpertDocument(models.Model):
    """Ein Dokument das zu einem Experten gehört"""
    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('processing', 'Verarbeitung'),
        ('completed', 'Abgeschlossen'),
        ('failed', 'Fehlgeschlagen'),
    ]

    expert = models.ForeignKey(
        Expert,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='knowledgebase/%Y/%m/')
    file_type = models.CharField(max_length=20)  # 'pdf' oder 'txt'
    file_size = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    error_message = models.TextField(blank=True)
    page_count = models.PositiveIntegerField(default=0)
    chunk_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Experten-Dokument'
        verbose_name_plural = 'Experten-Dokumente'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.file and not self.file_type:
            _, ext = os.path.splitext(self.file.name.lower())
            self.file_type = ext.lstrip('.')
        if self.file and not self.file_size:
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Lösche auch alle zugehörigen Chunks aus der Vektor-DB
        expert = self.expert
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)
        expert.update_counts()


class DocumentChunk(models.Model):
    """Ein Text-Chunk aus einem Dokument für die Vektorsuche"""
    document = models.ForeignKey(
        ExpertDocument,
        on_delete=models.CASCADE,
        related_name='chunks'
    )
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    chroma_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['chunk_index']
        verbose_name = 'Dokument-Chunk'
        verbose_name_plural = 'Dokument-Chunks'
        indexes = [
            models.Index(fields=['chroma_id']),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} von {self.document.name}"


class ExpertConversation(models.Model):
    """Eine Chat-Konversation mit einem Experten"""
    expert = models.ForeignKey(
        Expert,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expert_conversations'
    )
    title = models.CharField(max_length=255, default='Neue Konversation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Experten-Konversation'
        verbose_name_plural = 'Experten-Konversationen'

    def __str__(self):
        return f"{self.title} ({self.expert.name})"


class ExpertMessage(models.Model):
    """Eine Nachricht in einer Experten-Konversation"""
    ROLE_CHOICES = [
        ('user', 'Benutzer'),
        ('assistant', 'Assistent'),
    ]

    conversation = models.ForeignKey(
        ExpertConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    source_chunks = models.JSONField(default=list, blank=True)  # Quellenreferenzen
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Experten-Nachricht'
        verbose_name_plural = 'Experten-Nachrichten'

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."
