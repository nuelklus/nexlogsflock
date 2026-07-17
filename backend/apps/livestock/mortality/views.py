from django.db import transaction

from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet


from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess


from .models import Mortality
from .serializers import MortalitySerializer



class MortalityViewSet(
    AuditUserMixin,
    ModelViewSet,
):

    serializer_class = MortalitySerializer


    permission_classes = [
        IsAuthenticated,
        HasTenantAccess,
    ]


    lookup_field = "id"



    def get_queryset(self):

        return (
            Mortality.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "branch",
                "house",
                "batch",
                "disease",
                "disease_outbreak",
            )
            .order_by(
                "-date"
            )
        )



    @transaction.atomic
    def perform_create(self, serializer):

        mortality = serializer.save(

            tenant=self.request.tenant,

            created_by=self.request.user,

        )


        batch = mortality.batch


        if mortality.quantity > batch.current_quantity:

            raise serializers.ValidationError(
                {
                    "quantity":
                    (
                        f"Cannot record {mortality.quantity} deaths. "
                        f"Only {batch.current_quantity} birds remain."
                    )
                }
            )


        batch.current_quantity -= mortality.quantity


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )



    @transaction.atomic
    def perform_update(self, serializer):

        old_mortality = self.get_object()


        old_quantity = old_mortality.quantity


        mortality = serializer.save(

            updated_by=self.request.user,

            tenant=self.request.tenant,

        )


        quantity_difference = (
            mortality.quantity
            -
            old_quantity
        )


        batch = mortality.batch


        batch.current_quantity -= quantity_difference


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )



    @transaction.atomic
    def perform_destroy(self, instance):

        batch = instance.batch


        # return birds back to batch

        batch.current_quantity += instance.quantity


        batch.save(
            update_fields=[
                "current_quantity",
                "updated_at",
            ]
        )


        # soft delete

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
                "message":
                "Mortality record deleted successfully."
            },
            status=status.HTTP_200_OK,
        )