from django.db import models
from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch
from django.db.models import Q

class EggInventory(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="egg_inventory",
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

        ("egg", "Egg"),

        ("tray", "Tray"),

    ]


    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default="egg",
    )


    GRADE_CHOICES = [

        ("small", "Small"),

        ("medium", "Medium"),

        ("large", "Large"),

        ("mixed", "Mixed"),

    ]


    grade = models.CharField(
        max_length=20,
        choices=GRADE_CHOICES,
        default="mixed",
    )


    collection_start_date = models.DateField()


    collection_end_date = models.DateField()


    storage_location = models.CharField(
        max_length=100,
        blank=True,
    )


    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "inventory_egg"
        constraints = [
        models.UniqueConstraint(
            fields=["tenant", "branch"],
            condition=Q(is_active=True),
            name="unique_active_egg_inventory_per_branch",
            ),
        ]

    def __str__(self):

        return (
            f"Egg Stock "
            f"{self.available_quantity}{self.unit}"
        )