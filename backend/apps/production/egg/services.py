from decimal import Decimal

from apps.inventory.egg.models import EggInventory



def add_egg_to_inventory(
    production,
):

    total_collected = (
        Decimal(production.good_eggs)
        +
        Decimal(production.dirty_eggs)
        +
        Decimal(production.small_eggs)
        +
        Decimal(production.double_yolk_eggs)
    )


    inventory, created = EggInventory.objects.get_or_create(

        tenant=production.tenant,

        branch=production.branch,

        is_active=True,

        defaults={

            "quantity": Decimal("0.00"),

            "available_quantity": Decimal("0.00"),

            "unit": "egg",

            "grade": "mixed",

            "collection_start_date":
                production.production_date,

            "collection_end_date":
                production.production_date,

        },

    )


    inventory.quantity += total_collected

    inventory.available_quantity += total_collected


    inventory.collection_end_date = (
        production.production_date
    )


    inventory.save(
        update_fields=[
            "quantity",
            "available_quantity",
            "collection_end_date",
            "updated_at",
        ]
    )


    return inventory

def calculate_total_eggs(production):

    return (

        Decimal(production.good_eggs)

        +

        Decimal(production.dirty_eggs)

        +

        Decimal(production.small_eggs)

        +

        Decimal(production.double_yolk_eggs)

    )

def update_egg_inventory(
    old_production,
    new_production,
):


    old_total = calculate_total_eggs(
        old_production
    )


    new_total = calculate_total_eggs(
        new_production
    )


    difference = new_total - old_total


    if difference == 0:
        return


    inventory = EggInventory.objects.get(

        tenant=new_production.tenant,

        branch=new_production.branch,

        is_active=True,

    )


    inventory.quantity += difference


    inventory.available_quantity += difference


    inventory.save(
        update_fields=[
            "quantity",
            "available_quantity",
            "updated_at",
        ]
    )

def remove_egg_from_inventory(production):

    total_collected = calculate_total_eggs(
        production
    )


    inventory = EggInventory.objects.get(

        tenant=production.tenant,

        branch=production.branch,

        is_active=True,

    )


    inventory.quantity -= total_collected

    inventory.available_quantity -= total_collected


    inventory.save(
        update_fields=[
            "quantity",
            "available_quantity",
            "updated_at",
        ]
    )