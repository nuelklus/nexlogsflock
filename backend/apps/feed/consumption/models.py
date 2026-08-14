from apps.core.tenant.models import TenantBaseModel
from apps.feed.feed_type.models import FeedType
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from django.db import models
from django.db.models import Q


class FeedConsumption(TenantBaseModel):
    UNIT_CHOICES = [
        ("kg", "Kilogram"),
    ]

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="feed_consumptions",
        null=True,
        blank=True,
    )

    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="feed_consumptions",
        null=True,
        blank=True,
    )

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="feed_consumptions",
    )

    feed_type = models.ForeignKey(
        FeedType,
        on_delete=models.PROTECT,
        related_name="feed_consumptions",
        null=True,
        blank=True,
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default="kg",
    )

    date = models.DateField()

    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "feed_consumption"
        verbose_name = "Feed Consumption"
        verbose_name_plural = "Feed Consumptions"
        indexes = [
            models.Index(
                fields=["tenant", "batch", "date"],
                name="idx_feedcons_tenant_batch_date",
            ),
            models.Index(
                fields=["tenant", "branch", "date"],
                name="idx_feedcons_tnt_branch_date",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(quantity__gt=0),
                name="feed_consumption_quantity_positive",
            ),
        ]

    def __str__(self):
        return f"Feed {self.batch} - {self.date} ({self.quantity}kg)"


class FeedInventory(TenantBaseModel):
    UNIT_CHOICES = [
        ("kg", "Kilogram"),
    ]

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="feed_inventories",
    )

    feed_type = models.ForeignKey(
        FeedType,
        on_delete=models.PROTECT,
        related_name="feed_inventories",
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    available_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default="kg",
    )

    class Meta:
        db_table = "feed_inventory"
        verbose_name = "Feed Inventory"
        verbose_name_plural = "Feed Inventory"
        indexes = [
            models.Index(
                fields=["tenant", "branch", "feed_type"],
                name="idx_feedinv_tenant_branch_type",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "branch", "feed_type"],
                condition=Q(is_active=True),
                name="uniq_active_feed_inv_per_branch_type",
            ),
            models.CheckConstraint(
                check=Q(quantity__gte=0),
                name="feed_inv_quantity_not_negative",
            ),
            models.CheckConstraint(
                check=Q(available_quantity__gte=0),
                name="feed_inv_available_not_negative",
            ),
            models.CheckConstraint(
                check=Q(available_quantity__lte=models.F("quantity")),
                name="feed_inv_available_not_more_than_quantity",
            ),
        ]

    def __str__(self):
        return (
            f"{self.feed_type.name} - {self.branch.name} "
            f"({self.available_quantity}{self.unit})"
        )


class FeedStockMovement(TenantBaseModel):
    MOVEMENT_TYPE_CHOICES = [
        ("purchase", "Purchase"),
        ("purchase_reversal", "Purchase Reversal"),
        ("consumption", "Consumption"),
        ("consumption_reversal", "Consumption Reversal"),
        ("adjustment", "Adjustment"),
    ]

    UNIT_CHOICES = [
        ("kg", "Kilogram"),
    ]

    feed_inventory = models.ForeignKey(
        FeedInventory,
        on_delete=models.CASCADE,
        related_name="movements",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="feed_stock_movements",
    )

    feed_type = models.ForeignKey(
        FeedType,
        on_delete=models.PROTECT,
        related_name="stock_movements",
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
        choices=UNIT_CHOICES,
        default="kg",
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
        db_table = "feed_stock_movement"
        verbose_name = "Feed Stock Movement"
        verbose_name_plural = "Feed Stock Movements"
        indexes = [
            models.Index(
                fields=["tenant", "branch", "feed_type", "created_at"],
                name="idx_feedmv_tnt_branch_type_c",
            ),
            models.Index(
                fields=["tenant", "reference_id"],
                name="idx_feedmove_tenant_reference",
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_movement_type_display()} "
            f"{self.quantity}{self.unit}"
        )