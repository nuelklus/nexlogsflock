from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.tenant.models import TenantBaseModel
from apps.finance.invoice.models import Invoice


PAYMENT_METHOD_CHOICES = [
    ("cash", "Cash"),
    ("bank_transfer", "Bank Transfer"),
    ("mobile_money", "Mobile Money"),
    ("cheque", "Cheque"),
    ("card", "Card"),
    ("other", "Other"),
]


class PaymentPurpose(models.TextChoices):
    INVOICE_PAYMENT = "invoice_payment", "Invoice Payment"
    EXPENSE_PAYMENT = "expense_payment", "Expense Payment"
    SUPPLIER_PAYMENT = "supplier_payment", "Supplier Payment"
    OTHER = "other", "Other"


class Payment(TenantBaseModel):

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )

    payment_purpose = models.CharField(
        max_length=30,
        choices=PaymentPurpose.choices,
        default=PaymentPurpose.INVOICE_PAYMENT,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default="cash",
    )

    date = models.DateField()

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "finance_payment"
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "invoice"],
                name="idx_payment_tenant_invoice",
            ),
            models.Index(
                fields=["tenant", "date"],
                name="idx_payment_tenant_date",
            ),
            models.Index(
                fields=["tenant", "payment_purpose"],
                name="idx_payment_tenant_purpose",
            ),
        ]

    def __str__(self):
        invoice_label = self.invoice.invoice_no if self.invoice else "General Payment"
        return f"Payment {self.amount} – {invoice_label}"
