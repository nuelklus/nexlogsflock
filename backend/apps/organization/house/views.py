from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet


from apps.core.tenant.permissions import HasTenantAccess

from .models import House
from .serializers import HouseSerializer



class HouseViewSet(ModelViewSet):

    serializer_class = HouseSerializer


    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )


    lookup_field = "id"



    def get_queryset(self):

        if not self.request.tenant:

            return House.objects.none()


        return House.objects.filter(
            tenant=self.request.tenant,
            is_active=True,
        ).select_related(
            "tenant",
            "branch",
        ).order_by(
            "name"
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
                "detail": "House deleted successfully."
            },
            status=status.HTTP_200_OK,
        )