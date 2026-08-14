from apps.core.authtntuser.models import Permission, RolePermission
from apps.core.tenant.models import TenantUser

PERMISSION_CATALOG = {
    "dashboard": ["view"],

    "flocks": ["view", "create", "update", "delete"],
    "houses": ["view", "create", "update", "delete"],
    "batches": ["view", "create", "update", "delete"],
    "birds": ["view", "create", "update", "delete"],

    "eggs": ["view", "create", "update", "delete"],
    "harvest": ["view", "create", "update", "delete"],

    "feed": ["view", "create", "update", "delete"],
    "health": ["view", "create", "update", "delete"],

    "sales": ["view", "create", "update", "delete"],
    "customers": ["view", "create", "update", "delete"],
    "suppliers": ["view", "create", "update", "delete"],
    "purchases": ["view", "create", "update", "delete"],
    "inventory": ["view", "create", "update", "delete"],

    "reports": ["view"],

    "finance": ["view", "create", "update", "delete"],

    "staff": ["view", "create", "update", "delete"],

    "settings": ["view", "update"],
}

def user_has_permission(user, tenant, module, action):
    """
    Check whether a user has a specific permission within a tenant.

    Permission resolution:

        User
          ↓
        TenantUser
          ↓
        Role
          ↓
        RolePermission
          ↓
        Permission
    """

    if not user or not user.is_authenticated:
        return False

    if not tenant or not module or not action:
        return False

    membership = (
        TenantUser.objects
        .select_related("role", "tenant")
        .filter(
            user=user,
            tenant=tenant,
            is_active=True,
        )
        .first()
    )

    if not membership:
        return False

    return RolePermission.objects.filter(
        tenant=tenant,
        role=membership.role,
        permission__tenant=tenant,
        permission__module=module,
        permission__action__in=[action, "all"],
        is_active=True,
    ).exists()
    
def create_tenant_permissions(tenant):
    """
    Create the standard permission set for a tenant.

    Returns a dictionary keyed by:
        module.action
    """

    permissions = {}

    for module, actions in PERMISSION_CATALOG.items():

        for action in actions:

            permission, _ = Permission.objects.get_or_create(
                tenant=tenant,
                module=module,
                action=action,
                defaults={
                    "is_active": True,
                },
            )

            permissions[f"{module}.{action}"] = permission

    return permissions

def assign_owner_permissions(tenant):
    """
    Give the tenant's Owner role every permission.
    """

    owner_membership = (
        TenantUser.objects
        .select_related("role")
        .filter(
            tenant=tenant,
            role__name="Owner",
            role__is_system_role=True,
            is_active=True,
        )
        .first()
    )

    if not owner_membership:
        raise ValueError(
            f"Owner role not found for tenant {tenant.id}"
        )

    permissions = Permission.objects.filter(
        tenant=tenant,
        is_active=True,
    )

    existing_permission_ids = set(
        RolePermission.objects.filter(
            tenant=tenant,
            role=owner_membership.role,
        ).values_list(
            "permission_id",
            flat=True,
        )
    )

    role_permissions = [
        RolePermission(
            tenant=tenant,
            role=owner_membership.role,
            permission=permission,
        )
        for permission in permissions
        if permission.id not in existing_permission_ids
    ]

    if role_permissions:
        RolePermission.objects.bulk_create(
            role_permissions
        )    
def setup_tenant_permissions(tenant):
    """
    Create all standard permissions for the tenant
    and assign them to the tenant's Owner role.
    """

    create_tenant_permissions(tenant)
    assign_owner_permissions(tenant)    