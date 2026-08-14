from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess
from apps.production.egg.services import (
    remove_egg_from_inventory,
)

from .models import EggProduction
from .serializers import EggProductionSerializer


class EggProductionViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = EggProductionSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:
            return EggProduction.objects.none()

        return (
            EggProduction.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "tenant",
                "branch",
                "house",
                "batch",
                "created_by",
            )
            .order_by(
                "-production_date",
                "-created_at",
            )
        )

    def perform_destroy(self, instance):

        remove_egg_from_inventory(
            instance,
            user=self.request.user,
        )

        instance.is_active = False

        instance.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        instance = self.get_object()

        self.perform_destroy(
            instance
        )

        return Response(
            {
                "detail":
                "Egg production deleted successfully."
            },
            status=status.HTTP_200_OK,
        )