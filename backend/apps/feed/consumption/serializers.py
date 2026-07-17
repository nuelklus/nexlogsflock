from rest_framework import serializers

from .models import FeedConsumption


class FeedConsumptionSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
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


    class Meta:

        model = FeedConsumption

        fields = (
            "id",

            # Tenant information
            "tenant_id",
            "tenant_name",

            # Farm data
            "batch",
            "batch_number",

            "feed_type",
            "feed_type_name",

            "quantity",
            "date",

            # Audit information
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

            "batch_number",
            "feed_type_name",

            "created_by_email",
            "updated_by_email",

            "created_at",
            "updated_at",
        )


    def validate_batch(self, batch):

        tenant = self.context["request"].tenant

        if batch.tenant != tenant:
            raise serializers.ValidationError(
                "Invalid bird batch."
            )

        return batch


    def validate_feed_type(self, feed_type):

        if feed_type:

            tenant = self.context["request"].tenant

            if feed_type.tenant != tenant:
                raise serializers.ValidationError(
                    "Invalid feed type."
                )

        return feed_type


    def validate_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value