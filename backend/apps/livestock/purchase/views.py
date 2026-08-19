from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.core.authtntuser.permissions.drf_permissions import HasModulePermission
from apps.core.tenant.permissions import HasTenantAccess
from .models import ChickPurchase, Supplier, Customer, FeedPurchase
from .serializers import ChickPurchaseSerializer,SupplierSerializer,CustomerSerializer,FeedPurchaseSerializer
from django.db import transaction
from rest_framework import serializers, status
from apps.feed.consumption.services import (
    apply_purchase_create,
    apply_purchase_delete,
    apply_purchase_update,
)


class ChickPurchaseViewSet(ModelViewSet):

    serializer_class = ChickPurchaseSerializer
    module = "purchases"

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
        HasModulePermission,
    )

    lookup_field = "id"

    def get_permissions(self):
        self.permission_action = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "update",
            "partial_update": "update",
            "destroy": "delete",
        }.get(self.action, "view")
        return super().get_permissions()

    def get_queryset(self):

        if not self.request.tenant:
            return ChickPurchase.objects.none()

        return (
            ChickPurchase.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "supplier",
                "breed",
                "branch",
                "batch",
                "batch__house",
                "batch__branch",
                "tenant",
            )
            .order_by("-purchase_date")
        )

    @transaction.atomic
    def perform_create(self, serializer):

        tenant = self.request.tenant

        # Lock the batch while updating it.
        batch = (
            serializer.validated_data["batch"]
        )

        from apps.livestock.batch.models import BirdBatch

        batch = (
            BirdBatch.objects
            .select_for_update()
            .get(
                pk=batch.pk,
                tenant=tenant,
            )
        )

        quantity = serializer.validated_data["quantity"]

        # Re-check capacity after acquiring the lock.
        projected_quantity = (
            batch.current_quantity + quantity
        )

        if projected_quantity > batch.initial_quantity:

            available = (
                batch.initial_quantity
                - batch.current_quantity
            )

            raise serializers.ValidationError(
                {
                    "quantity": (
                        f"This purchase exceeds the batch "
                        f"capacity. Only {available} birds "
                        f"can still be added to this batch."
                    )
                }
            )

        # Make sure the batch is still active.
        if batch.status != "active":
            raise serializers.ValidationError(
                {
                    "batch": (
                        "Chicks can only be purchased "
                        "into an active batch."
                    )
                }
            )

        # Create purchase.
        purchase = serializer.save(
            tenant=tenant,
            branch=batch.branch,
        )

        # Add purchased birds to batch.
        batch.current_quantity = projected_quantity

        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )

    @transaction.atomic
    def perform_destroy(self, instance):

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
                "detail": "Purchase deleted successfully."
            },
            status=status.HTTP_200_OK,
        )
        
class SupplierViewSet(ModelViewSet):

    serializer_class = SupplierSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:
            return Supplier.objects.none()

        return Supplier.objects.filter(
            tenant=self.request.tenant,
            is_active=True,
        ).order_by("name")

    def perform_create(self, serializer):

        serializer.save(
            tenant=self.request.tenant
        )

    def perform_destroy(self, instance):

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
                "detail": "Supplier deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class CustomerViewSet(ModelViewSet):

    serializer_class = CustomerSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:
            return Customer.objects.none()

        return Customer.objects.filter(
            tenant=self.request.tenant,
            is_active=True,
        ).order_by("name")

    def perform_create(self, serializer):

        serializer.save(
            tenant=self.request.tenant
        )

    def perform_destroy(self, instance):

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
                "detail": "Customer deleted successfully."
            },
            status=status.HTTP_200_OK,
        )        
        
class FeedPurchaseViewSet(ModelViewSet):

    serializer_class = FeedPurchaseSerializer
    module = "purchases"

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
        HasModulePermission,
    )

    lookup_field = "id"

    def get_permissions(self):
        self.permission_action = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "update",
            "partial_update": "update",
            "destroy": "delete",
        }.get(self.action, "view")
        return super().get_permissions()

    def get_queryset(self):

        if not self.request.tenant:
            return FeedPurchase.objects.none()

        return (
            FeedPurchase.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "supplier",
                "feed_type",
                "branch",
                "tenant",
                "created_by",
                "updated_by",
            )
            .order_by("-purchase_date")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        purchase = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            updated_by=self.request.user,
        )
        apply_purchase_create(
            purchase,
            user=self.request.user,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        current = self.get_object()
        previous_purchase = (
            FeedPurchase.objects
            .select_for_update()
            .select_related(
                "branch",
                "feed_type",
                "tenant",
            )
            .get(pk=current.pk)
        )

        original_purchase = FeedPurchase(
            id=previous_purchase.id,
            tenant=previous_purchase.tenant,
            branch=previous_purchase.branch,
            feed_type=previous_purchase.feed_type,
            quantity_bags=previous_purchase.quantity_bags,
            weight_per_bag=previous_purchase.weight_per_bag,
            purchase_date=previous_purchase.purchase_date,
            unit_cost=previous_purchase.unit_cost,
            supplier=previous_purchase.supplier,
            notes=previous_purchase.notes,
        )

        purchase = serializer.save(
            tenant=self.request.tenant,
            updated_by=self.request.user,
        )

        apply_purchase_update(
            original_purchase,
            purchase,
            user=self.request.user,
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        locked_instance = (
            FeedPurchase.objects
            .select_for_update()
            .select_related(
                "branch",
                "feed_type",
                "tenant",
            )
            .get(pk=instance.pk)
        )

        apply_purchase_delete(
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
                "detail": "Feed purchase deleted successfully."
            },
            status=status.HTTP_200_OK,
        )