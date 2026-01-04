from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Sum, F
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from .models import Client, Project, TimeEntry, ActiveTimer

router = Router()


# ===== Schemas =====

class ClientSchema(Schema):
    id: int
    name: str
    email: str
    phone: str
    address: str
    notes: str
    created_at: datetime


class ClientCreateSchema(Schema):
    name: str
    email: Optional[str] = ''
    phone: Optional[str] = ''
    address: Optional[str] = ''
    notes: Optional[str] = ''


class ClientUpdateSchema(Schema):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ProjectSchema(Schema):
    id: int
    client: int
    client_name: str
    name: str
    description: str
    hourly_rate: float
    color: str
    status: str
    created_at: datetime

    @staticmethod
    def resolve_client(obj):
        return obj.client_id

    @staticmethod
    def resolve_client_name(obj):
        return obj.client.name


class ProjectCreateSchema(Schema):
    client: int
    name: str
    description: Optional[str] = ''
    hourly_rate: Optional[float] = 0
    color: Optional[str] = 'blue'
    status: Optional[str] = 'active'


class ProjectUpdateSchema(Schema):
    client: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    hourly_rate: Optional[float] = None
    color: Optional[str] = None
    status: Optional[str] = None


class TimeEntrySchema(Schema):
    id: int
    project: int
    project_name: str
    client_name: str
    date: date
    start_time: str
    end_time: str
    duration_minutes: int
    description: str
    billable: bool
    created_at: datetime

    @staticmethod
    def resolve_project(obj):
        return obj.project_id

    @staticmethod
    def resolve_project_name(obj):
        return obj.project.name

    @staticmethod
    def resolve_client_name(obj):
        return obj.project.client.name

    @staticmethod
    def resolve_start_time(obj):
        return obj.start_time.strftime('%H:%M')

    @staticmethod
    def resolve_end_time(obj):
        return obj.end_time.strftime('%H:%M')


class TimeEntryCreateSchema(Schema):
    project: int
    date: date
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    description: Optional[str] = ''
    billable: Optional[bool] = True


class TimeEntryUpdateSchema(Schema):
    project: Optional[int] = None
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    billable: Optional[bool] = None


class SummarySchema(Schema):
    total_hours: float
    total_revenue: float
    entries_count: int
    by_project: List[dict]
    by_client: List[dict]


class ErrorSchema(Schema):
    error: str


# ===== Client Endpoints =====

@router.get('/clients/', response=List[ClientSchema])
def list_clients(request):
    """Liste aller Kunden"""
    return Client.objects.filter(user=request.user)


@router.post('/clients/', response={201: ClientSchema, 400: ErrorSchema})
def create_client(request, data: ClientCreateSchema):
    """Neuen Kunden erstellen"""
    client = Client.objects.create(
        user=request.user,
        name=data.name,
        email=data.email or '',
        phone=data.phone or '',
        address=data.address or '',
        notes=data.notes or ''
    )
    return 201, client


@router.get('/clients/{client_id}', response={200: ClientSchema, 404: ErrorSchema})
def get_client(request, client_id: int):
    """Einzelnen Kunden abrufen"""
    client = get_object_or_404(Client, id=client_id, user=request.user)
    return client


@router.put('/clients/{client_id}', response={200: ClientSchema, 404: ErrorSchema})
def update_client(request, client_id: int, data: ClientUpdateSchema):
    """Kunden aktualisieren"""
    client = get_object_or_404(Client, id=client_id, user=request.user)

    if data.name is not None:
        client.name = data.name
    if data.email is not None:
        client.email = data.email
    if data.phone is not None:
        client.phone = data.phone
    if data.address is not None:
        client.address = data.address
    if data.notes is not None:
        client.notes = data.notes

    client.save()
    return client


@router.delete('/clients/{client_id}', response={204: None, 400: ErrorSchema, 404: ErrorSchema})
def delete_client(request, client_id: int):
    """Kunden löschen"""
    client = get_object_or_404(Client, id=client_id, user=request.user)

    # Check if client has projects
    if client.projects.exists():
        return 400, {'error': 'Kunde hat noch Projekte. Bitte zuerst alle Projekte löschen.'}

    client.delete()
    return 204, None


# ===== Project Endpoints =====

@router.get('/projects/', response=List[ProjectSchema])
def list_projects(request, status: Optional[str] = None, client_id: Optional[int] = None):
    """Liste aller Projekte"""
    projects = Project.objects.filter(user=request.user).select_related('client')

    if status:
        projects = projects.filter(status=status)
    if client_id:
        projects = projects.filter(client_id=client_id)

    return projects


