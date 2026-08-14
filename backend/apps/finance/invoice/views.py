from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(
    AuditUserMixin,
    viewsets.ModelViewSet,
):

    serializer_class = InvoiceSerializer

    permission_classes = [
        IsAuthenticated,
        HasTenantAccess,
    ]

    lookup_field = "id"

    def get_queryset(self):
        qs = (
            Invoice.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related("customer", "branch")
            .prefetch_related(
                "items",
                "items__harvest",
                "items__harvest__batch",
                "items__harvest__branch",
                "items__meat_inventory",
                "items__egg_inventory",
                "payments",
            )
            .order_by("-created_at")
        )
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        status_filter = self.request.query_params.get("payment_status")
        if status_filter:
            qs = qs.filter(payment_status=status_filter)
        return qs

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        serializer = self.get_serializer(invoice)
        serializer.cancel(invoice, request=request)
        return Response(
            {"detail": "Invoice cancelled successfully."},
            status=status.HTTP_200_OK,
        )