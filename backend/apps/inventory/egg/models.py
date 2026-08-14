from django.core.validators import MinValueValidator
from django.db import models
from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch
from django.db.models import Q


class EggInventory(TenantBaseModel):
    UNIT_PIECE = "piece"
    UNIT_CHOICES = [
        (UNIT_PIECE, "Piece"),
    ]

    GRADE_LARGE = "LARGE"
    GRADE_MEDIUM = "MEDIUM"
    GRADE_SMALL = "SMALL"
    GRADE_PULLET = "PULLET"
    GRADE_UNSORTED = "UNSORTED"
    GRADE_CHOICES = [
        (GRADE_LARGE, "Large"),
        (GRADE_MEDIUM, "Medium"),
        (GRADE_SMALL, "Small"),
        (GRADE_PULLET, "Pullet"),
        (GRADE_UNSORTED, "Unsorted"),
    ]

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="egg_inventory",
    )


    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )


    available_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )


    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default=UNIT_PIECE,
    )


    grade = models.CharField(
        max_length=20,
        choices=GRADE_CHOICES,
        default=GRADE_UNSORTED,
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
        indexes = [
            models.Index(
                fields=["tenant", "branch", "grade"],
                name="idx_egginv_tenant_branch_grade",
            ),
        ]
        constraints = [
        models.UniqueConstraint(
            fields=["tenant", "branch", "grade"],
            condition=Q(is_active=True),
            name="unique_active_egg_inventory_per_branch_grade",
            ),
        ]

    def __str__(self):

        return (
            f"Egg Stock {self.grade} "
            f"{self.available_quantity}{self.unit}"
        )


class EggStockMovement(TenantBaseModel):
    MOVEMENT_PRODUCTION = "production"
    MOVEMENT_PRODUCTION_REVERSAL = "production_reversal"
    MOVEMENT_INVOICE_SALE = "invoice_sale"
    MOVEMENT_INVOICE_SALE_REVERSAL = "invoice_sale_reversal"
    MOVEMENT_ADJUSTMENT = "adjustment"
    MOVEMENT_TYPE_CHOICES = [
        (MOVEMENT_PRODUCTION, "Production"),
        (MOVEMENT_PRODUCTION_REVERSAL, "Production Reversal"),
        (MOVEMENT_INVOICE_SALE, "Invoice Sale"),
        (MOVEMENT_INVOICE_SALE_REVERSAL, "Invoice Sale Reversal"),
        (MOVEMENT_ADJUSTMENT, "Adjustment"),
    ]

    egg_inventory = models.ForeignKey(
        EggInventory,
        on_delete=models.CASCADE,
        related_name="movements",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="egg_stock_movements",
    )

    grade = models.CharField(
        max_length=20,
        choices=EggInventory.GRADE_CHOICES,
    )

    movement_type = models.CharField(
        max_length=30,
        choices=MOVEMENT_TYPE_CHOICES,
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    unit = models.CharField(
        max_length=10,
        choices=EggInventory.UNIT_CHOICES,
        default=EggInventory.UNIT_PIECE,
    )

    reference_type = models.CharField(
        max_length=50,
        blank=True,
    )

    reference_id = models.UUIDField(
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "egg_stock_movement"
        verbose_name = "Egg Stock Movement"
        verbose_name_plural = "Egg Stock Movements"
        indexes = [
            models.Index(
                fields=["tenant", "branch", "grade", "created_at"],
                name="idx_eggmv_tenant_branch_grade",
            ),
            models.Index(
                fields=["tenant", "reference_id"],
                name="idx_eggmv_tenant_reference",
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_movement_type_display()} "
            f"{self.quantity}{self.unit}"
        )