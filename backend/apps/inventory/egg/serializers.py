from decimal import Decimal

from rest_framework import serializers

from .models import EggInventory
from .services import get_egg_crate_capacity, quantize_egg_quantity


class EggInventorySerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    created_by_email = serializers.CharField(
        source="created_by.email",
        read_only=True,
        allow_null=True,
    )

    updated_by_email = serializers.CharField(
        source="updated_by.email",
        read_only=True,
        allow_null=True,
    )

    crates = serializers.SerializerMethodField()
    available_crates = serializers.SerializerMethodField()
    crate_capacity = serializers.SerializerMethodField()

    class Meta:

        model = EggInventory

        fields = (

            "id",

            "tenant_id",
            "tenant_name",

            "branch",
            "branch_name",

            "quantity",
            "available_quantity",
            "crates",
            "available_crates",
            "crate_capacity",

            "unit",
            "grade",

            "collection_start_date",
            "collection_end_date",

            "storage_location",
            "notes",

            "created_by_email",
            "updated_by_email",

            "is_active",

            "created_at",
            "updated_at",
        )

        read_only_fields = (

            "id",

            "tenant_id",
            "tenant_name",
            "crates",
            "available_crates",
            "crate_capacity",

            "created_by_email",
            "updated_by_email",

            "created_at",
            "updated_at",
        )

    def get_crates(self, obj):
        return str(
            quantize_egg_quantity(
                Decimal(obj.quantity) / get_egg_crate_capacity()
            )
        )

    def get_available_crates(self, obj):
        return str(
            quantize_egg_quantity(
                Decimal(obj.available_quantity)
                / get_egg_crate_capacity()
            )
        )

    def get_crate_capacity(self, obj):
        return str(get_egg_crate_capacity())

    def validate(self, attrs):

        start = attrs.get(
            "collection_start_date"
        )

        end = attrs.get(
            "collection_end_date"
        )

        if start and end and end < start:

            raise serializers.ValidationError(
                "Collection end date cannot be before collection start date."
            )


        quantity = attrs.get(
            "quantity"
        )

        available = attrs.get(
            "available_quantity"
        )


        if (
            quantity is not None
            and
            available is not None
            and
            available > quantity
        ):

            raise serializers.ValidationError(
                "Available quantity cannot exceed quantity."
            )

        return attrs
