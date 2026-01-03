from ninja import Router, Schema
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from typing import List, Optional

from .models import Customer

router = Router()


class CustomerSchema(Schema):
    id: int
    name: str
    email: str
    phone: str
    company: str
    street: str
    zip_code: str
    city: str
    country: str
    tax_id: str
    notes: str


class CustomerCreateSchema(Schema):
    name: str
    email: str = ''
    phone: str = ''
    company: str = ''
    street: str = ''
    zip_code: str = ''
    city: str = ''
    country: str = 'Deutschland'
    tax_id: str = ''
    notes: str = ''


class CustomerUpdateSchema(Schema):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    street: Optional[str] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None


class ErrorSchema(Schema):
    error: str


@router.get('/', response=List[CustomerSchema])
def list_customers(request: HttpRequest, search: str = ''):
    """List all customers for the current user"""
    if not request.user.is_authenticated:
        return []

    customers = Customer.objects.filter(user=request.user)

    if search:
        customers = customers.filter(
            name__icontains=search
        ) | customers.filter(
            company__icontains=search
        ) | customers.filter(
            email__icontains=search
        )

    return list(customers)


@router.get('/{customer_id}', response={200: CustomerSchema, 404: ErrorSchema})
def get_customer(request: HttpRequest, customer_id: int):
    """Get a single customer by ID"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    customer = get_object_or_404(Customer, id=customer_id, user=request.user)
    return 200, customer


@router.post('/', response={201: CustomerSchema, 400: ErrorSchema})
def create_customer(request: HttpRequest, data: CustomerCreateSchema):
    """Create a new customer"""
    if not request.user.is_authenticated:
        return 400, {'error': 'Not authenticated'}

    customer = Customer.objects.create(
        user=request.user,
        **data.dict()
    )
    return 201, customer


@router.put('/{customer_id}', response={200: CustomerSchema, 404: ErrorSchema})
def update_customer(request: HttpRequest, customer_id: int, data: CustomerUpdateSchema):
    """Update an existing customer"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    customer = get_object_or_404(Customer, id=customer_id, user=request.user)

    for field, value in data.dict(exclude_unset=True).items():
        setattr(customer, field, value)

    customer.save()
    return 200, customer


@router.delete('/{customer_id}', response={204: None, 404: ErrorSchema})
def delete_customer(request: HttpRequest, customer_id: int):
    """Delete a customer"""
    if not request.user.is_authenticated:
        return 404, {'error': 'Not found'}

    customer = get_object_or_404(Customer, id=customer_id, user=request.user)
    customer.delete()
    return 204, None
