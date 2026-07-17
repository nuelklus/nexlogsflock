from apps.core.tenant.models import TenantBaseModel
from apps.health.disease.models import Disease
from apps.health.outbreak.models import DiseaseOutbreak
from apps.livestock.batch.models import BirdBatch
from django.db import models


class TreatmentPlan(TenantBaseModel):

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="treatments",
    )

    disease = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatments",
    )

    outbreak = models.ForeignKey(
        DiseaseOutbreak,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatments",
    )

    treatment_name = models.CharField(
        max_length=255,
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("ongoing", "Ongoing"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ],
        default="ongoing",
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:

        db_table = "health_treatmentplan"

        verbose_name = "Treatment Plan"

        verbose_name_plural = "Treatment Plans"

        indexes = [

            models.Index(
                fields=["tenant", "batch"],
                name="idx_treatment_tenant_batch",
            ),

            models.Index(
                fields=["tenant", "status"],
                name="idx_treatment_tenant_status",
            ),

        ]

    def __str__(self):

        return f"{self.batch} - {self.treatment_name}"