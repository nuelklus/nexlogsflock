from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.users.models import User

from .models import Tenant, TenantUser, TenantRole
from .permissions import HasOrganizationRole, IsOrganizationMember, IsOrganizationOwner
from .serializers import (
    TenantMembershipCreateSerializer,
    TenantMembershipUpdateSerializer,
    TenantSerializer,
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
