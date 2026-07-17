from rest_framework import serializers

from .models import FeedType


class FeedTypeSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    class Meta:

        model = FeedType

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "name",
            "bird_type",
            "description",

            "is_active",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        name = attrs.get(
            "name",
            getattr(self.instance, "name", None),
        )

        queryset = FeedType.objects.filter(
            tenant=tenant,
            name=name,
            is_active=True,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk,
            )

        if queryset.exists():

            raise serializers.ValidationError(
                {
                    "name":
                    "This feed type already exists."
                }
            )

        return attrs