@router.post('/projects/', response={201: ProjectSchema, 400: ErrorSchema})
def create_project(request, data: ProjectCreateSchema):
    """Neues Projekt erstellen"""
    # Verify client belongs to user
    client = get_object_or_404(Client, id=data.client, user=request.user)

    project = Project.objects.create(
        user=request.user,
        client=client,
        name=data.name,
        description=data.description or '',
        hourly_rate=data.hourly_rate or 0,
        color=data.color or 'blue',
        status=data.status or 'active'
    )
    return 201, project


@router.get('/projects/{project_id}', response={200: ProjectSchema, 404: ErrorSchema})
def get_project(request, project_id: int):
    """Einzelnes Projekt abrufen"""
    project = get_object_or_404(
        Project.objects.select_related('client'),
        id=project_id,
        user=request.user
    )
    return project


@router.put('/projects/{project_id}', response={200: ProjectSchema, 404: ErrorSchema})
def update_project(request, project_id: int, data: ProjectUpdateSchema):
    """Projekt aktualisieren"""
    project = get_object_or_404(Project, id=project_id, user=request.user)

    if data.client is not None:
        client = get_object_or_404(Client, id=data.client, user=request.user)
        project.client = client
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.hourly_rate is not None:
        project.hourly_rate = data.hourly_rate
    if data.color is not None:
        project.color = data.color
    if data.status is not None:
        project.status = data.status

    project.save()
    return project


@router.delete('/projects/{project_id}', response={204: None, 400: ErrorSchema, 404: ErrorSchema})
def delete_project(request, project_id: int):
    """Projekt löschen"""
    project = get_object_or_404(Project, id=project_id, user=request.user)

    # Check if project has time entries
    if project.entries.exists():
        return 400, {'error': 'Projekt hat noch Zeiteinträge. Bitte zuerst alle Einträge löschen.'}

    project.delete()
    return 204, None


# ===== Time Entry Endpoints =====

@router.get('/entries/', response=List[TimeEntrySchema])
def list_entries(request, date_from: Optional[date] = None, date_to: Optional[date] = None, project_id: Optional[int] = None):
    """Liste aller Zeiteinträge"""
    entries = TimeEntry.objects.filter(user=request.user).select_related('project', 'project__client')

    if date_from:
        entries = entries.filter(date__gte=date_from)
    if date_to:
        entries = entries.filter(date__lte=date_to)
    if project_id:
        entries = entries.filter(project_id=project_id)

    return entries


@router.post('/entries/', response={201: TimeEntrySchema, 400: ErrorSchema})
def create_entry(request, data: TimeEntryCreateSchema):
    """Neuen Zeiteintrag erstellen"""
    from datetime import datetime as dt

    # Verify project belongs to user
    project = get_object_or_404(Project, id=data.project, user=request.user)

    # Parse time strings
    start_time = dt.strptime(data.start_time, '%H:%M').time()
    end_time = dt.strptime(data.end_time, '%H:%M').time()

    entry = TimeEntry.objects.create(
        user=request.user,
        project=project,
        date=data.date,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=0,  # Will be calculated in save()
        description=data.description or '',
        billable=data.billable if data.billable is not None else True
    )
    return 201, entry


@router.get('/entries/{entry_id}', response={200: TimeEntrySchema, 404: ErrorSchema})
def get_entry(request, entry_id: int):
    """Einzelnen Zeiteintrag abrufen"""
    entry = get_object_or_404(
        TimeEntry.objects.select_related('project', 'project__client'),
        id=entry_id,
        user=request.user
    )
    return entry


@router.put('/entries/{entry_id}', response={200: TimeEntrySchema, 404: ErrorSchema})
def update_entry(request, entry_id: int, data: TimeEntryUpdateSchema):
    """Zeiteintrag aktualisieren"""
    from datetime import datetime as dt

    entry = get_object_or_404(TimeEntry, id=entry_id, user=request.user)

    if data.project is not None:
        project = get_object_or_404(Project, id=data.project, user=request.user)
        entry.project = project
    if data.date is not None:
        entry.date = data.date
    if data.start_time is not None:
        entry.start_time = dt.strptime(data.start_time, '%H:%M').time()
    if data.end_time is not None:
        entry.end_time = dt.strptime(data.end_time, '%H:%M').time()
    if data.description is not None:
        entry.description = data.description
    if data.billable is not None:
        entry.billable = data.billable

    entry.save()  # duration_minutes recalculated in save()
    return entry


