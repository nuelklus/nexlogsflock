from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess
from .models import Medication, MedicationAdministration
from .serializers import MedicationSerializer, MedicationAdministrationSerializer

class MedicationViewSet(
    AuditUserMixin,
    ModelViewSet,
):
    serializer_class = MedicationSerializer
    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )
    lookup_field = "id"

    def get_queryset(self):

        if not self.request.tenant:

            return Medication.objects.none()

        return (
            Medication.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "tenant",
                "created_by",
                "updated_by",
            )
            .order_by(
                "name"
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
                "Medication deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class MedicationAdministrationViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = MedicationAdministrationSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"


    def get_queryset(self):

        return (
            MedicationAdministration.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "tenant",
                "treatment",
                "medication",
            )
            .order_by(
                "-start_date"
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
                "Medication administration deleted successfully."
            },
            status=status.HTTP_200_OK,
        )