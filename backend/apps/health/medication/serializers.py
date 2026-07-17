from rest_framework import serializers

from .models import Medication, MedicationAdministration

class MedicationSerializer(serializers.ModelSerializer):

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

        model = Medication

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "name",
            "medication_type",
            "description",
            "manufacturer",
            "unit",

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


        queryset = Medication.objects.filter(
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
                "This medication already exists for this farm."
            )


        return value

class MedicationAdministrationSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    treatment_name = serializers.CharField(
        source="treatment.treatment_name",
        read_only=True,
    )

    medication_name = serializers.CharField(
        source="medication.name",
        read_only=True,
        allow_null=True,
    )


    class Meta:

        model = MedicationAdministration

        fields = (

            "id",

            "tenant_id",
            "tenant_name",

            "treatment",
            "treatment_name",

            "medication",
            "medication_name",

            "dosage",

            "route",

            "frequency_per_day",

            "duration_days",

            "start_date",

            "end_date",

            "instructions",

            "is_active",

            "created_at",

            "updated_at",
        )


        read_only_fields = (

            "id",

            "tenant_id",

            "tenant_name",

            "treatment_name",

            "medication_name",

            "end_date",

            "created_at",

            "updated_at",

        )


    def validate_treatment(self, treatment):

        tenant = self.context["request"].tenant

        if treatment.tenant != tenant:

            raise serializers.ValidationError(
                "Invalid treatment."
            )

        return treatment


    def validate_medication(self, medication):

        if medication:

            tenant = self.context["request"].tenant

            if medication.tenant != tenant:

                raise serializers.ValidationError(
                    "Invalid medication."
                )

        return medication