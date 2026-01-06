from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from email.mime.base import MIMEBase
from email import encoders
import uuid
from datetime import datetime, timedelta


def generate_ics_content(event, invitation=None):
    """Generate ICS calendar file content for an event"""
    jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.dennis24.com')
    meeting_link = f"https://{jitsi_domain}/{event.meeting_id}" if event.is_meeting and event.meeting_id else ""

    # Create datetime objects
    event_start = datetime.combine(event.date, event.start_time)
    event_end = datetime.combine(event.date, event.end_time)

    # Format for ICS (UTC would be better, but local time works for simplicity)
    def format_datetime(dt):
        return dt.strftime('%Y%m%dT%H%M%S')

    # Generate unique UID
    uid = f"{event.id}-{uuid.uuid4().hex[:8]}@consultingos"

    # Build description
    description = event.description or ""
    if meeting_link:
        description = f"{description}\\n\\nMeeting-Link: {meeting_link}" if description else f"Meeting-Link: {meeting_link}"

    # Build location
    location = event.location or ""
    if meeting_link and not location:
        location = meeting_link

    # Organizer info
    organizer_name = event.user.get_full_name() or event.user.email
    organizer_email = event.user.email

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ConsultingOS//Meeting Invitation//DE
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{format_datetime(datetime.now())}
DTSTART:{format_datetime(event_start)}
DTEND:{format_datetime(event_end)}
SUMMARY:{event.title}
DESCRIPTION:{description}
LOCATION:{location}
ORGANIZER;CN={organizer_name}:mailto:{organizer_email}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Erinnerung: {event.title}
END:VALARM
END:VEVENT
END:VCALENDAR"""

    return ics_content


def send_invitation_email(invitation, event):
    """Send invitation email to attendee with ICS attachment"""
    jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.dennis24.com')
    meeting_link = f"https://{jitsi_domain}/{event.meeting_id}"

    # Build URLs
    production_url = getattr(settings, 'PRODUCTION_URL', 'http://localhost:5173')
    api_url = production_url.replace(':5173', ':8000')  # Backend URL for RSVP
    join_link = f"{production_url}/join/{invitation.invitation_token}"
    accept_link = f"{api_url}/api/calendar/rsvp/{invitation.invitation_token}/accept"
    decline_link = f"{api_url}/api/calendar/rsvp/{invitation.invitation_token}/decline"
    ics_link = f"{api_url}/api/calendar/ics/{invitation.invitation_token}"

    inviter_name = event.user.get_full_name() or event.user.email

    html_content = render_to_string('calendar/invitation_email.html', {
        'event': event,
        'invitation': invitation,
        'meeting_link': meeting_link,
        'join_link': join_link,
        'accept_link': accept_link,
        'decline_link': decline_link,
        'ics_link': ics_link,
        'inviter_name': inviter_name,
    })

    # Plain text fallback
    plain_text = f"""
Sie wurden zu einem Meeting eingeladen!

{event.title}

Wann: {event.date.strftime('%d.%m.%Y')} von {event.start_time.strftime('%H:%M')} bis {event.end_time.strftime('%H:%M')}
{"Ort: " + event.location if event.location else ""}
{"Beschreibung: " + event.description if event.description else ""}

Am Meeting teilnehmen: {meeting_link}

Zusagen: {accept_link}
Absagen: {decline_link}

Eingeladen von: {inviter_name}
"""

    # Create email with attachment
    email = EmailMultiAlternatives(
        subject=f"Einladung: {event.title}",
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invitation.email],
    )
    email.attach_alternative(html_content, "text/html")

    # Attach ICS file
    ics_content = generate_ics_content(event, invitation)
    ics_filename = f"{event.title.replace(' ', '_')}.ics"
    email.attach(ics_filename, ics_content, 'text/calendar')

    email.send(fail_silently=False)
