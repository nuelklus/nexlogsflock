from apps.core.tenant.models import TenantBaseModel
from apps.health.outbreak.models import DiseaseOutbreak
from django.db import models


class Quarantine(TenantBaseModel):
    outbreak = models.OneToOneField(DiseaseOutbreak, on_delete=models.CASCADE)

    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20)

    class Meta:
        db_table = "health_quarantine"
        verbose_name = "Quarantine"
        verbose_name_plural = "Quarantines"
        indexes = [
            models.Index(fields=["tenant", "outbreak"], name="idx_quarantine_tenant_outbreak"),
        ]

    def __str__(self):
        return f"Quarantine {self.outbreak} ({self.status})"