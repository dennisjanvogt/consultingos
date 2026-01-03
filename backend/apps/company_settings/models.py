from django.db import models
from django.conf import settings


class CompanySettings(models.Model):
    """Company settings for invoices and branding"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='company_settings'
    )

    # Company info
    company_name = models.CharField(max_length=255)

    # Address
    street = models.CharField(max_length=255, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Deutschland')

    # Contact
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)

    # Tax info
    tax_id = models.CharField(max_length=50, blank=True, verbose_name='USt-IdNr.')
    tax_number = models.CharField(max_length=50, blank=True, verbose_name='Steuernummer')

    # Banking
    bank_name = models.CharField(max_length=100, blank=True)
    iban = models.CharField(max_length=34, blank=True)
    bic = models.CharField(max_length=11, blank=True)

    # Rates
    default_hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100
    )
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=19
    )
    default_currency = models.CharField(max_length=3, default='EUR')

    # Branding
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)

    # Invoice settings
    invoice_prefix = models.CharField(max_length=10, default='INV-')
    next_invoice_number = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_settings'
        verbose_name = 'Company Settings'
        verbose_name_plural = 'Company Settings'

    def __str__(self):
        return self.company_name or f'Settings for {self.user.username}'

    def get_next_invoice_number(self) -> str:
        """Generate next invoice number and increment counter"""
        number = f'{self.invoice_prefix}{self.next_invoice_number:05d}'
        self.next_invoice_number += 1
        self.save(update_fields=['next_invoice_number'])
        return number
