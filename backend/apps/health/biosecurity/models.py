from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from django.db import models


class BiosecurityIncident(TenantBaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    house = models.ForeignKey(House, on_delete=models.CASCADE)

    incident_date = models.DateField()
    incident_type = models.CharField(max_length=100)

    description = models.TextField()
    corrective_action = models.TextField()
    resolved = models.BooleanField(default=False)

    class Meta:
        db_table = "health_biosecurityincident"
        verbose_name = "Biosecurity Incident"
        verbose_name_plural = "Biosecurity Incidents"
        indexes = [
            models.Index(fields=["tenant", "branch", "incident_date"], name="idx_biosec_tenant_branch_date"),
            models.Index(fields=["tenant", "resolved"], name="idx_biosec_tenant_resolved"),
        ]

    def __str__(self):
        return f"Biosecurity {self.incident_type} - {self.incident_date}"