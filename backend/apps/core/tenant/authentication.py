from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.core.tenant.models import TenantUser


class TenantAuthentication(BaseAuthentication):

    def authenticate(self, request):

        user = request.user
        print(user)
        # JWT authentication has not authenticated user yet
        if not user.is_authenticated:
            return None


        tenant_id = request.headers.get(
            "X-Tenant-ID"
        )


        if not tenant_id:
            raise AuthenticationFailed(
                "X-Tenant-ID header required"
            )


        membership = TenantUser.objects.filter(
            user=user,
            tenant_id=tenant_id,
            is_active=True
        ).select_related(
            "tenant"
        ).first()


        if not membership:
            raise AuthenticationFailed(
                "You do not have access to this tenant"
            )


        # Attach tenant to request
        request.tenant = membership.tenant


        return (
            user,
            None
        )