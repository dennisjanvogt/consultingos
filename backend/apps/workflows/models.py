from django.db import models
from django.conf import settings


class WorkflowCategory(models.Model):
    """Kategorien für Workflow-Templates (z.B. Onboarding, Projektabschluss)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workflow_categories'
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='violet')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Workflow Categories'

    def __str__(self):
        return self.name


class WorkflowTemplate(models.Model):
    """Wiederverwendbare Workflow-Vorlage"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workflow_templates'
    )
    category = models.ForeignKey(
        WorkflowCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='templates'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class WorkflowTemplateStep(models.Model):
    """Schritt in einer Vorlage (2 Ebenen: parent=null = Oberpunkt)"""
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    position = models.IntegerField(default=0)
    default_days_offset = models.IntegerField(default=0)  # Tage nach Workflow-Start

    class Meta:
        ordering = ['position']

    def __str__(self):
        return self.title


class WorkflowInstance(models.Model):
    """Aktiver Workflow basierend auf Template"""
    STATUS_CHOICES = [
        ('active', 'Aktiv'),
        ('completed', 'Abgeschlossen'),
        ('paused', 'Pausiert'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workflow_instances'
    )
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )
    name = models.CharField(max_length=255)
    # Optionale Verknüpfungen
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_instances'
    )
    project = models.ForeignKey(
        'timetracking.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_instances'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return self.name

    @property
    def progress(self):
        """Berechnet den Fortschritt in Prozent"""
        steps = self.steps.all()
        if not steps:
            return 0
        completed = steps.filter(is_completed=True).count()
        return int((completed / steps.count()) * 100)


class WorkflowInstanceStep(models.Model):
    """Schritt in einem aktiven Workflow"""
    instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    template_step = models.ForeignKey(
        WorkflowTemplateStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    position = models.IntegerField(default=0)
    # Tracking
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return self.title
