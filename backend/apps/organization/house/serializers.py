from rest_framework import serializers

from apps.organization.branch.models import Branch

from .models import House


class HouseSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True
    )


    class Meta:

        model = House

        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "branch",
            "branch_name",
            "name",
            "house_type",
            "capacity",
            "is_active",
            "created_at",
            "updated_at",
        )


        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "branch_name",
            "created_at",
            "updated_at",
        )


    def validate_branch(self, branch):

        request = self.context["request"]

        tenant = request.tenant


        if branch.tenant != tenant:

            raise serializers.ValidationError(
                "You cannot add a house to another tenant's branch."
            )


        return branch


    def validate_name(self, value):

        request = self.context["request"]

        tenant = request.tenant


        queryset = House.objects.filter(
            tenant=tenant,
            branch=self.initial_data.get("branch"),
            name=value,
            is_active=True,
        )


        if self.instance:

            queryset = queryset.exclude(
                pk=self.instance.pk
            )


        if queryset.exists():

            raise serializers.ValidationError(
                "A house with this name already exists in this branch."
            )


        return value