from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import FeedConsumption
from .serializers import FeedConsumptionSerializer


class FeedConsumptionViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = FeedConsumptionSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"


    def get_queryset(self):

        return (
            FeedConsumption.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "tenant",
                "batch",
                "feed_type",
                "created_by",
                "updated_by",
            )
            .order_by(
                "-date"
            )
        )


    def perform_destroy(self, instance):

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
        **kwargs
    ):

        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail": "Feed consumption deleted successfully."
            },
            status=status.HTTP_200_OK,
        )