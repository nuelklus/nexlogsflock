from rest_framework import serializers

from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    """
    Endpoints

    POST    /api/branches/
    GET     /api/branches/
    GET     /api/branches/<uuid>/
    PATCH   /api/branches/<uuid>/
    DELETE  /api/branches/<uuid>/
    """

    tenant_id = serializers.UUIDField(source="tenant.id", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = Branch
        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "name",
            "location",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        tenant = self.context["request"].tenant

        queryset = Branch.objects.filter(
            tenant=tenant,
            name=value,
            is_active=True,
        )

        # Exclude the current branch when updating
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A branch with this name already exists."
            )

        return value