from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import EggInventory
from .serializers import EggInventorySerializer


class EggInventoryViewSet(

    AuditUserMixin,
    ModelViewSet,

):

    serializer_class = EggInventorySerializer


    permission_classes = (

        IsAuthenticated,
        HasTenantAccess,

    )


    lookup_field = "id"


    def get_queryset(self):

        if not self.request.tenant:

            return EggInventory.objects.none()


        return (

            EggInventory.objects.filter(

                tenant=self.request.tenant,

                is_active=True,

            )

            .select_related(

                "tenant",

                "branch",

                "created_by",

                "updated_by",

            )

            .order_by(

                "-created_at"

            )

        )


    def perform_destroy(
        self,
        instance
    ):

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

        self.perform_destroy(
            instance
        )


        return Response(

            {

                "detail":
                "Egg inventory deleted successfully."

            },

            status=status.HTTP_200_OK,

        )