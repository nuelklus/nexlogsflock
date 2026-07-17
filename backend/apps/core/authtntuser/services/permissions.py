from apps.core.authtntuser.models import RolePermission
from apps.core.tenant.models import TenantUser

def user_has_permission(user, tenant, module, action):
    tenant_user = TenantUser.objects.filter(user=user, tenant=tenant).first()

    if not tenant_user:
        return False

    permissions = RolePermission.objects.filter(role=tenant_user.role)

    return permissions.filter(
        permission__module=module,
        permission__action__in=[action, "all"]
    ).exists()