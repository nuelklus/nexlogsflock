from rest_framework import serializers
from .models import Tenant, TenantUser, TenantRole, SubscriptionPlan, TenantSubscription, SubscriptionHistory
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
            "subscription_status",
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

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "code",
            "name",
            "description",
            "amount",
            "billing_cycle",
            "max_users",
            "max_branches",
            "features",
            "is_active",
        )


class SubscriptionHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True, allow_null=True)

    class Meta:
        model = SubscriptionHistory
        fields = (
            "id",
            "previous_status",
            "new_status",
            "payment_reference",
            "notes",
            "changed_by_email",
            "created_at",
        )
        read_only_fields = (
            "id",
            "created_at",
        )


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    tenant_id = serializers.UUIDField(source="tenant.id", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    billing_history = SubscriptionHistorySerializer(many=True, read_only=True, source="history")

    class Meta:
        model = TenantSubscription
        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "plan",
            "status",
            "billing_cycle",
            "amount",
            "next_billing_date",
            "payment_reference",
            "notes",
            "billing_history",
            "started_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "plan",
            "tenant_id",
            "tenant_name",
            "billing_history",
            "started_at",
            "updated_at",
        )


class TenantSubscriptionUpdateSerializer(serializers.ModelSerializer):
    plan_code = serializers.CharField(write_only=True)

    class Meta:
        model = TenantSubscription
        fields = (
            "plan_code",
            "billing_cycle",
            "payment_reference",
            "notes",
        )

    def validate_plan_code(self, value):
        try:
            plan = SubscriptionPlan.objects.get(code=value, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("This subscription plan does not exist.")
        return plan

    def update(self, instance, validated_data):
        plan = validated_data.pop("plan_code")
        cycle = validated_data.get("billing_cycle", instance.billing_cycle)
        payment_reference = validated_data.get("payment_reference", "")
        notes = validated_data.get("notes", "")

        instance.plan = plan
        instance.billing_cycle = cycle
        instance.amount = plan.amount if cycle == "monthly" else plan.amount
        instance.payment_reference = payment_reference
        instance.notes = notes
        instance.status = "pending_manual_payment"
        instance.next_billing_date = instance.next_billing_date or None
        instance.save()

        tenant = instance.tenant
        tenant.subscription_plan = plan.code
        tenant.subscription_status = instance.status
        tenant.save(update_fields=["subscription_plan", "subscription_status"])
        return instance


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