from ninja import Router, Schema
from django.http import HttpRequest
from typing import Optional
from decimal import Decimal

from .models import CompanySettings

router = Router()


class CompanySettingsSchema(Schema):
    company_name: str
    street: str
    zip_code: str
    city: str
    country: str
    email: str
    phone: str
    website: str
    tax_id: str
    tax_number: str
    bank_name: str
    iban: str
    bic: str
    default_hourly_rate: Decimal
    default_tax_rate: Decimal
    default_currency: str
    invoice_prefix: str
    next_invoice_number: int
    enabled_apps: list[str]
    dock_order: list[str]


class CompanySettingsUpdateSchema(Schema):
    company_name: Optional[str] = None
    street: Optional[str] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    tax_number: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    default_hourly_rate: Optional[Decimal] = None
    default_tax_rate: Optional[Decimal] = None
    default_currency: Optional[str] = None
    invoice_prefix: Optional[str] = None
    enabled_apps: Optional[list[str]] = None
    dock_order: Optional[list[str]] = None


class AppSettingsSchema(Schema):
    enabled_apps: list[str]
    dock_order: list[str]


class AppSettingsUpdateSchema(Schema):
    enabled_apps: Optional[list[str]] = None
    dock_order: Optional[list[str]] = None


class ErrorSchema(Schema):
    error: str


@router.get('/', response={200: CompanySettingsSchema, 404: ErrorSchema})
def get_settings(request: HttpRequest):
    """Get company settings for the current user"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not authenticated'}

    settings, created = CompanySettings.objects.get_or_create(
        user=request.user,
        defaults={'company_name': ''}
    )
    return 200, settings


@router.put('/', response={200: CompanySettingsSchema, 400: ErrorSchema})
def update_settings(request: HttpRequest, data: CompanySettingsUpdateSchema):
    """Update company settings"""
    if not request.user.is_authenticated:
        return 400, {'error': 'Not authenticated'}

    settings, created = CompanySettings.objects.get_or_create(
        user=request.user,
        defaults={'company_name': ''}
    )

    for field, value in data.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    settings.save()
    return 200, settings


# Default app settings
DEFAULT_ENABLED_APPS = [
    'dashboard', 'masterdata', 'transactions', 'documents',
    'calendar', 'kanban', 'timetracking', 'settings'
]
DEFAULT_DOCK_ORDER = [
    'dashboard', 'masterdata', 'transactions', 'documents',
    'calendar', 'kanban', 'timetracking', 'settings'
]


@router.get('/apps', response={200: AppSettingsSchema, 404: ErrorSchema})
def get_app_settings(request: HttpRequest):
    """Get app settings (enabled apps and dock order)"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not authenticated'}

    settings, created = CompanySettings.objects.get_or_create(
        user=request.user,
        defaults={'company_name': ''}
    )

    # Return defaults if not set
    return 200, {
        'enabled_apps': settings.enabled_apps or DEFAULT_ENABLED_APPS,
        'dock_order': settings.dock_order or DEFAULT_DOCK_ORDER,
    }


@router.put('/apps', response={200: AppSettingsSchema, 400: ErrorSchema})
def update_app_settings(request: HttpRequest, data: AppSettingsUpdateSchema):
    """Update app settings (enabled apps and/or dock order)"""
    if not request.user.is_authenticated:
        return 400, {'error': 'Not authenticated'}

    settings, created = CompanySettings.objects.get_or_create(
        user=request.user,
        defaults={'company_name': ''}
    )

    if data.enabled_apps is not None:
        settings.enabled_apps = data.enabled_apps
    if data.dock_order is not None:
        settings.dock_order = data.dock_order

    settings.save()

    return 200, {
        'enabled_apps': settings.enabled_apps or DEFAULT_ENABLED_APPS,
        'dock_order': settings.dock_order or DEFAULT_DOCK_ORDER,
    }
