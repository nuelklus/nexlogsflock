import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.tenant.models import TenantBaseModel
from apps.core.users.models import User
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House


class ExpenseCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_categories_created",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_categories_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "finance_expense_category"
        verbose_name = "Expense Category"
        verbose_name_plural = "Expense Categories"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["name"], name="uniq_expense_category_name"),
        ]

    def __str__(self):
        return self.name


class Expense(TenantBaseModel):
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    house = models.ForeignKey(
        House,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    expense_date = models.DateField()
    vendor_name = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ("cash", "Cash"),
            ("bank_transfer", "Bank Transfer"),
            ("mobile_money", "Mobile Money"),
            ("cheque", "Cheque"),
            ("card", "Card"),
            ("other", "Other"),
        ],
        default="cash",
    )
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    payment = models.ForeignKey(
        "finance_payment.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_records",
    )

    class Meta:
        db_table = "finance_expense"
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
        ordering = ["-expense_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "expense_date"], name="idx_expense_tenant_date"),
            models.Index(fields=["tenant", "category"], name="idx_expense_tenant_category"),
            models.Index(fields=["tenant", "branch"], name="idx_expense_tenant_branch"),
            models.Index(fields=["tenant", "house"], name="idx_expense_tenant_house"),
            models.Index(fields=["tenant", "batch"], name="idx_expense_tenant_batch"),
        ]

    def clean(self):
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Expense amount must be greater than zero."})

        if self.house and self.branch and self.house.branch_id != self.branch_id:
            raise ValidationError({"house": "Selected house does not belong to the selected branch."})

        if self.house and self.house.tenant_id != self.tenant_id:
            raise ValidationError({"house": "Selected house does not belong to this tenant."})

        if self.batch and self.house and self.batch.house_id != self.house_id:
            raise ValidationError({"batch": "Selected batch does not belong to the selected house."})

        if self.batch and self.branch and self.batch.branch_id != self.branch_id:
            raise ValidationError({"batch": "Selected batch does not belong to the selected branch."})

        if self.batch and not self.house:
            raise ValidationError({"batch": "A house is required when selecting a bird batch."})

        if self.batch and self.batch.tenant_id != self.tenant_id:
            raise ValidationError({"batch": "Selected batch does not belong to this tenant."})

    def __str__(self):
        return f"{self.category.name} - {self.amount}"
