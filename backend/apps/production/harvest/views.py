from django.db import transaction

from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import Harvest
from .serializers import HarvestSerializer
from .services import add_meat_to_inventory
from apps.inventory.meat.models import MeatInventory

class HarvestViewSet(
    AuditUserMixin,
    viewsets.ModelViewSet,
):

    serializer_class = HarvestSerializer


    permission_classes = [

        IsAuthenticated,
        HasTenantAccess,

    ]


    lookup_field = "id"



    def get_queryset(self):

        return (
            Harvest.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "branch",
                "batch",
            )
            .order_by(
                "-harvest_date"
            )
        )



    @transaction.atomic
    def perform_create(self, serializer):

        harvest = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
        )


        batch = (
            harvest.batch.__class__
            .objects
            .select_for_update()
            .get(
                id=harvest.batch_id
            )
        )


        batch.current_quantity -= (
            harvest.birds_harvested
        )


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )

        if harvest.harvest_reason == "processing":
            add_meat_to_inventory(harvest)

    @transaction.atomic
    def perform_update(self, serializer):

        old_harvest = self.get_object()
        if old_harvest.status in [
            "sold",
            "completed",
        ]:

            raise serializers.ValidationError(
                {
                    "detail":
                    "Completed harvests cannot be edited."
                }
            )

        # Lock batch row
        batch = (
            old_harvest.batch.__class__
            .objects
            .select_for_update()
            .get(
                id=old_harvest.batch_id
            )
        )


        # Restore previous harvest quantity

        batch.current_quantity += (
            old_harvest.birds_harvested
        )


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )


        # Save new harvest values

        harvest = serializer.save(
            updated_by=self.request.user,
            tenant=self.request.tenant,
        )

        # Update meat inventory when processed harvest changes

        if old_harvest.harvest_reason == "processing":

            meat_inventory = MeatInventory.objects.filter(
                branch=old_harvest.branch,
                is_active=True,
            ).first()


            if meat_inventory:

                difference = (
                    harvest.birds_harvested -
                    old_harvest.birds_harvested
                )


                meat_inventory.quantity += difference

                meat_inventory.available_quantity += difference


                meat_inventory.save(
                    update_fields=[
                        "quantity",
                        "available_quantity",
                        "updated_at",
                    ]
                )

        # Reload batch after restore

        batch.refresh_from_db()


        # Check availability

        if harvest.birds_harvested > batch.current_quantity:

            raise serializers.ValidationError(
                {
                    "birds_harvested":
                    (
                        f"Only {batch.current_quantity} birds available."
                    )
                }
            )


        # Deduct new harvest quantity

        batch.current_quantity -= (
            harvest.birds_harvested
        )


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )



    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.status in [
            "sold",
            "completed",
        ]:

            raise serializers.ValidationError(
                {
                    "detail":
                    "Completed harvests cannot be deleted."
                }
            )

        batch = (
            instance.batch.__class__
            .objects
            .select_for_update()
            .get(
                id=instance.batch_id
            )
        )


        # Return birds

        batch.current_quantity += (
            instance.birds_harvested
        )


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )


        # Soft delete harvest

        instance.is_active = False


        instance.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )
    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        self.perform_destroy(instance)


        return Response(
            {
                "message":
                "Harvest record deleted successfully."
            },
            status=status.HTTP_200_OK,
        )    