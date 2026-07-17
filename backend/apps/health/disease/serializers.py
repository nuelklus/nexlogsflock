from rest_framework import serializers

from .models import Disease


class DiseaseSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
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

        model = Disease

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "name",
            "bird_type",
            "disease_type",

            "description",
            "symptoms",
            "prevention",

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

            "created_by_email",
            "updated_by_email",

            "created_at",
            "updated_at",
        )


    def validate_name(self, value):

        tenant = self.context["request"].tenant

        queryset = Disease.objects.filter(
            tenant=tenant,
            name__iexact=value,
            is_active=True,
        )


        if self.instance:

            queryset = queryset.exclude(
                pk=self.instance.pk
            )


        if queryset.exists():

            raise serializers.ValidationError(
                "This disease already exists for this farm."
            )


        return value