from rest_framework.permissions import BasePermission
from apps.core.authtntuser.services.permissions import user_has_permission


class HasModulePermission(BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = request.headers.get("X-Tenant-ID")
        if not tenant:
            return False

        module = getattr(view, "module", None)
        action = getattr(view, "action", "view")

        return user_has_permission(
            request.user,
            tenant,
            module,
            action
        )