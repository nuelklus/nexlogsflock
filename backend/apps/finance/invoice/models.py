from decimal import Decimal, ROUND_HALF_UP
from django.core.exceptions import ValidationError
from django.db import models, transaction

from apps.core.tenant.models import TenantBaseModel
from apps.inventory.egg.models import EggInventory
from apps.inventory.egg.services import (
    EGG_SELLING_UNIT_CRATE,
    EGG_SELLING_UNIT_PIECE,
    convert_egg_sales_quantity_to_pieces,
    normalize_egg_selling_unit,
    quantize_egg_quantity,
)
from apps.inventory.meat.models import MeatInventory
from apps.livestock.purchase.models import Customer
from apps.organization.branch.models import Branch
from apps.production.harvest.models import Harvest


class InvoiceSequence(TenantBaseModel):
    """
    Controls automatic invoice numbering per tenant.
    Each tenant has its own sequence.
    """

    next_number = models.PositiveIntegerField(
        default=1,
    )


    class Meta:

        db_table = "finance_invoice_sequence"

        constraints = [
            models.UniqueConstraint(
                fields=["tenant"],
                name="unique_invoice_sequence_per_tenant",
            )
        ]


    def __str__(self):

        return (
            f"{self.tenant.name} "
            f"Invoice Sequence"
        )


PAYMENT_STATUS_CHOICES = [
    ("unpaid", "Unpaid"),
    ("partially_paid", "Partially Paid"),
    ("paid", "Paid"),
    ("overdue", "Overdue"),
]


class Invoice(TenantBaseModel):

    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )

    invoice_no = models.CharField(
        max_length=100,
        editable=False,
    )

    invoice_date = models.DateField(
        null=True,
        blank=True,
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid",
    )


    class Meta:

        db_table = "finance_invoice"


        constraints = [

            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "invoice_no",
                ],
                name="uniq_invoice_per_tenant",
            )

        ]


        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "invoice_no",
                ],
                name="idx_invoice_tenant_no",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "invoice_date",
                ],
                name="idx_invoice_tenant_date",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "branch",
                ],
                name="idx_invoice_tenant_branch",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "customer",
                ],
                name="idx_invoice_tenant_customer",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "payment_status",
                ],
                name="idx_invoice_tenant_status",
            ),

        ]



    def generate_invoice_number(self):

        sequence, created = (
            InvoiceSequence.objects
            .select_for_update()
            .get_or_create(
                tenant=self.tenant,
            )
        )


        number = sequence.next_number


        sequence.next_number += 1


        sequence.save(
            update_fields=[
                "next_number",
                "updated_at",
            ]
        )


        return (
            f"INV-{number:06d}"
        )



    def save(self, *args, **kwargs):

        if not self.invoice_no:

            with transaction.atomic():

                self.invoice_no = (
                    self.generate_invoice_number()
                )


        super().save(*args, **kwargs)


    def update_payment_status(self):
        """
        Recalculate payment_status from actual payment records.
        Call this whenever a Payment is added/removed.
        Must be called inside an atomic block that already locked this invoice.
        """
        from django.db.models import Sum
        from django.utils import timezone

        amount_paid = (
            self.payments
            .filter(is_active=True)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        if amount_paid >= self.total:
            status = "paid"
        elif amount_paid > Decimal("0.00"):
            status = "partially_paid"
        elif (
            self.due_date
            and self.due_date < timezone.now().date()
        ):
            status = "overdue"
        else:
            status = "unpaid"

        self.payment_status = status
        self.save(update_fields=["payment_status", "updated_at"])


    def __str__(self):

        return (
            f"Invoice {self.invoice_no}"
        )




class InvoiceItem(TenantBaseModel):

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
    )


    harvest = models.ForeignKey(
        Harvest,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoice_items",
    )


    meat_inventory = models.ForeignKey(
        MeatInventory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoice_items",
    )


    egg_inventory = models.ForeignKey(
        EggInventory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoice_items",
    )


    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )


    unit = models.CharField(
        max_length=20,
        choices=[
            ("bird", "Bird"),
            ("kg", "Kilogram"),
            ("piece", "Piece"),
            ("crate", "Crate"),
            ("egg", "Egg"),
            ("tray", "Tray"),
        ],
        default="bird",
    )

    stock_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        editable=False,
        default=Decimal("0.00"),
    )


    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )


    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        editable=False,
        default=Decimal("0.00"),
    )

    class Meta:
        db_table = "finance_invoice_item"

    def clean(self):

        sources = [
            self.harvest,
            self.meat_inventory,
            self.egg_inventory,
        ]


        selected_sources = sum(
            source is not None
            for source in sources
        )


        if selected_sources != 1:

            raise ValidationError(
                "Invoice item must have exactly one stock source."
            )



    def save(self, *args, **kwargs):

        if self.harvest and not self.quantity:

            self.quantity = Decimal(
                self.harvest.birds_harvested
            )

        if self.harvest:

            self.unit = "bird"
            self.stock_quantity = self.quantity


        elif self.egg_inventory:
            self.unit = normalize_egg_selling_unit(
                self.unit or EGG_SELLING_UNIT_PIECE
            )
            self.stock_quantity = convert_egg_sales_quantity_to_pieces(
                self.quantity,
                self.unit,
            )


        elif self.meat_inventory:

            self.unit = "kg"
            self.stock_quantity = self.quantity

        if not self.stock_quantity:
            self.stock_quantity = quantize_egg_quantity(self.quantity)

        self.total = (
            self.quantity *
            self.unit_price
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )


        super().save(*args, **kwargs)



    def __str__(self):

        return (
            f"{self.invoice.invoice_no} "
            f"- {self.quantity}"
        )