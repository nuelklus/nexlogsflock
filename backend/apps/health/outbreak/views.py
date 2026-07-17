from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.core.tenant.permissions import HasTenantAccess
from apps.core.common.mixins import AuditUserMixin
from .models import DiseaseOutbreak
from .serializers import DiseaseOutbreakSerializer



class DiseaseOutbreakViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = DiseaseOutbreakSerializer


    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )


    lookup_field = "id"



    def get_queryset(self):

        return (

            DiseaseOutbreak.objects.filter(

                tenant=self.request.tenant,

                is_active=True,

            )

            .select_related(

                "branch",

                "house",

                "batch",

                "disease",

            )

            .order_by(

                "-outbreak_date"

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
                "detail":
                "Disease outbreak deleted successfully."
            },

            status=status.HTTP_200_OK,

        )