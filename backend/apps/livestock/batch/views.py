from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.tenant.permissions import HasTenantAccess

from .models import BirdBatch
from .serializers import BirdBatchSerializer


class BirdBatchViewSet(ModelViewSet):

    serializer_class = BirdBatchSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:
            return BirdBatch.objects.none()

        qs = BirdBatch.objects.filter(
            tenant=self.request.tenant,
            is_active=True,
        ).select_related(
            "tenant",
            "branch",
            "house",
            "breed",
            "purchase",
        )

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        house_id = self.request.query_params.get("house_id") or self.request.query_params.get("house")
        if house_id:
            qs = qs.filter(house_id=house_id)

        return qs.order_by("-created_at")

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
                "detail": "Bird batch deleted successfully."
            },
            status=status.HTTP_200_OK,
        )