from django.db import transaction

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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

        return (

            Invoice.objects

            .filter(

                tenant=self.request.tenant,

                is_active=True,

            )

            .select_related(

                "customer",

            )

            .prefetch_related(

                "items",

                "items__harvest",

                "items__meat_inventory",

                "items__egg_inventory",

            )

            .order_by(

                "-created_at"

            )

        )