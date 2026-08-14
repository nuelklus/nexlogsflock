from decimal import Decimal

from apps.inventory.egg.models import EggInventory, EggStockMovement
from apps.inventory.egg.services import apply_inventory_delta


PRODUCTION_GRADE_FIELD_MAP = {
    EggInventory.GRADE_LARGE: "large_eggs",
    EggInventory.GRADE_MEDIUM: "medium_eggs",
    EggInventory.GRADE_SMALL: "small_eggs",
    EggInventory.GRADE_PULLET: "pullet_eggs",
    EggInventory.GRADE_UNSORTED: "unsorted_eggs",
}

LEGACY_UNSORTED_FIELDS = (
    "good_eggs",
    "dirty_eggs",
    "double_yolk_eggs",
)


def get_inventory_grade_quantities(production):
    grade_quantities = {
        grade: Decimal(
            getattr(production, field_name, 0) or 0
        )
        for grade, field_name in PRODUCTION_GRADE_FIELD_MAP.items()
    }

    legacy_unsorted_total = sum(
        Decimal(getattr(production, field_name, 0) or 0)
        for field_name in LEGACY_UNSORTED_FIELDS
    )

    grade_quantities[EggInventory.GRADE_UNSORTED] += (
        legacy_unsorted_total
    )

    return grade_quantities


def add_egg_to_inventory(
    production,
    *,
    user=None,
):
    inventories = []

    for grade, quantity in get_inventory_grade_quantities(
        production
    ).items():
        if quantity <= 0:
            continue

        inventories.append(
            apply_inventory_delta(
                tenant=production.tenant,
                branch=production.branch,
                grade=grade,
                quantity_delta=quantity,
                movement_type=EggStockMovement.MOVEMENT_PRODUCTION,
                reference_type="egg_production",
                reference_id=production.id,
                movement_date=production.production_date,
                user=user,
                notes="Egg production recorded.",
            )
        )

    return inventories


def update_egg_inventory(
    old_production,
    new_production,
    *,
    user=None,
):
    old_quantities = get_inventory_grade_quantities(
        old_production
    )
    new_quantities = get_inventory_grade_quantities(
        new_production
    )

    old_branch_id = old_production.branch_id
    new_branch_id = new_production.branch_id

    if old_branch_id != new_branch_id:
        for grade, quantity in old_quantities.items():
            if quantity <= 0:
                continue

            apply_inventory_delta(
                tenant=old_production.tenant,
                branch=old_production.branch,
                grade=grade,
                quantity_delta=-quantity,
                movement_type=EggStockMovement.MOVEMENT_PRODUCTION_REVERSAL,
                reference_type="egg_production",
                reference_id=new_production.id,
                movement_date=old_production.production_date,
                user=user,
                notes="Egg production moved from another branch.",
            )

        for grade, quantity in new_quantities.items():
            if quantity <= 0:
                continue

            apply_inventory_delta(
                tenant=new_production.tenant,
                branch=new_production.branch,
                grade=grade,
                quantity_delta=quantity,
                movement_type=EggStockMovement.MOVEMENT_PRODUCTION,
                reference_type="egg_production",
                reference_id=new_production.id,
                movement_date=new_production.production_date,
                user=user,
                notes="Updated egg production applied.",
            )
        return

    for grade in PRODUCTION_GRADE_FIELD_MAP.keys():
        difference = new_quantities[grade] - old_quantities[grade]

        if difference == 0:
            continue

        apply_inventory_delta(
            tenant=new_production.tenant,
            branch=new_production.branch,
            grade=grade,
            quantity_delta=difference,
            movement_type=(
                EggStockMovement.MOVEMENT_PRODUCTION
                if difference > 0
                else EggStockMovement.MOVEMENT_PRODUCTION_REVERSAL
            ),
            reference_type="egg_production",
            reference_id=new_production.id,
            movement_date=new_production.production_date,
            user=user,
            notes="Egg production updated.",
        )


def remove_egg_from_inventory(
    production,
    *,
    user=None,
):
    for grade, quantity in get_inventory_grade_quantities(
        production
    ).items():
        if quantity <= 0:
            continue

        apply_inventory_delta(
            tenant=production.tenant,
            branch=production.branch,
            grade=grade,
            quantity_delta=-quantity,
            movement_type=EggStockMovement.MOVEMENT_PRODUCTION_REVERSAL,
            reference_type="egg_production",
            reference_id=production.id,
            movement_date=production.production_date,
            user=user,
            notes="Egg production deleted.",
        )
