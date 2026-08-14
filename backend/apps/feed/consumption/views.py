from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import (
    ModelViewSet,
    ReadOnlyModelViewSet,
)

from apps.core.tenant.permissions import HasTenantAccess

from .models import (
    FeedConsumption,
    FeedInventory,
    FeedStockMovement,
)
from .serializers import (
    FeedConsumptionSerializer,
    FeedInventorySerializer,
    FeedStockMovementSerializer,
)
from .services import (
    apply_consumption_create,
    apply_consumption_delete,
    apply_consumption_update,
)


class FeedConsumptionViewSet(ModelViewSet):
    serializer_class = FeedConsumptionSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            FeedConsumption.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "tenant",
                "branch",
                "house",
                "batch",
                "feed_type",
                "created_by",
                "updated_by",
            )
            .order_by("-date")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        consumption = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

        apply_consumption_create(
            consumption,
            user=self.request.user,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        current = self.get_object()
        previous_consumption = (
            FeedConsumption.objects
            .select_for_update()
            .get(pk=current.pk)
        )

        original_consumption = FeedConsumption(
            id=previous_consumption.id,
            tenant=previous_consumption.tenant,
            branch=previous_consumption.branch,
            house=previous_consumption.house,
            batch=previous_consumption.batch,
            feed_type=previous_consumption.feed_type,
            quantity=previous_consumption.quantity,
            unit=previous_consumption.unit,
            date=previous_consumption.date,
            notes=previous_consumption.notes,
        )

        consumption = serializer.save(
            tenant=self.request.tenant,
            updated_by=self.request.user,
        )

        apply_consumption_update(
            original_consumption,
            consumption,
            user=self.request.user,
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        locked_instance = (
            FeedConsumption.objects
            .select_for_update()
            .get(pk=instance.pk)
        )

        if not locked_instance.feed_type:
            raise serializers.ValidationError(
                {
                    "feed_type":
                    "Feed type is required to reverse inventory."
                }
            )

        apply_consumption_delete(
            locked_instance,
            user=self.request.user,
        )

        locked_instance.is_active = False
        locked_instance.updated_by = self.request.user
        locked_instance.save(
            update_fields=[
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail":
                "Feed consumption deleted successfully."
            },
            status=status.HTTP_200_OK,
        )


class FeedInventoryViewSet(ReadOnlyModelViewSet):
    serializer_class = FeedInventorySerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            FeedInventory.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "branch",
                "feed_type",
            )
            .order_by(
                "branch__name",
                "feed_type__name",
            )
        )


class FeedStockMovementViewSet(ReadOnlyModelViewSet):
    serializer_class = FeedStockMovementSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):
        queryset = (
            FeedStockMovement.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "feed_inventory",
                "branch",
                "feed_type",
                "created_by",
            )
            .order_by("-created_at")
        )

        branch_id = self.request.query_params.get(
            "branch"
        )
        feed_type_id = self.request.query_params.get(
            "feed_type"
        )

        if branch_id:
            queryset = queryset.filter(
                branch_id=branch_id
            )

        if feed_type_id:
            queryset = queryset.filter(
                feed_type_id=feed_type_id
            )

        return queryset
