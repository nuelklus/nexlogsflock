from rest_framework import serializers

from .models import TreatmentPlan


class TreatmentPlanSerializer(serializers.ModelSerializer):

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

    disease_name = serializers.CharField(
        source="disease.name",
        read_only=True,
    )

    outbreak_name = serializers.SerializerMethodField()

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

        model = TreatmentPlan

        fields = (

            "id",

            "tenant_id",
            "tenant_name",

            "batch",
            "batch_number",

            "disease",
            "disease_name",

            "outbreak",
            "outbreak_name",

            "treatment_name",

            "start_date",
            "end_date",

            "status",

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

            "batch_number",

            "disease_name",

            "outbreak_name",

            "created_by_email",
            "updated_by_email",

            "created_at",
            "updated_at",
        )


    def get_outbreak_name(self, obj):

        if obj.outbreak:

            return str(obj.outbreak)

        return None


    def validate_batch(self, batch):

        tenant = self.context["request"].tenant

        if batch.tenant != tenant:

            raise serializers.ValidationError(
                "Invalid batch."
            )

        return batch


    def validate_disease(self, disease):

        tenant = self.context["request"].tenant

        if disease.tenant != tenant:

            raise serializers.ValidationError(
                "Invalid disease."
            )

        return disease


    def validate_outbreak(self, outbreak):

        if outbreak:

            tenant = self.context["request"].tenant

            if outbreak.tenant != tenant:

                raise serializers.ValidationError(
                    "Invalid outbreak."
                )

        return outbreak


    def validate(self, attrs):

        start = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )

        end = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )

        if end and start and end < start:

            raise serializers.ValidationError(
                {
                    "end_date":
                    "End date cannot be before start date."
                }
            )

        return attrs