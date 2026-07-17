from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.tenant.models import TenantBaseModel
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch


class Harvest(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="harvests",
    )

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="harvests",
    )

    harvest_date = models.DateField()

    birds_harvested = models.PositiveIntegerField()

    average_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Average weight per bird in KG",
    )

    total_weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        editable=False,
        default=Decimal("0.00"),
        help_text="Total harvested weight in KG",
    )

    HARVEST_REASONS = [
        ("sale", "Sale"),
        ("processing", "Processing"),
        ("consumption", "Farm Consumption"),
        ("culling", "Culling"),
        ("other", "Other"),
    ]

    harvest_reason = models.CharField(
        max_length=20,
        choices=HARVEST_REASONS,
        default="sale",
    )
    
    STATUS_CHOICES = [

        ("pending", "Pending"),

        ("partially_sold", "Partially Sold"),

        ("sold", "Sold"),

        ("processed", "Processed"),

        ("stored", "Stored"),

        ("completed", "Completed"),

    ]


    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "production_harvest"

        ordering = [
            "-harvest_date"
        ]

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "harvest_date",
                ],
                name="idx_harvest_batch_date",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                    "harvest_date",
                ],
                name="idx_harvest_branch_date",
            ),

        ]


    def clean(self):

        super().clean()


        if self.batch.branch_id != self.branch_id:

            raise ValidationError(
                {
                    "branch":
                    "Batch does not belong to this branch."
                }
            )


        if self.birds_harvested > self.batch.current_quantity:

            raise ValidationError(
                {
                    "birds_harvested":
                    (
                        f"Only {self.batch.current_quantity} birds "
                        "are available."
                    )
                }
            )


    def save(self, *args, **kwargs):

        self.total_weight = (
            Decimal(self.birds_harvested)
            *
            self.average_weight
        )

        self.full_clean()

        super().save(*args, **kwargs)


    def __str__(self):

        return (
            f"{self.batch.batch_number} - "
            f"{self.harvest_date}"
        )