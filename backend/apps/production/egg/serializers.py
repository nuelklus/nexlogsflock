from django.db import transaction

from rest_framework import serializers

from apps.inventory.egg.models import EggInventory
from apps.production.egg.services import (
    add_egg_to_inventory,
    update_egg_inventory,
)

from .models import EggProduction


class EggProductionSerializer(serializers.ModelSerializer):

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

    created_by_name = serializers.SerializerMethodField()

    total_eggs = serializers.ReadOnlyField()
    total_recorded_eggs = serializers.ReadOnlyField()

    class Meta:

        model = EggProduction

        fields = (
            "id",
            "branch",
            "branch_name",
            "house",
            "house_name",
            "batch",
            "batch_number",
            "production_date",
            "large_eggs",
            "medium_eggs",
            "small_eggs",
            "pullet_eggs",
            "unsorted_eggs",
            "good_eggs",
            "cracked_eggs",
            "broken_eggs",
            "dirty_eggs",
            "double_yolk_eggs",
            "total_eggs",
            "total_recorded_eggs",
            "notes",
            "created_by",
            "created_by_name",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "branch_name",
            "house_name",
            "batch_number",
            "total_eggs",
            "total_recorded_eggs",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        )

    def get_created_by_name(self, obj):

        if not obj.created_by:
            return None

        full_name = (
            f"{obj.created_by.first_name} "
            f"{obj.created_by.last_name}"
        ).strip()

        return full_name or obj.created_by.email

    @transaction.atomic
    def create(self, validated_data):

        production = EggProduction.objects.create(
            **validated_data
        )

        add_egg_to_inventory(
            production,
            user=production.updated_by or production.created_by,
        )

        return production

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        old_instance = EggProduction.objects.get(
            id=instance.id
        )

        updated_instance = super().update(
            instance,
            validated_data
        )

        update_egg_inventory(
            old_instance,
            updated_instance,
            user=updated_instance.updated_by,
        )

        return updated_instance

    def validate(self, attrs):

        request = self.context.get("request")

        if not request or not request.tenant:
            raise serializers.ValidationError(
                "Tenant context is required."
            )

        tenant = request.tenant

        branch = attrs.get(
            "branch",
            self.instance.branch
            if self.instance
            else None,
        )

        house = attrs.get(
            "house",
            self.instance.house
            if self.instance
            else None,
        )

        batch = attrs.get(
            "batch",
            self.instance.batch
            if self.instance
            else None,
        )

        production_date = attrs.get(
            "production_date",
            self.instance.production_date
            if self.instance
            else None,
        )

        if branch is None:
            raise serializers.ValidationError(
                {"branch": "Branch is required."}
            )

        if house is None:
            raise serializers.ValidationError(
                {"house": "House is required."}
            )

        if batch is None:
            raise serializers.ValidationError(
                {"batch": "Batch is required."}
            )

        if branch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {"branch": "Invalid branch for this farm."}
            )

        if house.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {"house": "Invalid house for this farm."}
            )

        if batch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {"batch": "Invalid batch for this farm."}
            )

        if house.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "house":
                    "This house does not belong to the selected branch."
                }
            )

        if batch.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "batch":
                    "This batch does not belong to the selected branch."
                }
            )

        if batch.house_id != house.id:
            raise serializers.ValidationError(
                {
                    "batch":
                    "This batch does not belong to the selected house."
                }
            )

        if production_date is None:
            raise serializers.ValidationError(
                {
                    "production_date":
                    "Production date is required."
                }
            )

        existing = EggProduction.objects.filter(
            tenant=tenant,
            batch=batch,
            production_date=production_date,
            is_active=True,
        )

        if self.instance:
            existing = existing.exclude(
                id=self.instance.id
            )

        if existing.exists():
            raise serializers.ValidationError(
                {
                    "production_date":
                    (
                        "Egg production already exists "
                        "for this batch on this date."
                    )
                }
            )

        stock_fields = [
            "large_eggs",
            "medium_eggs",
            "small_eggs",
            "pullet_eggs",
            "unsorted_eggs",
        ]
        legacy_unsorted_fields = [
            "good_eggs",
            "dirty_eggs",
            "double_yolk_eggs",
        ]

        stock_total = sum(
            attrs.get(
                field_name,
                getattr(self.instance, field_name, 0)
                if self.instance
                else 0,
            ) or 0
            for field_name in stock_fields
        )

        legacy_unsorted_total = sum(
            attrs.get(
                field_name,
                getattr(self.instance, field_name, 0)
                if self.instance
                else 0,
            ) or 0
            for field_name in legacy_unsorted_fields
        )

        if stock_total <= 0 and legacy_unsorted_total <= 0:
            raise serializers.ValidationError(
                {
                    "quantity":
                    "At least one egg grade quantity must be greater than zero."
                }
            )

        if stock_total > 0 and legacy_unsorted_total > 0:
            raise serializers.ValidationError(
                {
                    "unsorted_eggs": (
                        "Do not mix legacy egg fields with "
                        "the new graded egg fields."
                    )
                }
            )

        return attrs
