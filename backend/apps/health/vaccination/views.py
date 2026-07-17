from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess

from .models import Vaccine, VaccinationProgram, VaccinationSchedule, BatchVaccinationPlan, VaccinationRecord
from .serializers import VaccineSerializer, VaccinationProgramSerializer, VaccinationScheduleSerializer, BatchVaccinationPlanSerializer, VaccinationRecordSerializer


class VaccineViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = VaccineSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        return (
            Vaccine.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .order_by("name")
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
                "detail": "Vaccine deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class VaccinationProgramViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = VaccinationProgramSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        return (
            VaccinationProgram.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .order_by("name")
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
                "detail":
                "Vaccination program deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class VaccinationScheduleViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = VaccinationScheduleSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        return (
            VaccinationSchedule.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "program",
                "vaccine",
            )
            .order_by(
                "recommended_day"
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

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail":
                "Vaccination schedule deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class BatchVaccinationPlanViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = BatchVaccinationPlanSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        return (
            BatchVaccinationPlan.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "batch",
                "schedule",
                "schedule__vaccine",
            )
            .order_by(
                "due_date"
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

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail":
                "Batch vaccination plan deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class VaccinationRecordViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = VaccinationRecordSerializer

    permission_classes = (
        IsAuthenticated,
        HasTenantAccess,
    )

    lookup_field = "id"

    def get_queryset(self):

        return (
            VaccinationRecord.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "batch",
                "plan",
                "vaccine",
            )
            .order_by(
                "-date_administered"
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

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail":
                "Vaccination record deleted successfully."
            },
            status=status.HTTP_200_OK,
        )