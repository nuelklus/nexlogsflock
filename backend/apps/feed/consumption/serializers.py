from rest_framework import serializers

from .models import (
    FeedConsumption,
    FeedInventory,
    FeedStockMovement,
)


def get_user_display_name(user):
    if not user:
        return None

    full_name = (
        f"{user.first_name} {user.last_name}"
    ).strip()

    return full_name or user.email


class FeedInventorySerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )
    feed_type_name = serializers.CharField(
        source="feed_type.name",
        read_only=True,
    )

    class Meta:
        model = FeedInventory
        fields = (
            "id",
            "branch",
            "branch_name",
            "feed_type",
            "feed_type_name",
            "quantity",
            "available_quantity",
            "unit",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class FeedStockMovementSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )
    feed_type_name = serializers.CharField(
        source="feed_type.name",
        read_only=True,
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FeedStockMovement
        fields = (
            "id",
            "feed_inventory",
            "branch",
            "branch_name",
            "feed_type",
            "feed_type_name",
            "movement_type",
            "quantity",
            "unit",
            "reference_type",
            "reference_id",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
        )
        read_only_fields = fields

    def get_created_by_name(self, obj):
        return get_user_display_name(
            obj.created_by
        )


class FeedConsumptionSerializer(serializers.ModelSerializer):
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
    house_name = serializers.CharField(
        source="house.name",
        read_only=True,
    )
    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )
    feed_type_name = serializers.CharField(
        source="feed_type.name",
        read_only=True,
    )
    consumption_date = serializers.DateField(
        source="date",
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FeedConsumption
        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "branch",
            "branch_name",
            "house",
            "house_name",
            "batch",
            "batch_number",
            "feed_type",
            "feed_type_name",
            "consumption_date",
            "date",
            "quantity",
            "unit",
            "notes",
            "created_by",
            "created_by_name",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "branch_name",
            "house_name",
            "batch_number",
            "feed_type_name",
            "created_by",
            "created_by_name",
            "is_active",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "date": {"write_only": True, "required": False},
        }

    def get_created_by_name(self, obj):
        return get_user_display_name(
            obj.created_by
        )

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

    def validate(self, attrs):
        request = self.context.get("request")
        tenant = getattr(
            request,
            "tenant",
            None,
        )

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )
        house = attrs.get(
            "house",
            getattr(self.instance, "house", None),
        )
        batch = attrs.get(
            "batch",
            getattr(self.instance, "batch", None),
        )
        feed_type = attrs.get(
            "feed_type",
            getattr(self.instance, "feed_type", None),
        )
        consumption_date = attrs.get(
            "date",
            attrs.get(
                "consumption_date",
                getattr(self.instance, "date", None),
            ),
        )

        if not branch:
            raise serializers.ValidationError(
                {
                    "branch":
                    "Branch is required."
                }
            )

        if not house:
            raise serializers.ValidationError(
                {
                    "house":
                    "House is required."
                }
            )

        if not batch:
            raise serializers.ValidationError(
                {
                    "batch":
                    "Bird batch is required."
                }
            )

        if not feed_type:
            raise serializers.ValidationError(
                {
                    "feed_type":
                    "Feed type is required."
                }
            )

        if not consumption_date:
            raise serializers.ValidationError(
                {
                    "consumption_date":
                    "Consumption date is required."
                }
            )

        attrs["date"] = consumption_date

        if not tenant:
            raise serializers.ValidationError(
                "Tenant context is required."
            )

        if branch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "branch":
                    "Invalid branch."
                }
            )

        if house.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "house":
                    "Invalid house."
                }
            )

        if batch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "batch":
                    "Invalid bird batch."
                }
            )

        if feed_type.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "feed_type":
                    "Invalid feed type."
                }
            )

        if house.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "house":
                    "House does not belong to the selected branch."
                }
            )

        if batch.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "batch":
                    "Batch does not belong to the selected branch."
                }
            )

        if batch.house_id != house.id:
            raise serializers.ValidationError(
                {
                    "batch":
                    "Batch does not belong to the selected house."
                }
            )

        return attrs
