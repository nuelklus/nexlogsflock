from apps.core.tenant.models import TenantBaseModel
from apps.health.disease.models import Disease
from apps.health.outbreak.models import DiseaseOutbreak
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House

from django.db import models


class Mortality(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="mortalities",
    )

    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="mortalities",
    )

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="mortalities",
    )


    disease = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mortalities",
    )


    disease_outbreak = models.ForeignKey(
        DiseaseOutbreak,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mortalities",
    )


    date = models.DateField()


    quantity = models.PositiveIntegerField()


    cause = models.CharField(
        max_length=30,
        choices=[
            ("disease", "Disease"),
            ("heat_stress", "Heat Stress"),
            ("accident", "Accident"),
            ("predator", "Predator"),
            ("poor_quality", "Poor Chick Quality"),
            ("unknown", "Unknown"),
            ("other", "Other"),
        ],
        default="unknown",
    )


    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "livestock_mortality"

        verbose_name = "Mortality"

        verbose_name_plural = "Mortalities"


        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "date",
                ],
                name="idx_mortality_tnt_batch_date",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                    "date",
                ],
                name="idx_mortality_tnt_branch_date",
            ),

        ]


    def __str__(self):

        return (
            f"{self.batch} - "
            f"{self.quantity} deaths "
            f"({self.date})"
        )