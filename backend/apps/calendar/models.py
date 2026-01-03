from django.db import models
from django.conf import settings
import uuid


class CalendarEvent(models.Model):
    COLOR_CHOICES = [
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('red', 'Red'),
        ('yellow', 'Yellow'),
        ('purple', 'Purple'),
        ('orange', 'Orange'),
        ('pink', 'Pink'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calendar_events')
    title = models.CharField(max_length=255)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='blue')

    # Optional links to other entities
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='events')

    # Meeting fields
    is_meeting = models.BooleanField(default=False)
    meeting_id = models.CharField(max_length=100, blank=True, unique=True, null=True)
    meeting_password = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.title} - {self.date}"

    def generate_meeting_id(self):
        """Generate a unique meeting ID for Jitsi"""
        if not self.meeting_id:
            self.meeting_id = f"consultingos-{uuid.uuid4().hex[:12]}"
            self.save()
        return self.meeting_id

    @property
    def meeting_link(self):
        """Get the full Jitsi meeting URL"""
        if self.is_meeting and self.meeting_id:
            jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
            return f"https://{jitsi_domain}/{self.meeting_id}"
        return None


class EventInvitation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('accepted', 'Angenommen'),
        ('declined', 'Abgelehnt'),
    ]

    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    invitation_token = models.CharField(max_length=100, unique=True)
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['event', 'email']
        ordering = ['-invited_at']

    def __str__(self):
        return f"{self.email} - {self.event.title}"

    def save(self, *args, **kwargs):
        if not self.invitation_token:
            self.invitation_token = uuid.uuid4().hex
        super().save(*args, **kwargs)
