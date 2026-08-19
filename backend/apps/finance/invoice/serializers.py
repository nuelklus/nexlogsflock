from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers

from apps.inventory.egg.models import EggInventory, EggStockMovement
from apps.inventory.egg.services import (
    EGG_SELLING_UNIT_CRATE,
    EGG_SELLING_UNIT_PIECE,
    apply_inventory_delta,
    convert_egg_sales_quantity_to_pieces,
    get_egg_crate_capacity,
    normalize_egg_selling_unit,
)
from apps.inventory.meat.models import MeatInventory
from apps.production.harvest.models import Harvest

from .models import Invoice, InvoiceItem


class InvoiceItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    source_available = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    egg_grade = serializers.SerializerMethodField()
    physical_quantity = serializers.DecimalField(
        source="stock_quantity",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "harvest",
            "meat_inventory",
            "egg_inventory",
            "product_name",
            "egg_grade",
            "source_available",
            "branch_name",
            "quantity",
            "unit",
            "physical_quantity",
            "unit_price",
            "total",
            "created_at",
            "updated_at",
        ]

    def get_product_name(self, obj):
        if obj.harvest:
            batch_no = getattr(
                getattr(obj.harvest, "batch", None),
                "batch_number",
                "—",
            )
            return f"Live Birds – {batch_no}"

        if obj.meat_inventory:
            return getattr(obj.meat_inventory, "product_type", "Meat")

        if obj.egg_inventory:
            return f"{obj.egg_inventory.get_grade_display()} Eggs"

        return None

    def get_egg_grade(self, obj):
        if obj.egg_inventory:
            return obj.egg_inventory.grade
        return None

    def get_source_available(self, obj):
        if obj.egg_inventory:
            return float(obj.egg_inventory.available_quantity)

        if obj.meat_inventory:
            return float(obj.meat_inventory.available_quantity)

        if obj.harvest:
            sold = (
                obj.harvest.invoice_items
                .filter(is_active=True)
                .exclude(id=obj.id)
                .aggregate(total=Sum("stock_quantity"))["total"]
                or Decimal("0")
            )
            return float(
                Decimal(obj.harvest.birds_harvested) - sold
            )

        return None

    def get_branch_name(self, obj):
        if obj.harvest and obj.harvest.branch:
            return obj.harvest.branch.name

        if obj.egg_inventory and obj.egg_inventory.branch:
            return obj.egg_inventory.branch.name

        if obj.meat_inventory and getattr(obj.meat_inventory, "branch", None):
            return obj.meat_inventory.branch.name

        return None

class InvoiceItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            "harvest",
            "meat_inventory",
            "egg_inventory",
            "quantity",
            "unit",
            "unit_price",
        ]
        extra_kwargs = {
            "quantity": {"required": False, "allow_null": True},
            "unit": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        harvest = attrs.get("harvest")
        egg = attrs.get("egg_inventory")
        meat = attrs.get("meat_inventory")
        quantity = attrs.get("quantity")
        unit = attrs.get("unit")

        sources_count = sum(
            source is not None for source in [harvest, egg, meat]
        )
        if sources_count != 1:
            raise serializers.ValidationError(
                {
                    "product": (
                        "Select exactly one source: "
                        "harvest, egg inventory, or meat inventory."
                    )
                }
            )

        if quantity is not None and Decimal(str(quantity)) <= 0:
            raise serializers.ValidationError(
                {"quantity": "Quantity must be greater than zero."}
            )

        if Decimal(str(attrs.get("unit_price", 0))) <= 0:
            raise serializers.ValidationError(
                {"unit_price": "Unit price must be greater than zero."}
            )

        if harvest:
            allowed = ("pending", "partially_sold")
            if harvest.status not in allowed:
                raise serializers.ValidationError(
                    {
                        "harvest":
                        "This harvest is not available for sale."
                    }
                )

            already_sold = (
                harvest.invoice_items
                .filter(is_active=True)
                .aggregate(total=Sum("stock_quantity"))["total"]
                or Decimal("0")
            )
            available = Decimal(harvest.birds_harvested) - already_sold

            if quantity:
                if Decimal(str(quantity)) > available:
                    raise serializers.ValidationError(
                        {
                            "quantity": (
                                f"Only {available} birds available "
                                f"from this harvest."
                            )
                        }
                    )
            else:
                attrs["quantity"] = available

            attrs["unit"] = "bird"

        if egg:
            if not quantity:
                raise serializers.ValidationError(
                    {"quantity": "Quantity is required for egg sales."}
                )

            if not unit:
                raise serializers.ValidationError(
                    {
                        "unit":
                        "Selling unit is required for egg sales."
                    }
                )

            normalized_unit = normalize_egg_selling_unit(unit)
            attrs["unit"] = normalized_unit
            attrs["stock_quantity"] = convert_egg_sales_quantity_to_pieces(
                quantity,
                normalized_unit,
            )

        if meat:
            if not quantity:
                raise serializers.ValidationError(
                    {"quantity": "Quantity is required for meat sales."}
                )

            attrs["unit"] = "kg"

        return attrs

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemReadSerializer(many=True, read_only=True)
    items_write = InvoiceItemWriteSerializer(
        many=True,
        write_only=True,
        source="items",
    )
    customer_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    crate_capacity = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "customer",
            "customer_name",
            "branch",
            "branch_name",
            "invoice_no",
            "invoice_date",
            "due_date",
            "notes",
            "items",
            "items_write",
            "crate_capacity",
            "total",
            "payment_status",
            "amount_paid",
            "balance_due",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_no",
            "crate_capacity",
            "total",
            "payment_status",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None

    def get_crate_capacity(self, obj):
        return str(get_egg_crate_capacity())

    def get_amount_paid(self, obj):
        total = (
            obj.payments
            .filter(is_active=True)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        return float(total)

    def get_balance_due(self, obj):
        paid = Decimal(str(self.get_amount_paid(obj)))
        balance = obj.total - paid
        return float(max(balance, Decimal("0.00")))

    def validate(self, attrs):
        request = self.context.get("request")
        if request is None:
            raise serializers.ValidationError(
                {"request": "Request context is required to validate an invoice."}
            )

        customer = attrs.get(
            "customer",
            self.instance.customer if self.instance else None,
        )
        branch = attrs.get(
            "branch",
            self.instance.branch if self.instance else None,
        )
        items = attrs.get("items")

        if customer and customer.tenant_id != request.tenant.id:
            raise serializers.ValidationError(
                {
                    "customer":
                    "Customer does not belong to this tenant."
                }
            )

        if branch and branch.tenant_id != request.tenant.id:
            raise serializers.ValidationError(
                {
                    "branch":
                    "Branch does not belong to this tenant."
                }
            )

        if items is not None:
            if not items:
                raise serializers.ValidationError(
                    {
                        "items_write":
                        "At least one invoice item is required."
                    }
                )

            if branch is None:
                raise serializers.ValidationError(
                    {
                        "branch":
                        "Branch is required when invoice items are provided."
                    }
                )

            item_branch_ids = set()

            for item in items:
                egg_inventory = item.get("egg_inventory")
                harvest = item.get("harvest")
                meat_inventory = item.get("meat_inventory")

                if egg_inventory:
                    if egg_inventory.tenant_id != request.tenant.id:
                        raise serializers.ValidationError(
                            {
                                "items_write":
                                "Egg inventory does not belong to this tenant."
                            }
                        )
                    item_branch_ids.add(egg_inventory.branch_id)

                if harvest:
                    if harvest.tenant_id != request.tenant.id:
                        raise serializers.ValidationError(
                            {
                                "items_write":
                                "Harvest does not belong to this tenant."
                            }
                        )
                    item_branch_ids.add(harvest.branch_id)

                if meat_inventory:
                    if meat_inventory.tenant_id != request.tenant.id:
                        raise serializers.ValidationError(
                            {
                                "items_write":
                                "Meat inventory does not belong to this tenant."
                            }
                        )
                    item_branch_ids.add(meat_inventory.branch_id)

            if len(item_branch_ids) > 1:
                raise serializers.ValidationError(
                    {
                        "items_write":
                        "All invoice items must come from the same branch."
                    }
                )

            if item_branch_ids and branch.id not in item_branch_ids:
                raise serializers.ValidationError(
                    {
                        "branch":
                        "Invoice branch must match the source inventory branch."
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context.get("request")

        if request is None:
            raise serializers.ValidationError(
                {"request": "Request context is required to create an invoice."}
            )

        invoice = Invoice.objects.create(
            # tenant=request.tenant,
            # created_by=request.user,
            # updated_by=request.user,
            **validated_data,
        )

        self._replace_items(
            invoice,
            items_data,
            request=request,
        )

        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        request = self.context["request"]

        invoice = (
            Invoice.objects
            .select_for_update()
            .get(pk=instance.pk)
        )

        for attr, value in validated_data.items():
            setattr(invoice, attr, value)

        invoice.updated_by = request.user
        invoice.save()

        if items_data is not None:
            if invoice.payments.filter(is_active=True).exists():
                raise serializers.ValidationError(
                    {
                        "invoice":
                        "Invoices with payments cannot be edited."
                    }
                )

            self._restore_all_items(invoice, request=request)
            invoice.items.all().delete()
            self._replace_items(
                invoice,
                items_data,
                request=request,
            )
        else:
            invoice.total = sum(
                item.total for item in invoice.items.filter(is_active=True)
            )
            invoice.save(update_fields=["total", "updated_at"])

        invoice.update_payment_status()
        return invoice

    @transaction.atomic
    def cancel(self, invoice, *, request):
        if invoice.payments.filter(is_active=True).exists():
            raise serializers.ValidationError(
                {
                    "invoice": (
                        "This invoice already has payments recorded, so it cannot be cancelled. "
                        "The payment history must remain for audit and accounting records."
                    )
                }
            )

        self._restore_all_items(invoice, request=request)
        invoice.items.update(
            is_active=False,
            updated_by=request.user,
        )
        invoice.is_active = False
        invoice.updated_by = request.user
        invoice.save(update_fields=["is_active", "updated_by", "updated_at"])

    def _replace_items(self, invoice, items_data, *, request):
        created_items = []

        for item_data in items_data:
            item_data.pop("stock_quantity", None)
            item = InvoiceItem.objects.create(
                invoice=invoice,
                tenant=request.tenant,
                created_by=request.user,
                updated_by=request.user,
                **item_data,
            )
            self._apply_item_stock(item, request=request)
            created_items.append(item)

        invoice.total = sum(item.total for item in created_items)
        invoice.save(update_fields=["total", "updated_at"])
        invoice.update_payment_status()

    def _restore_all_items(self, invoice, *, request):
        items = list(
            invoice.items
            .filter(is_active=True)
            .select_related(
                "harvest",
                "egg_inventory",
                "meat_inventory",
            )
        )

        for item in items:
            self._restore_item_stock(item, request=request)

    def _apply_item_stock(self, item, *, request):
        if item.harvest:
            harvest = (
                Harvest.objects
                .select_for_update()
                .get(pk=item.harvest_id)
            )

            already_sold = (
                harvest.invoice_items
                .filter(is_active=True)
                .exclude(pk=item.pk)
                .aggregate(total=Sum("stock_quantity"))["total"]
                or Decimal("0")
            )
            available = Decimal(harvest.birds_harvested) - already_sold

            if item.stock_quantity > available:
                raise serializers.ValidationError(
                    {"quantity": f"Only {available} birds available."}
                )

            total_sold_after = already_sold + item.stock_quantity
            harvest.status = (
                "sold"
                if total_sold_after >= Decimal(harvest.birds_harvested)
                else "partially_sold"
            )
            harvest.save(update_fields=["status", "updated_at"])
            return

        if item.egg_inventory:
            stock = (
                EggInventory.objects
                .select_for_update()
                .get(pk=item.egg_inventory_id)
            )

            if stock.tenant_id != request.tenant.id:
                raise serializers.ValidationError(
                    {"egg_inventory": "Invalid egg inventory."}
                )

            if stock.branch_id != item.invoice.branch_id:
                raise serializers.ValidationError(
                    {
                        "egg_inventory":
                        "Egg inventory branch must match the invoice branch."
                    }
                )

            if stock.available_quantity < item.stock_quantity:
                raise serializers.ValidationError(
                    {
                        "quantity": (
                            "Not enough eggs available in inventory for "
                            f"{stock.get_grade_display()} eggs."
                        )
                    }
                )

            apply_inventory_delta(
                tenant=stock.tenant,
                branch=stock.branch,
                grade=stock.grade,
                quantity_delta=-item.stock_quantity,
                movement_type=EggStockMovement.MOVEMENT_INVOICE_SALE,
                reference_type="invoice",
                reference_id=item.invoice_id,
                movement_date=item.invoice.invoice_date,
                user=request.user,
                notes="Eggs sold through invoice.",
            )
            return

        if item.meat_inventory:
            stock = (
                MeatInventory.objects
                .select_for_update()
                .get(pk=item.meat_inventory_id)
            )
            if stock.available_quantity < item.stock_quantity:
                raise serializers.ValidationError(
                    {"quantity": "Not enough meat available in inventory."}
                )
            stock.available_quantity -= item.stock_quantity
            stock.quantity -= item.stock_quantity
            stock.save(
                update_fields=[
                    "available_quantity",
                    "quantity",
                    "updated_at",
                ]
            )

    def _restore_item_stock(self, item, *, request):
        if item.harvest:
            harvest = (
                Harvest.objects
                .select_for_update()
                .get(pk=item.harvest_id)
            )

            remaining_sold = (
                harvest.invoice_items
                .filter(is_active=True)
                .exclude(pk=item.pk)
                .aggregate(total=Sum("stock_quantity"))["total"]
                or Decimal("0")
            )

            if remaining_sold <= 0:
                harvest.status = "pending"
            elif remaining_sold < Decimal(harvest.birds_harvested):
                harvest.status = "partially_sold"
            else:
                harvest.status = "sold"

            harvest.save(update_fields=["status", "updated_at"])
            return

        if item.egg_inventory:
            stock = (
                EggInventory.objects
                .select_for_update()
                .get(pk=item.egg_inventory_id)
            )
            apply_inventory_delta(
                tenant=stock.tenant,
                branch=stock.branch,
                grade=stock.grade,
                quantity_delta=item.stock_quantity,
                movement_type=EggStockMovement.MOVEMENT_INVOICE_SALE_REVERSAL,
                reference_type="invoice",
                reference_id=item.invoice_id,
                movement_date=item.invoice.invoice_date,
                user=request.user,
                notes="Egg inventory restored from invoice change.",
            )
            return

        if item.meat_inventory:
            stock = (
                MeatInventory.objects
                .select_for_update()
                .get(pk=item.meat_inventory_id)
            )
            stock.available_quantity += item.stock_quantity
            stock.quantity += item.stock_quantity
            stock.save(
                update_fields=[
                    "available_quantity",
                    "quantity",
                    "updated_at",
                ]
            )
