from rest_framework import serializers

from .models import Tenant, TenantUser, TenantRole
from apps.core.users.models import User



class TenantSerializer(serializers.ModelSerializer):

    class Meta:
        model = Tenant

        fields = (
            "id",
            "name",
            "slug",
            "description",
            "subscription_plan",
            "logo",
            "primary_color",
            "custom_domain",
            "timezone",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "slug",
            "created_at",
            "updated_at",
        )



class TenantUserSerializer(serializers.ModelSerializer):

    user_email = serializers.ReadOnlyField(
        source="user.email"
    )

    user_full_name = serializers.ReadOnlyField(
        source="user.get_full_name"
    )

    tenant_name = serializers.ReadOnlyField(
        source="tenant.name"
    )


    class Meta:
        model = TenantUser

        fields = (
            "id",
            "user",
            "user_email",
            "user_full_name",
            "tenant",
            "tenant_name",
            "role",
            "is_active",
            "joined_at",
        )

        read_only_fields = (
            "id",
            "user",
            "tenant",
            "joined_at",
        )



class TenantMembershipCreateSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(
        write_only=True
    )

    role = serializers.ChoiceField(
        choices=TenantRole.choices,
        default=TenantRole.STAFF
    )


    class Meta:
        model = TenantUser

        fields = (
            "email",
            "role",
        )


    def validate_email(self, value):

        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "User with this email does not exist."
            )

        return value



    def create(self, validated_data):

        email = validated_data.pop("email")

        user = User.objects.get(
            email=email
        )

        tenant = self.context["tenant"]


        tenant_user = TenantUser.objects.create(
            user=user,
            tenant=tenant,
            **validated_data
        )

        return tenant_user



class TenantMembershipUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = TenantUser

        fields = (
            "role",
            "is_active",
        )



class UserTenantsSerializer(serializers.ModelSerializer):

    tenant = TenantSerializer(
        read_only=True
    )

    role = serializers.CharField(
        source="get_role_display"
    )


    class Meta:
        model = TenantUser

        fields = (
            "id",
            "tenant",
            "role",
            "is_active",
            "joined_at",
        )