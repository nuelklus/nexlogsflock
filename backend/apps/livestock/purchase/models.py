from apps.core.tenant.models import TenantBaseModel
from apps.livestock.breed.models import Breed
from apps.organization.branch.models import Branch
from django.db import models
from apps.feed.feed_type.models import FeedType



class Supplier(TenantBaseModel):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = "livestock_supplier"
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"
        indexes = [
            models.Index(fields=["tenant"], name="idx_supplier_tenant"),
        ]

    def __str__(self):
        return self.name


class Customer(TenantBaseModel):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = "livestock_customer"
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        indexes = [
            models.Index(fields=["tenant"], name="idx_customer_tenant"),
        ]

    def __str__(self):
        return self.name


class ChickPurchase(TenantBaseModel):

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chick_purchases",
    )

    breed = models.ForeignKey(
        Breed,
        on_delete=models.SET_NULL,
        null=True,
        related_name="chick_purchases",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="chick_purchases",
    )

    purchase_date = models.DateField()

    arrival_date = models.DateField(
        null=True,
        blank=True,
    )

    quantity = models.PositiveIntegerField()

    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    class Meta:
        db_table = "livestock_chickpurchase"
        verbose_name = "Chick Purchase"
        verbose_name_plural = "Chick Purchases"

        indexes = [
            models.Index(fields=["tenant", "branch"], name="idx_chickpur_tenant_branch"),
            models.Index(fields=["tenant", "purchase_date"], name="idx_chickpur_tenant_date"),
        ]

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost

    def __str__(self):
        return f"{self.quantity} chicks"

class FeedPurchase(TenantBaseModel):

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feed_purchases",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="feed_purchases",
    )

    feed_type = models.ForeignKey(
        FeedType,
        on_delete=models.PROTECT,
        related_name="purchases",
    )

    purchase_date = models.DateField()

    quantity_bags = models.PositiveIntegerField()

    weight_per_bag = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Weight of each bag in kg",
    )

    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Cost per bag",
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "feed_feedpurchase"
        verbose_name = "Feed Purchase"
        verbose_name_plural = "Feed Purchases"

        indexes = [
            models.Index(
                fields=["tenant", "branch"],
                name="idx_feedpur_tenant_branch",
            ),
            models.Index(
                fields=["tenant", "purchase_date"],
                name="idx_feedpur_tenant_date",
            ),
        ]

    @property
    def total_weight(self):
        return self.quantity_bags * self.weight_per_bag

    @property
    def total_cost(self):
        return self.quantity_bags * self.unit_cost

    def __str__(self):
        return f"{self.feed_type.name} - {self.purchase_date}"