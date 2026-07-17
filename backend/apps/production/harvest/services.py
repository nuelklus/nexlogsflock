from apps.inventory.meat.models import MeatInventory


def add_meat_to_inventory(harvest):

    inventory, created = MeatInventory.objects.get_or_create(

        tenant=harvest.tenant,

        branch=harvest.branch,

        is_active=True,

        defaults={

            "quantity": 0,

            "available_quantity": 0,

            "unit": "piece",

            "inventory_date": harvest.harvest_date,

        },

    )

    inventory.quantity += harvest.birds_harvested

    inventory.available_quantity += harvest.birds_harvested

    inventory.inventory_date = harvest.harvest_date

    inventory.save(

        update_fields=[

            "quantity",

            "available_quantity",

            "inventory_date",

            "updated_at",

        ]

    )


    harvest.status = "processed"

    harvest.save(

        update_fields=[

            "status",

            "updated_at",

        ]

    )