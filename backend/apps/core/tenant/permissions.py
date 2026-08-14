from rest_framework.permissions import BasePermission
from .models import TenantRole, Tenant, TenantUser
from rest_framework.exceptions import PermissionDenied

class IsOrganizationMember(BasePermission):
    message = "You are not a member of this organization or an organization was not specified."

    def has_permission(self, request, view):
        tenant_slug = request.headers.get("X-Tenant-ID")
        if not tenant_slug:
            return False
        
        try:
            organization = Tenant.objects.get(slug=tenant_slug)
        except Tenant.DoesNotExist:
            return False
        
        # Attach the organization to the request for later use in views
        request.organization = organization
        
        return request.user.tenant_memberships.filter(tenant=organization).exists()


class IsOrganizationOwner(BasePermission):
    message = "You must be an Owner of this organization."

    def has_permission(self, request, view):
        # Assumes IsOrganizationMember has already run and attached request.organization
        organization = getattr(request, "organization", None)
        if not organization:
            return False
        return request.user.tenant_memberships.filter(
            tenant=organization, role=TenantRole.OWNER
        ).exists()


class HasOrganizationRole(BasePermission):
    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        # Assumes IsOrganizationMember has already run and attached request.organization
        organization = getattr(request, "organization", None)
        if not organization:
            return False
        membership = request.user.tenant_memberships.filter(tenant=organization).first()
        if not membership:
            return False
        return membership.role in self.allowed_roles

class HasTenantAccess(BasePermission):

    def has_permission(self, request, view):

        if not request.user.is_authenticated:
            return False


        tenant_id = request.headers.get(
            "X-Tenant-ID"
        )


        if not tenant_id:
            raise PermissionDenied(
                "X-Tenant-ID header is required"
            )


        membership = TenantUser.objects.filter(
            user=request.user,
            tenant_id=tenant_id,
            is_active=True
        ).select_related(
            "tenant",
            "role",
        ).first()

        if not membership:
            raise PermissionDenied(
                "You do not have access to this tenant"
            )


        request.tenant = membership.tenant
        request.tenant_membership = membership
        request.role = membership.role

        return True