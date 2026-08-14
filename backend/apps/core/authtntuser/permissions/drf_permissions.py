from rest_framework.permissions import BasePermission

from apps.core.authtntuser.services.permissions import user_has_permission


class HasModulePermission(BasePermission):

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None)

        if not tenant:
            return False

        module = getattr(view, "module", None)

        if not module:
            return False

        action = getattr(view, "permission_action", None)

        if not action:
            action = getattr(view, "action", "view")

        return user_has_permission(
            user=request.user,
            tenant=tenant,
            module=module,
            action=action,
        )