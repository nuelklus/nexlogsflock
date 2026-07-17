from apps.core.tenant.models import TenantBaseModel
from apps.health.disease.models import Disease
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from django.db import models


class DiseaseOutbreak(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="disease_outbreaks",
    )

    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="disease_outbreaks",
    )

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="disease_outbreaks",
    )

    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name="outbreaks",
    )

    outbreak_date = models.DateField()

    birds_affected = models.IntegerField()

    severity = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium",
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("resolved", "Resolved"),
            ("monitoring", "Monitoring"),
        ],
        default="active",
    )

    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "health_diseaseoutbreak"

        verbose_name = "Disease Outbreak"

        verbose_name_plural = "Disease Outbreaks"


        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "outbreak_date",
                ],
                name="idx_outbreak_tenant_batch_date",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                    "status",
                ],
                name="idx_outbreak_tnt_branch_status",
            ),
        ]


    def __str__(self):

        return (
            f"Outbreak {self.disease} "
            f"- {self.batch}"
        )