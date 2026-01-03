from django.db import models
from django.conf import settings
from decimal import Decimal


class Invoice(models.Model):
    """Invoice model"""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Entwurf'
        SENT = 'sent', 'Gesendet'
        PAID = 'paid', 'Bezahlt'
        OVERDUE = 'overdue', 'Überfällig'
        CANCELLED = 'cancelled', 'Storniert'

    class Currency(models.TextChoices):
        EUR = 'EUR', 'Euro'
        USD = 'USD', 'US Dollar'
        CHF = 'CHF', 'Schweizer Franken'
        GBP = 'GBP', 'Britisches Pfund'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='invoices'
    )

    number = models.CharField(max_length=50)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.EUR
    )

    issue_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
        unique_together = ['user', 'number']

    def __str__(self):
        return f'{self.number} - {self.customer.name}'

    @property
    def subtotal(self) -> Decimal:
        return sum(item.total for item in self.items.all())

    @property
    def tax_amount(self) -> Decimal:
        return sum(item.tax_amount for item in self.items.all())

    @property
    def total(self) -> Decimal:
        return self.subtotal + self.tax_amount


class InvoiceItem(models.Model):
    """Invoice line item"""

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=19)  # 19% German VAT

    position = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'invoice_items'
        ordering = ['position']

    @property
    def total(self) -> Decimal:
        return self.quantity * self.unit_price

    @property
    def tax_amount(self) -> Decimal:
        return self.total * (self.tax_rate / 100)
