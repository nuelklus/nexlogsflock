from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.core.tenant.permissions import HasTenantAccess
from .models import ChickPurchase, Supplier, Customer, FeedPurchase
from .serializers import ChickPurchaseSerializer,SupplierSerializer,CustomerSerializer,FeedPurchaseSerializer

class ChickPurchaseViewSet(ModelViewSet):

    serializer_class = ChickPurchaseSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:
            return ChickPurchase.objects.none()

        return (
            ChickPurchase.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "supplier",
                "breed",
                "branch",
                "tenant",
            )
            .order_by("-purchase_date")
        )

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

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

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
            )
            .order_by("-purchase_date")
        )

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
                "detail": "Feed purchase deleted successfully."
            },
            status=status.HTTP_200_OK,
        )