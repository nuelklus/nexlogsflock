from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(
    AuditUserMixin,
    viewsets.ModelViewSet,
):
    serializer_class = PaymentSerializer

    permission_classes = [
        IsAuthenticated,
        HasTenantAccess,
    ]

    lookup_field = "id"

    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = (
            Payment.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "invoice",
                "invoice__customer",
                "created_by",
            )
            .order_by("-date", "-created_at")
        )
        invoice_id = self.request.query_params.get("invoice")
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(invoice__customer_id=customer_id)
        purpose = self.request.query_params.get("payment_purpose")
        if purpose:
            qs = qs.filter(payment_purpose=purpose)
        return qs

    def perform_create(self, serializer):
        # AuditUserMixin.perform_create would try to set tenant again;
        # serializer.create() handles tenant assignment, so we just save.
        serializer.save()
