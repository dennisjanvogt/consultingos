from django.db import models
from django.conf import settings
from django.utils import timezone


class Client(models.Model):
    """Kunde/Auftraggeber für Zeiterfassung"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='timetracking_clients'
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Project(models.Model):
    """Projekt gehört zu einem Kunden"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    COLOR_CHOICES = [
        ('gray', 'Gray'),
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('yellow', 'Yellow'),
        ('red', 'Red'),
        ('purple', 'Purple'),
        ('pink', 'Pink'),
        ('orange', 'Orange'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='timetracking_projects'
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='blue')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['client__name', 'name']

    def __str__(self):
        return f"{self.name} ({self.client.name})"


class TimeEntry(models.Model):
    """Zeiteintrag gehört zu einem Projekt"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_entries'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='time_entries'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField()  # Berechnet aus start/end
    description = models.TextField(blank=True)
    billable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-start_time']

    def __str__(self):
        return f"{self.project.name} - {self.date} ({self.duration_minutes} min)"

    def save(self, *args, **kwargs):
        # Berechne duration_minutes aus start_time und end_time
        from datetime import datetime, timedelta
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        if end < start:
            # Falls end_time vor start_time liegt (über Mitternacht)
            end += timedelta(days=1)
        self.duration_minutes = int((end - start).total_seconds() / 60)
        super().save(*args, **kwargs)


class ActiveTimer(models.Model):
    """
    Aktiver Timer für Zeiterfassung - nur einer pro User.
    Wird in der Datenbank gespeichert für Persistenz über Page-Refreshes
    und Cross-Device-Sync.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='active_timer',
        primary_key=True
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_timers'
    )
    description = models.CharField(max_length=500, blank=True, default='')
    start_time = models.BigIntegerField(null=True, blank=True)  # Unix timestamp in ms
    paused_time = models.BigIntegerField(default=0)  # Accumulated paused time in ms
    is_running = models.BooleanField(default=False)
    is_paused = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Active Timer'
        verbose_name_plural = 'Active Timers'

    def __str__(self):
        status = 'running' if self.is_running else ('paused' if self.is_paused else 'stopped')
        return f"Timer for {self.user} ({status})"
