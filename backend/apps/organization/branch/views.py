from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.tenant.permissions import HasTenantAccess

from .models import Branch
from .serializers import BranchSerializer


class BranchViewSet(ModelViewSet):

    serializer_class = BranchSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):
        return Branch.objects.filter(
            tenant=self.request.tenant,
            is_active=True,
        ).order_by("name")

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail": "Branch deleted successfully."
            },
            status=status.HTTP_200_OK,
        )