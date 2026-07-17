from decimal import Decimal
from django.conf import settings
from django.db import models, transaction
from decimal import Decimal, ROUND_HALF_UP
from apps.core.tenant.models import TenantBaseModel
from apps.livestock.purchase.models import Customer
from apps.production.harvest.models import Harvest
from apps.inventory.meat.models import MeatInventory
from apps.inventory.egg.models import EggInventory
from django.core.exceptions import ValidationError


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





class Invoice(TenantBaseModel):

    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    invoice_no = models.CharField(
        max_length=100,
        editable=False,
    )


    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
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
            ("egg", "Egg"),
            ("tray", "Tray"),
            ("piece", "Piece"),
        ],
        default="bird",
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

        if self.harvest:

            self.quantity = Decimal(
                self.harvest.birds_harvested
            )

            self.unit = "bird"


        elif self.egg_inventory:

            self.unit = "egg"


        elif self.meat_inventory:

            self.unit = "kg"


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
