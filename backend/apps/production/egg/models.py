from apps.core.tenant.models import TenantBaseModel
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from django.db import models
from django.db.models import Q


class EggProduction(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="egg_productions",
    )

    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="egg_productions",
    )

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="egg_productions",
    )

    production_date = models.DateField()

    good_eggs = models.PositiveIntegerField(
        default=0,
    )

    cracked_eggs = models.PositiveIntegerField(
        default=0,
    )

    broken_eggs = models.PositiveIntegerField(
        default=0,
    )

    dirty_eggs = models.PositiveIntegerField(
        default=0,
    )

    small_eggs = models.PositiveIntegerField(
        default=0,
    )

    double_yolk_eggs = models.PositiveIntegerField(
        default=0,
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:

        db_table = "production_eggproduction"

        verbose_name = "Egg Production"

        verbose_name_plural = "Egg Productions"

        ordering = [
            "-production_date",
        ]

        constraints = [

            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "batch",
                    "production_date",
                ],
                condition=Q(is_active=True),
                name="uniq_eggproduction_batch_date",
            ),

        ]

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "production_date",
                ],
                name="idx_eggprod_tenant_batch_date",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                    "production_date",
                ],
                name="idx_eggprod_tenant_branch_date",
            ),

        ]


    @property
    def total_eggs(self):

        return (
            self.good_eggs
            + self.cracked_eggs
            + self.broken_eggs
            + self.dirty_eggs
            + self.small_eggs
            + self.double_yolk_eggs
        )


    def __str__(self):

        return (
            f"{self.batch.batch_number} "
            f"- {self.production_date}"
        )