from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.tenant.models import TenantBaseModel
from apps.livestock.breed.models import Breed
from apps.organization.branch.models import Branch
from apps.organization.house.models import House


class BirdBatch(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="batches",
    )

    # A batch must always belong to a house.
    house = models.ForeignKey(
        House,
        on_delete=models.PROTECT,
        related_name="batches",
        null=True,)

    # Use a string reference here to avoid the circular import:
    # BirdBatch -> ChickPurchase -> BirdBatch
    purchase = models.ForeignKey(
        "livestock_purchase.ChickPurchase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batches",
    )

    batch_number = models.CharField(
        max_length=100,
        db_index=True,
    )

    breed = models.ForeignKey(
        Breed,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batches",
    )

    BIRD_TYPES = [
        ("layer", "Layer"),
        ("broiler", "Broiler"),
        ("cockerel", "Cockerel"),
        ("breeder", "Breeder"),
        ("pullet", "Pullet"),
    ]

    bird_type = models.CharField(
        max_length=20,
        choices=BIRD_TYPES,
    )

    arrival_date = models.DateField()

    # Original number of birds purchased/placed into this batch.
    # This also acts as the batch's maximum quantity.
    initial_quantity = models.PositiveIntegerField()

    # Number of birds currently remaining.
    current_quantity = models.PositiveIntegerField(
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("closed", "Closed"),
            ("sold", "Sold"),
        ],
        default="active",
    )

    class Meta:
        db_table = "livestock_birdbatch"

        verbose_name = "Bird Batch"
        verbose_name_plural = "Bird Batches"

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "branch",
                ],
                name="idx_birdbatch_tenant_branch",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "status",
                ],
                name="idx_birdbatch_tenant_status",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "batch_number",
                ],
                name="idx_birdbatch_tenant_batchno",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                    "house",
                ],
                name="idx_batch_tenant_branch_house",
            ),
        ]

        constraints = [
            # Same batch number is allowed in different
            # houses, branches, and tenants.
            #
            # But it cannot be duplicated inside the
            # same tenant + branch + house.
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "branch",
                    "house",
                    "batch_number",
                ],
                name="uniq_birdbatch_tenant_branch_house_number",
            ),

            models.CheckConstraint(
                check=Q(
                    current_quantity__gte=0
                ),
                name="birdbatch_current_quantity_not_negative",
            ),

            models.CheckConstraint(
                check=Q(
                    current_quantity__lte=models.F(
                        "initial_quantity"
                    )
                ),
                name="birdbatch_current_not_more_than_initial",
            ),

            models.CheckConstraint(
                check=Q(
                    initial_quantity__gt=0
                ),
                name="birdbatch_initial_quantity_positive",
            ),
        ]

    def save(self, *args, **kwargs):

        # A new batch starts with all birds alive.
        if not self.pk and self.current_quantity == 0:
            self.current_quantity = self.initial_quantity

        self.full_clean()

        super().save(
            *args,
            **kwargs
        )

    def clean(self):

        super().clean()

        # Branch and house must belong to the same tenant.
        if self.branch and self.house:

            if self.branch.tenant_id != self.tenant_id:
                raise ValidationError(
                    {
                        "branch":
                        "Selected branch does not belong to this tenant."
                    }
                )

            if self.house.tenant_id != self.tenant_id:
                raise ValidationError(
                    {
                        "house":
                        "Selected house does not belong to this tenant."
                    }
                )

            # House must belong to selected branch.
            if self.house.branch_id != self.branch_id:
                raise ValidationError(
                    {
                        "house":
                        "Selected house does not belong to the selected branch."
                    }
                )

        if self.current_quantity > self.initial_quantity:

            raise ValidationError(
                {
                    "current_quantity":
                    (
                        "Current quantity cannot be greater "
                        "than initial quantity."
                    )
                }
            )

        if self.current_quantity < 0:

            raise ValidationError(
                {
                    "current_quantity":
                    "Current quantity cannot be negative."
                }
            )

        if self.initial_quantity <= 0:

            raise ValidationError(
                {
                    "initial_quantity":
                    "Initial quantity must be greater than zero."
                }
            )

    @property
    def age_days(self):

        return (
            timezone.now().date()
            - self.arrival_date
        ).days

    def __str__(self):

        return (
            f"Batch {self.batch_number} "
            f"- {self.house.name}"
        )