from django.db import transaction
from rest_framework import serializers
from apps.production.egg.services import add_egg_to_inventory
from .models import EggProduction
from apps.production.egg.services import (
    add_egg_to_inventory,
    update_egg_inventory,
)


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

    total_eggs = serializers.ReadOnlyField()


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

            "good_eggs",
            "cracked_eggs",
            "broken_eggs",
            "dirty_eggs",
            "small_eggs",
            "double_yolk_eggs",

            "total_eggs",

            "notes",

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

            "created_at",
            "updated_at",

        )

    @transaction.atomic
    def create(self, validated_data):

        production = EggProduction.objects.create(
            **validated_data
        )


        add_egg_to_inventory(
            production
        )


        return production
    @transaction.atomic
    def update(
        self,
        instance,
        validated_data
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
        )


        return updated_instance

    def validate(self, attrs):

        request = self.context.get(
            "request"
        )

        tenant = request.tenant


        # Handle POST and PATCH
        branch = attrs.get(
            "branch",
            self.instance.branch
            if self.instance else None
        )

        house = attrs.get(
            "house",
            self.instance.house
            if self.instance else None
        )

        batch = attrs.get(
            "batch",
            self.instance.batch
            if self.instance else None
        )

        production_date = attrs.get(
            "production_date",
            self.instance.production_date
            if self.instance else None
        )


        # Tenant validation

        if branch.tenant_id != tenant.id:

            raise serializers.ValidationError(
                {
                    "branch":
                    "Invalid branch for this farm."
                }
            )


        if house.tenant_id != tenant.id:

            raise serializers.ValidationError(
                {
                    "house":
                    "Invalid house for this farm."
                }
            )


        if batch.tenant_id != tenant.id:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Invalid batch for this farm."
                }
            )


        # Relationship validation

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


        # Prevent duplicate daily records

        existing = EggProduction.objects.filter(

            tenant=tenant,

            batch=batch,

            production_date=production_date,

            is_active=True,

        )


        # Ignore current record during PATCH

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


        return attrs