from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings


def send_invitation_email(invitation, event):
    """Send invitation email to attendee"""
    jitsi_domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
    meeting_link = f"https://{jitsi_domain}/{event.meeting_id}"

    # Build join URL for the guest page
    production_url = getattr(settings, 'PRODUCTION_URL', 'http://localhost:5173')
    join_link = f"{production_url}/join/{invitation.invitation_token}"

    html_content = render_to_string('calendar/invitation_email.html', {
        'event': event,
        'invitation': invitation,
        'meeting_link': meeting_link,
        'join_link': join_link,
        'inviter_name': event.user.get_full_name() or event.user.email,
    })

    # Plain text fallback
    plain_text = f"""
Sie wurden zu einem Meeting eingeladen!

{event.title}

Wann: {event.date.strftime('%d.%m.%Y')} von {event.start_time.strftime('%H:%M')} bis {event.end_time.strftime('%H:%M')}
{"Ort: " + event.location if event.location else ""}
{"Beschreibung: " + event.description if event.description else ""}

Am Meeting teilnehmen: {meeting_link}

Eingeladen von: {event.user.get_full_name() or event.user.email}
"""

    send_mail(
        subject=f"Einladung: {event.title}",
        message=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.email],
        html_message=html_content,
        fail_silently=False,
    )
