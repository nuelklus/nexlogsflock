from django.db import transaction
from django.core.exceptions import ValidationError

from rest_framework import serializers

from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):

    product_name = serializers.SerializerMethodField()


    class Meta:

        model = InvoiceItem

        fields = [

            "id",

            "harvest",

            "meat_inventory",

            "egg_inventory",

            "product_name",

            "quantity",

            "unit",

            "unit_price",

            "total",

            "created_at",

            "updated_at",
        ]


        read_only_fields = [

            "id",

            "unit",

            "total",

            "product_name",

            "created_at",

            "updated_at",
        ]

        extra_kwargs = {

            "quantity": {
                "required": False,
                "allow_null": True,
            }

        }

    def validate(self, attrs):

        harvest = attrs.get(
            "harvest"
        )

        egg = attrs.get(
            "egg_inventory"
        )

        meat = attrs.get(
            "meat_inventory"
        )

        quantity = attrs.get(
            "quantity"
        )


        # Make sure only one stock source is selected

        sources = [

            harvest,

            egg,

            meat,

        ]


        selected_sources = sum(
            source is not None
            for source in sources
        )


        if selected_sources != 1:

            raise serializers.ValidationError(
                {
                    "product":
                    (
                        "Select exactly one source: "
                        "harvest, egg inventory, or meat inventory."
                    )
                }
            )


        # Harvest quantity is automatic
        if harvest and quantity:

            raise serializers.ValidationError(
                {
                    "quantity":
                    (
                        "Quantity is automatically "
                        "taken from harvest."
                    )
                }
            )


        # Harvest must be pending
        if harvest:

            if harvest.status != "pending":

                raise serializers.ValidationError(
                    {
                        "harvest":
                        "This harvest has already been sold or moved to inventory."
                    }
                )


        # Inventory sales require quantity

        if (egg or meat) and not quantity:

            raise serializers.ValidationError(
                {
                    "quantity":
                    (
                        "Quantity is required "
                        "for inventory sales."
                    )
                }
            )


        return attrs



    def get_product_name(self, obj):

        if obj.harvest:

            return (
                f"Live Birds - "
                f"{obj.harvest.batch.batch_number}"
            )


        if obj.meat_inventory:

            return obj.meat_inventory.product_type


        if obj.egg_inventory:

            return "Eggs"


        return None

class InvoiceSerializer(serializers.ModelSerializer):

    items = InvoiceItemSerializer(
        many=True
    )


    class Meta:

        model = Invoice

        fields = [

            "id",

            "customer",

            "invoice_no",

            "items",

            "total",

        ]


        read_only_fields = [

            "id",

            "invoice_no",

            "total",

        ]



    @transaction.atomic
    def create(
        self,
        validated_data
    ):

        items_data = validated_data.pop(
            "items",
            []
        )


        request = self.context["request"]


        invoice = Invoice.objects.create(

            # tenant=request.tenant,

            **validated_data
        )



        for item_data in items_data:


            item = InvoiceItem.objects.create(

                invoice=invoice,

                tenant=request.tenant,

                **item_data
            )


            self.process_stock(item)



        invoice.total = sum(

            item.total

            for item in invoice.items.all()

        )


        invoice.save(

            update_fields=[

                "total",

                "updated_at",

            ]

        )


        return invoice




    def process_stock(self, item):
        # Live bird sale
        if item.harvest:

            harvest = item.harvest

            if harvest.status != "pending":

                raise serializers.ValidationError(
                    {
                        "harvest":
                        "This harvest has already been sold or moved to inventory."
                    }
                )

            harvest.status = "sold"

            harvest.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        # Egg sale
        elif item.egg_inventory:

            stock = item.egg_inventory

            if stock.available_quantity < item.quantity:

                raise serializers.ValidationError(
                    {
                        "quantity":
                        "Not enough eggs available in inventory."
                    }
                )

            stock.available_quantity -= item.quantity

            stock.save(
                update_fields=[
                    "available_quantity",
                    "updated_at",
                ]
            )

        # Meat sale
        elif item.meat_inventory:

            stock = item.meat_inventory

            if stock.available_quantity < item.quantity:

                raise serializers.ValidationError(
                    {
                        "quantity":
                        "Not enough meat available in inventory."
                    }
                )

            stock.available_quantity -= item.quantity

            stock.save(
                update_fields=[
                    "available_quantity",
                    "updated_at",
                ]
            )