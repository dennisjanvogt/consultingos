from ninja import Router, Schema
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from typing import List, Optional
from decimal import Decimal
from datetime import date

from .models import Invoice, InvoiceItem

router = Router()


class InvoiceItemSchema(Schema):
    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    position: int


class InvoiceItemCreateSchema(Schema):
    description: str
    quantity: Decimal = Decimal('1')
    unit_price: Decimal
    tax_rate: Decimal = Decimal('19')
    position: int = 0


class InvoiceSchema(Schema):
    id: int
    number: str
    customer_id: int
    customer_name: str
    status: str
    currency: str
    issue_date: date
    due_date: date
    paid_date: Optional[date]
    notes: str
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    items: List[InvoiceItemSchema]

    @staticmethod
    def resolve_customer_name(obj):
        return obj.customer.name


class InvoiceCreateSchema(Schema):
    customer_id: int
    status: str = 'draft'
    currency: str = 'EUR'
    issue_date: date
    due_date: date
    notes: str = ''
    items: List[InvoiceItemCreateSchema]


class InvoiceUpdateSchema(Schema):
    customer_id: Optional[int] = None
    status: Optional[str] = None
    currency: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class ErrorSchema(Schema):
    error: str


@router.get('/', response=List[InvoiceSchema])
def list_invoices(request: HttpRequest, status: str = '', search: str = ''):
    """List all invoices for the current user"""
    if not request.user.is_authenticated:
        return []

    invoices = Invoice.objects.filter(user=request.user).select_related('customer').prefetch_related('items')

    if status:
        invoices = invoices.filter(status=status)

    if search:
        invoices = invoices.filter(
            number__icontains=search
        ) | invoices.filter(
            customer__name__icontains=search
        )

    return list(invoices)


@router.get('/{invoice_id}', response={200: InvoiceSchema, 404: ErrorSchema})
def get_invoice(request: HttpRequest, invoice_id: int):
    """Get a single invoice by ID"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    invoice = get_object_or_404(
        Invoice.objects.select_related('customer').prefetch_related('items'),
        id=invoice_id,
        user=request.user
    )
    return 200, invoice


@router.post('/', response={201: InvoiceSchema, 400: ErrorSchema})
def create_invoice(request: HttpRequest, data: InvoiceCreateSchema):
    """Create a new invoice"""
    if not request.user.is_authenticated:
        return 400, {'error': 'Not authenticated'}

    # Get next invoice number from settings
    try:
        settings = request.user.company_settings
        number = settings.get_next_invoice_number()
    except:
        # Fallback if no settings exist
        count = Invoice.objects.filter(user=request.user).count()
        number = f'INV-{count + 1:05d}'

    invoice = Invoice.objects.create(
        user=request.user,
        number=number,
        customer_id=data.customer_id,
        status=data.status,
        currency=data.currency,
        issue_date=data.issue_date,
        due_date=data.due_date,
        notes=data.notes,
    )

    # Create invoice items
    for idx, item_data in enumerate(data.items):
        InvoiceItem.objects.create(
            invoice=invoice,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate,
            position=item_data.position or idx,
        )

    return 201, invoice


@router.put('/{invoice_id}', response={200: InvoiceSchema, 404: ErrorSchema})
def update_invoice(request: HttpRequest, invoice_id: int, data: InvoiceUpdateSchema):
    """Update an existing invoice"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)

    for field, value in data.dict(exclude_unset=True).items():
        setattr(invoice, field, value)

    invoice.save()
    return 200, invoice


@router.delete('/{invoice_id}', response={204: None, 404: ErrorSchema})
def delete_invoice(request: HttpRequest, invoice_id: int):
    """Delete an invoice"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    invoice.delete()
    return 204, None


@router.post('/{invoice_id}/mark-paid', response={200: InvoiceSchema, 404: ErrorSchema})
def mark_invoice_paid(request: HttpRequest, invoice_id: int):
    """Mark an invoice as paid"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    invoice.status = 'paid'
    invoice.paid_date = date.today()
    invoice.save()
    return 200, invoice


@router.post('/{invoice_id}/mark-sent', response={200: InvoiceSchema, 404: ErrorSchema})
def mark_invoice_sent(request: HttpRequest, invoice_id: int):
    """Mark an invoice as sent"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    invoice.status = 'sent'
    invoice.save()
    return 200, invoice
