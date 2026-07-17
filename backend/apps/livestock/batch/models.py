from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.tenant.models import TenantBaseModel
from apps.livestock.breed.models import Breed
from apps.livestock.purchase.models import ChickPurchase
from apps.organization.branch.models import Branch
from apps.organization.house.models import House


class BirdBatch(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="batches",
    )

    house = models.ForeignKey(
        House,
        on_delete=models.SET_NULL,
        null=True,
        related_name="batches",
    )

    purchase = models.ForeignKey(
        ChickPurchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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


    initial_quantity = models.PositiveIntegerField()


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

        ]


        constraints = [

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

        ]



    def save(self, *args, **kwargs):

        # New batch starts with all birds alive

        if not self.pk and self.current_quantity == 0:

            self.current_quantity = self.initial_quantity


        self.full_clean()


        super().save(
            *args,
            **kwargs
        )



    def clean(self):

        super().clean()


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



    @property
    def age_days(self):

        return (
            timezone.now().date()
            -
            self.arrival_date
        ).days



    def __str__(self):

        return f"Batch {self.batch_number}"