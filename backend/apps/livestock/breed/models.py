from apps.core.tenant.models import TenantBaseModel
from django.db import models


class Breed(TenantBaseModel):
    name = models.CharField(max_length=100)

    bird_type = models.CharField(
        max_length=20,
        choices=[("layer", "Layer"), ("broiler", "Broiler")]
    )

    market_age_days = models.IntegerField(default=42)
    laying_start_days = models.IntegerField(null=True, blank=True)
    retirement_days = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "livestock_breed"
        verbose_name = "Breed"
        verbose_name_plural = "Breeds"
        indexes = [
            models.Index(fields=["tenant", "bird_type"], name="idx_breed_tenant_type"),
        ]

    def __str__(self):
        return self.name