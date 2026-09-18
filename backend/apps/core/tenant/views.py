from datetime import date, timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.users.models import User

from .models import Tenant, TenantUser, TenantRole, SubscriptionPlan, TenantSubscription, SubscriptionHistory
from .permissions import HasOrganizationRole, HasTenantAccess, IsOrganizationMember, IsOrganizationOwner
from .serializers import (
    SubscriptionPlanSerializer,
    TenantMembershipCreateSerializer,
    TenantMembershipUpdateSerializer,
    TenantSerializer,
    TenantSubscriptionSerializer,
    TenantSubscriptionUpdateSerializer,
    TenantUserSerializer,
    UserTenantsSerializer,
)


class TenantListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Lists all organizations the authenticated user is a member of
        memberships = request.user.tenant_memberships.select_related("tenant")
        serializer = UserTenantsSerializer(memberships, many=True)
        return Response(serializer.data)


class TenantCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # Allows an authenticated user to create a new organization and become its owner
        serializer = TenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()

        # Assign the creating user as the OWNER of the new organization
        TenantUser.objects.create(
            user=request.user,
            tenant=organization,
            role=TenantRole.OWNER
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TenantDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request, slug):
        # Assumes `request.organization` is set by IsOrganizationMember permission
        serializer = TenantSerializer(request.organization)
        return Response(serializer.data)

    def patch(self, request, slug):
        # Only owner/admin can update organization details
        self.check_permissions(request)
        if not (IsOrganizationOwner().has_permission(request, self) or \
                HasOrganizationRole(allowed_roles=[TenantRole.ADMIN]).has_permission(request, self)):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TenantSerializer(request.organization, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TenantMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, HasOrganizationRole(allowed_roles=[TenantRole.OWNER, TenantRole.ADMIN])]

    def get(self, request, slug):
        # Assumes `request.organization` is set by IsOrganizationMember permission
        memberships = TenantUser.objects.filter(tenant=request.organization).select_related("user")
        serializer = TenantUserSerializer(memberships, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request, slug):
        # Add a new member to the organization
        serializer = TenantMembershipCreateSerializer(data=request.data, context={"tenant": request.organization})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TenantMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, HasOrganizationRole(allowed_roles=[TenantRole.OWNER, TenantRole.ADMIN])]

    def patch(self, request, slug, user_id):
        # Update a member's role or status
        member = get_object_or_404(TenantUser, tenant=request.organization, user__id=user_id)
        serializer = TenantMembershipUpdateSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, slug, user_id):
        # Remove a member from the organization
        member = get_object_or_404(TenantUser, tenant=request.organization, user__id=user_id)
        
        # Prevent owner from removing themselves unless there's another owner
        if member.role == TenantRole.OWNER and \
           TenantUser.objects.filter(tenant=request.organization, role=TenantRole.OWNER).count() == 1:
            return Response(
                {"detail": "Cannot remove the last owner of the organization."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriptionPlanListView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True)
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


class CurrentTenantSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        tenant = request.tenant
        subscription = (
           TenantSubscription.objects.select_related("plan", "tenant")
           .filter(tenant=tenant)
           .first()
        )

        if subscription is None:
           default_plan = SubscriptionPlan.objects.filter(is_active=True).order_by("amount").first()
           if default_plan is None:
               return Response({"detail": "No subscription plan is available yet."}, status=status.HTTP_404_NOT_FOUND)

           subscription = TenantSubscription.objects.create(
               tenant=tenant,
               plan=default_plan,
               billing_cycle="monthly",
               amount=default_plan.amount,
               status="trial",
               next_billing_date=date.today() + timedelta(days=30),
           )
           SubscriptionHistory.objects.create(
               subscription=subscription,
               previous_status=None,
               new_status="trial",
               payment_reference="",
               notes="Tenant started with the trial plan.",
               changed_by=request.user,
           )
           tenant.subscription_plan = default_plan.code
           tenant.subscription_status = subscription.status
           tenant.save(update_fields=["subscription_plan", "subscription_status"])

        return Response(TenantSubscriptionSerializer(subscription).data)


class UpdateTenantSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        tenant = request.tenant
        membership = tenant.memberships.filter(user=request.user).first()
        if membership is None or membership.role not in [TenantRole.OWNER, TenantRole.ADMIN]:
           return Response({"detail": "Only an owner or admin can manage the subscription."}, status=status.HTTP_403_FORBIDDEN)

        plan_code = request.data.get("plan_code")
        if not plan_code:
           return Response({"detail": "plan_code is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
           plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
           return Response({"detail": "This subscription plan does not exist."}, status=status.HTTP_404_NOT_FOUND)

        billing_cycle = request.data.get("billing_cycle", "monthly")
        payment_reference = request.data.get("payment_reference", "")
        notes = request.data.get("notes", "")

        subscription, created = TenantSubscription.objects.get_or_create(
           tenant=tenant,
           defaults={
               "plan": plan,
               "billing_cycle": billing_cycle,
               "amount": plan.amount,
               "status": "pending_manual_payment",
               "next_billing_date": date.today() + timedelta(days=30),
               "payment_reference": payment_reference,
               "notes": notes,
           },
        )

        if not created:
           subscription.plan = plan
           subscription.billing_cycle = billing_cycle
           subscription.amount = plan.amount
           subscription.payment_reference = payment_reference
           subscription.notes = notes
           subscription.status = "pending_manual_payment"
           subscription.next_billing_date = date.today() + timedelta(days=30)
           subscription.save()

        tenant.subscription_plan = plan.code
        tenant.subscription_status = subscription.status
        tenant.save(update_fields=["subscription_plan", "subscription_status"])

        return Response(TenantSubscriptionSerializer(subscription).data, status=status.HTTP_200_OK)


class ConfirmTenantSubscriptionPaymentView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        tenant = request.tenant
        membership = tenant.memberships.filter(user=request.user).first()
        if membership is None or membership.role not in [TenantRole.OWNER, TenantRole.ADMIN]:
           return Response({"detail": "Only an owner or admin can confirm a subscription payment."}, status=status.HTTP_403_FORBIDDEN)

        subscription = TenantSubscription.objects.select_related("plan", "tenant").filter(tenant=tenant).first()
        if subscription is None:
           return Response({"detail": "No subscription record exists for this tenant."}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get("status", "active")
        allowed_statuses = {"active", "pending_manual_payment", "past_due", "cancelled"}
        if status_value not in allowed_statuses:
           return Response({"detail": "Invalid subscription status."}, status=status.HTTP_400_BAD_REQUEST)

        payment_reference = request.data.get("payment_reference") or subscription.payment_reference or "manual-payment"
        notes = request.data.get("notes") or subscription.notes or "Admin confirmed payment manually."

        previous_status = subscription.status
        subscription.status = status_value
        subscription.payment_reference = payment_reference
        subscription.notes = notes
        subscription.next_billing_date = date.today() + timedelta(days=30)
        subscription.save()

        SubscriptionHistory.objects.create(
           subscription=subscription,
           previous_status=previous_status,
           new_status=status_value,
           payment_reference=payment_reference,
           notes=notes,
           changed_by=request.user,
        )

        tenant.subscription_plan = subscription.plan.code
        tenant.subscription_status = status_value
        tenant.save(update_fields=["subscription_plan", "subscription_status"])

        return Response(TenantSubscriptionSerializer(subscription).data, status=status.HTTP_200_OK)
