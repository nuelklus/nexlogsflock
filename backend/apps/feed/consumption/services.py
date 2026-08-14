from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError
from rest_framework import serializers

from .models import FeedInventory, FeedStockMovement


STOCK_UNIT = "kg"
STOCK_QUANTIZE = Decimal("0.01")


def quantize_stock_quantity(value):
    return Decimal(value).quantize(
        STOCK_QUANTIZE,
        rounding=ROUND_HALF_UP,
    )


def get_purchase_stock_quantity(purchase):
    return quantize_stock_quantity(
        purchase.quantity_bags * purchase.weight_per_bag
    )


def get_consumption_stock_quantity(consumption):
    return quantize_stock_quantity(
        consumption.quantity
    )


def _get_or_create_locked_inventory(
    *,
    tenant,
    branch,
    feed_type,
    user=None,
):
    inventory = (
        FeedInventory.objects
        .select_for_update()
        .filter(
            tenant=tenant,
            branch=branch,
            feed_type=feed_type,
            is_active=True,
        )
        .first()
    )

    if inventory:
        return inventory

    try:
        return FeedInventory.objects.create(
            tenant=tenant,
            branch=branch,
            feed_type=feed_type,
            quantity=Decimal("0.00"),
            available_quantity=Decimal("0.00"),
            unit=STOCK_UNIT,
            created_by=user,
            updated_by=user,
        )
    except IntegrityError:
        return (
            FeedInventory.objects
            .select_for_update()
            .get(
                tenant=tenant,
                branch=branch,
                feed_type=feed_type,
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
    return FeedStockMovement.objects.create(
        tenant=inventory.tenant,
        branch=inventory.branch,
        feed_inventory=inventory,
        feed_type=inventory.feed_type,
        movement_type=movement_type,
        quantity=quantize_stock_quantity(quantity),
        unit=STOCK_UNIT,
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
    feed_type,
    quantity_delta,
    movement_type,
    reference_type,
    reference_id,
    user=None,
    notes="",
):
    quantity_delta = quantize_stock_quantity(
        quantity_delta
    )

    inventory = _get_or_create_locked_inventory(
        tenant=tenant,
        branch=branch,
        feed_type=feed_type,
        user=user,
    )

    next_quantity = quantize_stock_quantity(
        inventory.quantity + quantity_delta
    )
    next_available = quantize_stock_quantity(
        inventory.available_quantity + quantity_delta
    )

    if next_available < 0:
        raise serializers.ValidationError(
            {
                "quantity": (
                    "Insufficient feed stock. "
                    f"Available: {inventory.available_quantity} kg."
                )
            }
        )

    if next_quantity < 0:
        raise serializers.ValidationError(
            {
                "quantity": (
                    "Feed stock cannot become negative."
                )
            }
        )

    inventory.quantity = next_quantity
    inventory.available_quantity = next_available
    inventory.unit = STOCK_UNIT
    inventory.updated_by = user
    inventory.save(
        update_fields=[
            "quantity",
            "available_quantity",
            "unit",
            "updated_by",
            "updated_at",
        ]
    )

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


def apply_purchase_create(
    purchase,
    *,
    user=None,
):
    return apply_inventory_delta(
        tenant=purchase.tenant,
        branch=purchase.branch,
        feed_type=purchase.feed_type,
        quantity_delta=get_purchase_stock_quantity(
            purchase
        ),
        movement_type="purchase",
        reference_type="feed_purchase",
        reference_id=purchase.id,
        user=user,
        notes="Feed purchase recorded.",
    )


def apply_purchase_update(
    previous_purchase,
    updated_purchase,
    *,
    user=None,
):
    old_quantity = get_purchase_stock_quantity(
        previous_purchase
    )
    new_quantity = get_purchase_stock_quantity(
        updated_purchase
    )

    old_key = (
        previous_purchase.branch_id,
        previous_purchase.feed_type_id,
    )
    new_key = (
        updated_purchase.branch_id,
        updated_purchase.feed_type_id,
    )

    if old_key != new_key:
        apply_inventory_delta(
            tenant=previous_purchase.tenant,
            branch=previous_purchase.branch,
            feed_type=previous_purchase.feed_type,
            quantity_delta=-old_quantity,
            movement_type="purchase_reversal",
            reference_type="feed_purchase",
            reference_id=updated_purchase.id,
            user=user,
            notes="Feed purchase moved or reclassified.",
        )
        apply_inventory_delta(
            tenant=updated_purchase.tenant,
            branch=updated_purchase.branch,
            feed_type=updated_purchase.feed_type,
            quantity_delta=new_quantity,
            movement_type="purchase",
            reference_type="feed_purchase",
            reference_id=updated_purchase.id,
            user=user,
            notes="Updated feed purchase applied.",
        )
        return

    difference = quantize_stock_quantity(
        new_quantity - old_quantity
    )

    if difference == 0:
        return

    apply_inventory_delta(
        tenant=updated_purchase.tenant,
        branch=updated_purchase.branch,
        feed_type=updated_purchase.feed_type,
        quantity_delta=difference,
        movement_type=(
            "purchase"
            if difference > 0
            else "purchase_reversal"
        ),
        reference_type="feed_purchase",
        reference_id=updated_purchase.id,
        user=user,
        notes="Feed purchase updated.",
    )


def apply_purchase_delete(
    purchase,
    *,
    user=None,
):
    return apply_inventory_delta(
        tenant=purchase.tenant,
        branch=purchase.branch,
        feed_type=purchase.feed_type,
        quantity_delta=-get_purchase_stock_quantity(
            purchase
        ),
        movement_type="purchase_reversal",
        reference_type="feed_purchase",
        reference_id=purchase.id,
        user=user,
        notes="Feed purchase deleted.",
    )


def apply_consumption_create(
    consumption,
    *,
    user=None,
):
    return apply_inventory_delta(
        tenant=consumption.tenant,
        branch=consumption.branch,
        feed_type=consumption.feed_type,
        quantity_delta=-get_consumption_stock_quantity(
            consumption
        ),
        movement_type="consumption",
        reference_type="feed_consumption",
        reference_id=consumption.id,
        user=user,
        notes="Feed consumption recorded.",
    )


def apply_consumption_update(
    previous_consumption,
    updated_consumption,
    *,
    user=None,
):
    old_quantity = get_consumption_stock_quantity(
        previous_consumption
    )
    new_quantity = get_consumption_stock_quantity(
        updated_consumption
    )

    old_key = (
        previous_consumption.branch_id,
        previous_consumption.feed_type_id,
    )
    new_key = (
        updated_consumption.branch_id,
        updated_consumption.feed_type_id,
    )

    if old_key != new_key:
        apply_inventory_delta(
            tenant=previous_consumption.tenant,
            branch=previous_consumption.branch,
            feed_type=previous_consumption.feed_type,
            quantity_delta=old_quantity,
            movement_type="consumption_reversal",
            reference_type="feed_consumption",
            reference_id=updated_consumption.id,
            user=user,
            notes="Feed consumption moved or reclassified.",
        )
        apply_inventory_delta(
            tenant=updated_consumption.tenant,
            branch=updated_consumption.branch,
            feed_type=updated_consumption.feed_type,
            quantity_delta=-new_quantity,
            movement_type="consumption",
            reference_type="feed_consumption",
            reference_id=updated_consumption.id,
            user=user,
            notes="Updated feed consumption applied.",
        )
        return

    difference = quantize_stock_quantity(
        old_quantity - new_quantity
    )

    if difference == 0:
        return

    apply_inventory_delta(
        tenant=updated_consumption.tenant,
        branch=updated_consumption.branch,
        feed_type=updated_consumption.feed_type,
        quantity_delta=difference,
        movement_type=(
            "consumption_reversal"
            if difference > 0
            else "consumption"
        ),
        reference_type="feed_consumption",
        reference_id=updated_consumption.id,
        user=user,
        notes="Feed consumption updated.",
    )


def apply_consumption_delete(
    consumption,
    *,
    user=None,
):
    return apply_inventory_delta(
        tenant=consumption.tenant,
        branch=consumption.branch,
        feed_type=consumption.feed_type,
        quantity_delta=get_consumption_stock_quantity(
            consumption
        ),
        movement_type="consumption_reversal",
        reference_type="feed_consumption",
        reference_id=consumption.id,
        user=user,
        notes="Feed consumption deleted.",
    )


def apply_manual_adjustment(
    *,
    tenant,
    branch,
    feed_type,
    quantity_delta,
    reason,
    reference_id=None,
    user=None,
):
    return apply_inventory_delta(
        tenant=tenant,
        branch=branch,
        feed_type=feed_type,
        quantity_delta=quantity_delta,
        movement_type="adjustment",
        reference_type="feed_adjustment",
        reference_id=reference_id,
        user=user,
        notes=reason,
    )
