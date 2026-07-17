from apps.core.tenant.models import TenantBaseModel
from apps.health.outbreak.models import DiseaseOutbreak
from django.db import models


class RecoveryRecord(TenantBaseModel):
    outbreak = models.ForeignKey(DiseaseOutbreak, on_delete=models.CASCADE)

    date = models.DateField()

    birds_recovered = models.IntegerField()
    birds_dead = models.IntegerField()

    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "health_recoveryrecord"
        verbose_name = "Recovery Record"
        verbose_name_plural = "Recovery Records"
        indexes = [
            models.Index(fields=["tenant", "outbreak", "date"], name="idx_recovery_tnt_outbreak_date"),
        ]

    def __str__(self):
        return f"Recovery {self.outbreak} - {self.date} ({self.birds_recovered} recovered)"