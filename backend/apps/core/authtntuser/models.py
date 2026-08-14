from django.db import models
from apps.core.tenant.models import TenantBaseModel

class Role(TenantBaseModel):
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(default=False)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],
                name="unique_tenant_role_name",
            ),
        ]
            
class Permission(TenantBaseModel):
    module = models.CharField(max_length=50)
    action = models.CharField(
        max_length=20,
        choices=[
            ("view", "View"),
            ("create", "Create"),
            ("update", "Update"),
            ("delete", "Delete"),
            ("all", "All"),
        ],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "module", "action"],
                name="unique_tenant_permission",
            ),
        ]
        
class RolePermission(TenantBaseModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "role", "permission"],
                name="unique_tenant_role_permission",
            ),
        ]