from apps.core.tenant.models import TenantBaseModel
from apps.finance.invoice.models import Invoice
from django.db import models


class Payment(TenantBaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=50)
    date = models.DateField()

    class Meta:
        db_table = "finance_payment"
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        indexes = [
            models.Index(fields=["tenant", "invoice"], name="idx_payment_tenant_invoice"),
            models.Index(fields=["tenant", "date"], name="idx_payment_tenant_date"),
        ]

    def __str__(self):
        return f"Payment {self.amount} - {self.invoice}"