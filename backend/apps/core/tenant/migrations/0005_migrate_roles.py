from django.db import migrations


def migrate_roles(apps, schema_editor):
    Tenant = apps.get_model("core_tenant", "Tenant")
    TenantUser = apps.get_model("core_tenant", "TenantUser")
    Role = apps.get_model("core_authtntuser", "Role")

    for tenant in Tenant.objects.all():

        owner_role, _ = Role.objects.get_or_create(
            tenant_id=tenant.id,
            name="Owner",
            defaults={
                "description": "Full access to the organization.",
                "is_system_role": True,
                "is_active": True,
            },
        )

        TenantUser.objects.filter(
            tenant_id=tenant.id,
            role="OWNER",
        ).update(
            role_new_id=owner_role.id
        )


class Migration(migrations.Migration):

    dependencies = [
        (
            "core_tenant",
            "0004_add_role_new",
        ),
    ]

    operations = [
        migrations.RunPython(
            migrate_roles,
            migrations.RunPython.noop,
        ),
    ]