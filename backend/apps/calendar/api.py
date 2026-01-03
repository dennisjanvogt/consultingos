from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.conf import settings
from typing import List, Optional
from datetime import date, time, datetime

from .models import CalendarEvent, EventInvitation

router = Router()


# Schemas
class InvitationSchema(Schema):
    id: int
    email: str
    name: str
    status: str
    invited_at: datetime


class CalendarEventSchema(Schema):
    id: int
    title: str
    date: date
    start_time: str
    end_time: str
    location: str
    description: str
    color: str
    customer_id: Optional[int]
    is_meeting: bool
    meeting_link: Optional[str]
    invitations: List[InvitationSchema]
    created_at: datetime

    @staticmethod
    def resolve_start_time(obj):
        return obj.start_time.strftime('%H:%M')

    @staticmethod
    def resolve_end_time(obj):
        return obj.end_time.strftime('%H:%M')

    @staticmethod
    def resolve_meeting_link(obj):
        if obj.is_meeting and obj.meeting_id:
            jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
            return f"https://{jitsi_domain}/{obj.meeting_id}"
        return None

    @staticmethod
    def resolve_invitations(obj):
        return obj.invitations.all()


class CalendarEventCreateSchema(Schema):
    title: str
    date: date
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    location: Optional[str] = ''
    description: Optional[str] = ''
    color: Optional[str] = 'blue'
    customer_id: Optional[int] = None
    is_meeting: Optional[bool] = False


class InvitationCreateSchema(Schema):
    email: str
    name: Optional[str] = ''


class CalendarEventUpdateSchema(Schema):
    title: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    customer_id: Optional[int] = None
    is_meeting: Optional[bool] = None


class ErrorSchema(Schema):
    error: str


def parse_time(time_str: str) -> time:
    """Parse HH:MM string to time object"""
    hours, minutes = map(int, time_str.split(':'))
    return time(hours, minutes)


# Endpoints
@router.get('/', response=List[CalendarEventSchema])
def list_events(request, start_date: Optional[date] = None, end_date: Optional[date] = None):
    """List all calendar events for the current user"""
    events = CalendarEvent.objects.filter(user=request.user)

    if start_date:
        events = events.filter(date__gte=start_date)
    if end_date:
        events = events.filter(date__lte=end_date)

    return events


@router.post('/', response={201: CalendarEventSchema, 400: ErrorSchema})
def create_event(request, data: CalendarEventCreateSchema):
    """Create a new calendar event"""
    event = CalendarEvent.objects.create(
        user=request.user,
        title=data.title,
        date=data.date,
        start_time=parse_time(data.start_time),
        end_time=parse_time(data.end_time),
        location=data.location or '',
        description=data.description or '',
        color=data.color or 'blue',
        customer_id=data.customer_id,
        is_meeting=data.is_meeting or False
    )
    if event.is_meeting:
        event.generate_meeting_id()
    return 201, event


@router.get('/{event_id}', response={200: CalendarEventSchema, 404: ErrorSchema})
def get_event(request, event_id: int):
    """Get a single calendar event"""
    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
    return event


@router.put('/{event_id}', response={200: CalendarEventSchema, 404: ErrorSchema})
def update_event(request, event_id: int, data: CalendarEventUpdateSchema):
    """Update a calendar event"""
    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)

    if data.title is not None:
        event.title = data.title
    if data.date is not None:
        event.date = data.date
    if data.start_time is not None:
        event.start_time = parse_time(data.start_time)
    if data.end_time is not None:
        event.end_time = parse_time(data.end_time)
    if data.location is not None:
        event.location = data.location
    if data.description is not None:
        event.description = data.description
    if data.color is not None:
        event.color = data.color
    if data.customer_id is not None:
        event.customer_id = data.customer_id
    if data.is_meeting is not None:
        event.is_meeting = data.is_meeting
        if event.is_meeting and not event.meeting_id:
            event.generate_meeting_id()

    event.save()
    return event


@router.delete('/{event_id}', response={204: None, 404: ErrorSchema})
def delete_event(request, event_id: int):
    """Delete a calendar event"""
    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
    event.delete()
    return 204, None


# Meeting & Invitation Endpoints
@router.post('/{event_id}/meeting', response={200: CalendarEventSchema, 404: ErrorSchema})
def enable_meeting(request, event_id: int):
    """Enable meeting for an event and generate meeting link"""
    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
    event.is_meeting = True
    event.generate_meeting_id()
    return event


@router.post('/{event_id}/invite', response={201: InvitationSchema, 400: ErrorSchema, 404: ErrorSchema})
def invite_attendee(request, event_id: int, data: InvitationCreateSchema):
    """Invite a person to the meeting via email"""
    from .services import send_invitation_email

    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)

    if not event.is_meeting:
        return 400, {'error': 'Event ist kein Meeting'}

    # Check if already invited
    if EventInvitation.objects.filter(event=event, email=data.email).exists():
        return 400, {'error': 'Diese E-Mail wurde bereits eingeladen'}

    invitation = EventInvitation.objects.create(
        event=event,
        email=data.email,
        name=data.name or ''
    )

    # Send invitation email
    send_invitation_email(invitation, event)

    return 201, invitation


@router.get('/{event_id}/invitations', response=List[InvitationSchema])
def list_invitations(request, event_id: int):
    """List all invitations for an event"""
    event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
    return event.invitations.all()


@router.delete('/invitation/{invitation_id}', response={204: None, 404: ErrorSchema})
def remove_invitation(request, invitation_id: int):
    """Remove an invitation"""
    invitation = get_object_or_404(EventInvitation, id=invitation_id, event__user=request.user)
    invitation.delete()
    return 204, None


# Public endpoint (no authentication required)
class MeetingInfoSchema(Schema):
    event_title: str
    event_date: date
    event_start_time: str
    event_end_time: str
    event_location: str
    event_description: str
    meeting_link: str
    host_name: str


@router.get('/join/{token}', response={200: MeetingInfoSchema, 404: ErrorSchema}, auth=None)
def get_meeting_info(request, token: str):
    """Get meeting info for invited guest (public endpoint)"""
    invitation = get_object_or_404(EventInvitation, invitation_token=token)
    event = invitation.event

    if not event.is_meeting or not event.meeting_id:
        return 404, {'error': 'Meeting nicht gefunden'}

    jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')

    return {
        'event_title': event.title,
        'event_date': event.date,
        'event_start_time': event.start_time.strftime('%H:%M'),
        'event_end_time': event.end_time.strftime('%H:%M'),
        'event_location': event.location,
        'event_description': event.description,
        'meeting_link': f"https://{jitsi_domain}/{event.meeting_id}",
        'host_name': event.user.get_full_name() or event.user.email
    }
