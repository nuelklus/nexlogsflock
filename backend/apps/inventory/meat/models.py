from django.db import models

# Create your models here.
from django.db import models

from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch
from apps.production.harvest.models import Harvest


class MeatInventory(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="meat_inventory",
    )


    # harvest = models.ForeignKey(
    #     Harvest,
    #     on_delete=models.PROTECT,
    #     related_name="meat_inventory",
    # )


    PRODUCT_TYPES = [

        ("whole_chicken", "Whole Chicken"),

        ("breast", "Chicken Breast"),

        ("thigh", "Chicken Thigh"),

        ("wing", "Chicken Wing"),

        ("gizzard", "Gizzard"),

        ("other", "Other"),

    ]


    product_type = models.CharField(
        max_length=30,
        choices=PRODUCT_TYPES,
        default="whole_chicken",
    )


    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


    available_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


    UNIT_CHOICES = [

        ("kg", "Kilogram"),

        ("piece", "Piece"),

    ]


    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
    )


    storage_location = models.CharField(
        max_length=100,
        blank=True,
    )


    inventory_date = models.DateField()


    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "inventory_meat"

        constraints = [

            models.UniqueConstraint(

                fields=[

                    "tenant",
                    "branch",

                ],

                condition=models.Q(
                    is_active=True
                ),

                name="unique_active_meat_inventory_per_branch",

            )

        ]

    def __str__(self):

        return (
            f"{self.product_type} "
            f"- {self.available_quantity}{self.unit}"
        )