@router.delete('/entries/{entry_id}', response={204: None, 404: ErrorSchema})
def delete_entry(request, entry_id: int):
    """Zeiteintrag löschen"""
    entry = get_object_or_404(TimeEntry, id=entry_id, user=request.user)
    entry.delete()
    return 204, None


# ===== Summary Endpoint =====

@router.get('/summary/', response=SummarySchema)
def get_summary(request, date_from: Optional[date] = None, date_to: Optional[date] = None):
    """Zusammenfassung der Zeiterfassung"""
    entries = TimeEntry.objects.filter(user=request.user).select_related('project', 'project__client')

    if date_from:
        entries = entries.filter(date__gte=date_from)
    if date_to:
        entries = entries.filter(date__lte=date_to)

    # Total stats
    total_minutes = entries.aggregate(total=Sum('duration_minutes'))['total'] or 0
    total_hours = total_minutes / 60

    # Revenue calculation
    total_revenue = 0
    for entry in entries.filter(billable=True):
        hourly_rate = float(entry.project.hourly_rate)
        hours = entry.duration_minutes / 60
        total_revenue += hourly_rate * hours

    # By project
    by_project = []
    project_stats = entries.values('project__id', 'project__name', 'project__hourly_rate').annotate(
        total_minutes=Sum('duration_minutes')
    )
    for ps in project_stats:
        hours = ps['total_minutes'] / 60
        revenue = float(ps['project__hourly_rate']) * hours
        by_project.append({
            'project_id': ps['project__id'],
            'project_name': ps['project__name'],
            'hours': round(hours, 2),
            'revenue': round(revenue, 2)
        })

    # By client
    by_client = []
    client_stats = entries.values('project__client__id', 'project__client__name').annotate(
        total_minutes=Sum('duration_minutes')
    )
    for cs in client_stats:
        hours = cs['total_minutes'] / 60
        by_client.append({
            'client_id': cs['project__client__id'],
            'client_name': cs['project__client__name'],
            'hours': round(hours, 2)
        })

    return {
        'total_hours': round(total_hours, 2),
        'total_revenue': round(total_revenue, 2),
        'entries_count': entries.count(),
        'by_project': by_project,
        'by_client': by_client
    }


# ===== Active Timer Schemas =====

class ActiveTimerSchema(Schema):
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    description: str
    start_time: Optional[int] = None  # Unix timestamp in ms
    paused_time: int = 0  # Accumulated paused time in ms
    is_running: bool
    is_paused: bool

    @staticmethod
    def resolve_project_id(obj):
        return obj.project_id if obj.project else None

    @staticmethod
    def resolve_project_name(obj):
        return obj.project.name if obj.project else None


class ActiveTimerUpdateSchema(Schema):
    project_id: Optional[int] = None
    description: Optional[str] = None
    start_time: Optional[int] = None
    paused_time: Optional[int] = None
    is_running: Optional[bool] = None
    is_paused: Optional[bool] = None


# ===== Active Timer Endpoints =====

@router.get('/timer/', response={200: ActiveTimerSchema, 404: ErrorSchema})
def get_active_timer(request):
    """Aktuellen Timer-Status abrufen"""
    try:
        timer = ActiveTimer.objects.select_related('project').get(user=request.user)
        return timer
    except ActiveTimer.DoesNotExist:
        return 404, {'error': 'No active timer'}


@router.put('/timer/', response=ActiveTimerSchema)
def update_active_timer(request, data: ActiveTimerUpdateSchema):
    """Timer-Status aktualisieren (erstellt automatisch wenn nicht vorhanden)"""
    timer, created = ActiveTimer.objects.get_or_create(user=request.user)

    if data.project_id is not None:
        if data.project_id == 0 or data.project_id == -1:
            timer.project = None
        else:
            timer.project = get_object_or_404(Project, id=data.project_id, user=request.user)

    if data.description is not None:
        timer.description = data.description
    if data.start_time is not None:
        timer.start_time = data.start_time
    if data.paused_time is not None:
        timer.paused_time = data.paused_time
    if data.is_running is not None:
        timer.is_running = data.is_running
    if data.is_paused is not None:
        timer.is_paused = data.is_paused

    timer.save()

    # Refresh to get project relation
    timer = ActiveTimer.objects.select_related('project').get(user=request.user)
    return timer


@router.delete('/timer/', response={204: None})
def delete_active_timer(request):
    """Timer löschen/zurücksetzen"""
    ActiveTimer.objects.filter(user=request.user).delete()
    return 204, None
