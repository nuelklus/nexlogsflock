from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import IntegrityError
from rest_framework import serializers

from .models import EggInventory, EggStockMovement


EGG_STOCK_UNIT = EggInventory.UNIT_PIECE
EGG_STOCK_QUANTIZE = Decimal("0.01")
EGG_SELLING_UNIT_PIECE = "piece"
EGG_SELLING_UNIT_CRATE = "crate"
LEGACY_EGG_SELLING_UNIT_EGG = "egg"
LEGACY_EGG_SELLING_UNIT_TRAY = "tray"


def quantize_egg_quantity(value):
    return Decimal(str(value)).quantize(
        EGG_STOCK_QUANTIZE,
        rounding=ROUND_HALF_UP,
    )


def get_egg_crate_capacity():
    return quantize_egg_quantity(
        getattr(settings, "EGG_CRATE_CAPACITY", 30)
    )


def normalize_egg_selling_unit(unit):
    if unit in (EGG_SELLING_UNIT_PIECE, LEGACY_EGG_SELLING_UNIT_EGG):
        return EGG_SELLING_UNIT_PIECE

    if unit in (EGG_SELLING_UNIT_CRATE, LEGACY_EGG_SELLING_UNIT_TRAY):
        return EGG_SELLING_UNIT_CRATE

    raise serializers.ValidationError(
        {
            "unit": (
                "Egg sales unit must be either piece or crate."
            )
        }
    )


def convert_egg_sales_quantity_to_pieces(quantity, unit):
    quantity = quantize_egg_quantity(quantity)
    normalized_unit = normalize_egg_selling_unit(unit)

    if normalized_unit == EGG_SELLING_UNIT_PIECE:
        return quantity

    return quantize_egg_quantity(
        quantity * get_egg_crate_capacity()
    )


def _get_or_create_locked_inventory(
    *,
    tenant,
    branch,
    grade,
    movement_date=None,
    user=None,
):
    inventory = (
        EggInventory.objects
        .select_for_update()
        .filter(
            tenant=tenant,
            branch=branch,
            grade=grade,
            is_active=True,
        )
        .first()
    )

    if inventory:
        return inventory

    defaults = {
        "quantity": Decimal("0.00"),
        "available_quantity": Decimal("0.00"),
        "unit": EGG_STOCK_UNIT,
        "created_by": user,
        "updated_by": user,
    }

    if movement_date is not None:
        defaults["collection_start_date"] = movement_date
        defaults["collection_end_date"] = movement_date

    try:
        return EggInventory.objects.create(
            tenant=tenant,
            branch=branch,
            grade=grade,
            **defaults,
        )
    except IntegrityError:
        return (
            EggInventory.objects
            .select_for_update()
            .get(
                tenant=tenant,
                branch=branch,
                grade=grade,
                is_active=True,
            )
        )


def _create_stock_movement(
    *,
    inventory,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes="",
    user=None,
):
    return EggStockMovement.objects.create(
        tenant=inventory.tenant,
        branch=inventory.branch,
        egg_inventory=inventory,
        grade=inventory.grade,
        movement_type=movement_type,
        quantity=quantize_egg_quantity(quantity),
        unit=EGG_STOCK_UNIT,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
        created_by=user,
        updated_by=user,
    )


def apply_inventory_delta(
    *,
    tenant,
    branch,
    grade,
    quantity_delta,
    movement_type,
    reference_type,
    reference_id,
    movement_date=None,
    user=None,
    notes="",
):
    quantity_delta = quantize_egg_quantity(quantity_delta)

    inventory = _get_or_create_locked_inventory(
        tenant=tenant,
        branch=branch,
        grade=grade,
        movement_date=movement_date,
        user=user,
    )

    next_quantity = quantize_egg_quantity(
        inventory.quantity + quantity_delta
    )
    next_available = quantize_egg_quantity(
        inventory.available_quantity + quantity_delta
    )

    if next_quantity < 0 or next_available < 0:
        raise serializers.ValidationError(
            {
                "quantity": (
                    "Insufficient egg inventory. "
                    f"Available {inventory.grade} stock: "
                    f"{inventory.available_quantity} pieces."
                )
            }
        )

    inventory.quantity = next_quantity
    inventory.available_quantity = next_available
    inventory.unit = EGG_STOCK_UNIT
    inventory.updated_by = user

    if movement_date is not None and quantity_delta > 0:
        if (
            inventory.collection_start_date is None
            or movement_date < inventory.collection_start_date
        ):
            inventory.collection_start_date = movement_date

        if (
            inventory.collection_end_date is None
            or movement_date > inventory.collection_end_date
        ):
            inventory.collection_end_date = movement_date

    update_fields = [
        "quantity",
        "available_quantity",
        "unit",
        "updated_by",
        "updated_at",
    ]

    if movement_date is not None and quantity_delta > 0:
        update_fields.extend(
            ["collection_start_date", "collection_end_date"]
        )

    inventory.save(update_fields=update_fields)

    _create_stock_movement(
        inventory=inventory,
        movement_type=movement_type,
        quantity=quantity_delta,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
        user=user,
    )

    return inventory
