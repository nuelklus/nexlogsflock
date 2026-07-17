from rest_framework import serializers

from apps.organization.branch.models import Branch
from apps.organization.house.models import House

from .models import BirdBatch


class BirdBatchSerializer(serializers.ModelSerializer):

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

    breed_name = serializers.CharField(
        source="breed.name",
        read_only=True,
    )

    age_days = serializers.ReadOnlyField()


    class Meta:

        model = BirdBatch

        fields = (
            "id",
            "tenant_id",
            "tenant_name",

            "branch",
            "branch_name",

            "house",
            "house_name",

            "purchase",

            "breed",
            "breed_name",

            "batch_number",
            "bird_type",

            "arrival_date",

            "initial_quantity",
            "current_quantity",

            "status",

            "age_days",

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
            "breed_name",
            "age_days",
            "created_at",
            "updated_at",
        )

    def validate_branch(self, branch):

        tenant = self.context["request"].tenant

        if branch.tenant != tenant:
            raise serializers.ValidationError(
                "Invalid branch."
            )

        return branch

    def validate_house(self, house):

        if house is None:
            return house

        tenant = self.context["request"].tenant

        if house.tenant != tenant:
            raise serializers.ValidationError(
                "Invalid house."
            )

        return house

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )

        house = attrs.get(
            "house",
            getattr(self.instance, "house", None),
        )

        initial_quantity = attrs.get(
            "initial_quantity",
            getattr(self.instance, "initial_quantity", 0),
        )

        current_quantity = attrs.get(
            "current_quantity",
            getattr(self.instance, "current_quantity", 0),
        )

        batch_number = attrs.get(
            "batch_number",
            getattr(self.instance, "batch_number", None),
        )

        if house and house.branch != branch:
            raise serializers.ValidationError(
                {
                    "house": "Selected house does not belong to the selected branch."
                }
            )

        if current_quantity > initial_quantity:
            raise serializers.ValidationError(
                {
                    "current_quantity":
                    "Current quantity cannot exceed initial quantity."
                }
            )

        queryset = BirdBatch.objects.filter(
            tenant=tenant,
            batch_number=batch_number,
            is_active=True,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                {
                    "batch_number":
                    "A batch with this number already exists."
                }
            )

        return attrs