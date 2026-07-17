from apps.core.tenant.models import TenantBaseModel
from django.db import models


class Branch(TenantBaseModel):
    name = models.CharField(max_length=255)
    location = models.TextField(blank=True)

    class Meta:
        db_table = "organization_branch"
        verbose_name = "Branch"
        verbose_name_plural = "Branches"
        indexes = [
            models.Index(fields=["tenant"], name="idx_branch_tenant"),
        ]
    
        constraints = [
        models.UniqueConstraint(
            fields=["tenant", "name"],
            name="unique_branch_name_per_tenant",
        )
        ]

    def __str__(self):
        return self.name