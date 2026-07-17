from rest_framework import serializers
from .models import Vaccine, VaccinationProgram, VaccinationSchedule, BatchVaccinationPlan, VaccinationRecord

class VaccineSerializer(serializers.ModelSerializer):

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    class Meta:

        model = Vaccine

        fields = (
            "id",

            "tenant",
            "tenant_name",

            "name",

            "manufacturer",

            "bird_type",

            "description",

            "is_active",

            "created_at",

            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant",
            "tenant_name",
            "created_at",
            "updated_at",
        )
        
class VaccinationProgramSerializer(serializers.ModelSerializer):

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    class Meta:

        model = VaccinationProgram

        fields = (
            "id",

            "tenant",
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
            "tenant",
            "tenant_name",
            "created_at",
            "updated_at",
        )

class VaccinationScheduleSerializer(serializers.ModelSerializer):

    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )

    vaccine_name = serializers.CharField(
        source="vaccine.name",
        read_only=True,
    )

    class Meta:

        model = VaccinationSchedule

        fields = (
            "id",

            "program",
            "program_name",

            "vaccine",
            "vaccine_name",

            "recommended_day",

            "route",

            "notes",

            "is_active",

            "created_at",

            "updated_at",
        )

        read_only_fields = (
            "id",

            "program_name",

            "vaccine_name",

            "created_at",

            "updated_at",
        )

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        if attrs["program"].tenant != tenant:
            raise serializers.ValidationError(
                {"program": "Invalid program."}
            )

        if attrs["vaccine"].tenant != tenant:
            raise serializers.ValidationError(
                {"vaccine": "Invalid vaccine."}
            )

        return attrs
    
class BatchVaccinationPlanSerializer(serializers.ModelSerializer):

    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )

    vaccine_name = serializers.CharField(
        source="schedule.vaccine.name",
        read_only=True,
    )

    recommended_day = serializers.IntegerField(
        source="schedule.recommended_day",
        read_only=True,
    )

    class Meta:

        model = BatchVaccinationPlan

        fields = (
            "id",

            "batch",
            "batch_number",

            "schedule",

            "vaccine_name",

            "recommended_day",

            "due_date",

            "status",

            "is_active",

            "created_at",

            "updated_at",
        )

        read_only_fields = (
            "id",

            "batch_number",

            "vaccine_name",

            "recommended_day",

            "created_at",

            "updated_at",
        )

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        if attrs["batch"].tenant != tenant:
            raise serializers.ValidationError(
                {"batch": "Invalid batch."}
            )

        if attrs["schedule"].tenant != tenant:
            raise serializers.ValidationError(
                {"schedule": "Invalid schedule."}
            )

        return attrs

class VaccinationRecordSerializer(serializers.ModelSerializer):

    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )

    vaccine_name = serializers.CharField(
        source="vaccine.name",
        read_only=True,
    )

    class Meta:

        model = VaccinationRecord

        fields = (
            "id",

            "batch",
            "batch_number",

            "plan",

            "vaccine",
            "vaccine_name",

            "date_administered",

            "quantity_used",

            "route",

            "notes",

            "is_active",

            "created_at",

            "updated_at",
        )

        read_only_fields = (
            "id",

            "batch_number",

            "vaccine_name",

            "created_at",

            "updated_at",
        )

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        if attrs["batch"].tenant != tenant:
            raise serializers.ValidationError(
                {"batch": "Invalid batch."}
            )

        if attrs["vaccine"].tenant != tenant:
            raise serializers.ValidationError(
                {"vaccine": "Invalid vaccine."}
            )

        plan = attrs.get("plan")

        if plan and plan.tenant != tenant:
            raise serializers.ValidationError(
                {"plan": "Invalid vaccination plan."}
            )

        return attrs