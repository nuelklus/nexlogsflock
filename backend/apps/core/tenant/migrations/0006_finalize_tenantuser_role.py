from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        (
            "core_tenant",
            "0005_migrate_roles",
        ),
    ]

    operations = [
        migrations.RemoveField(
            model_name="tenantuser",
            name="role",
        ),

        migrations.RenameField(
            model_name="tenantuser",
            old_name="role_new",
            new_name="role",
        ),

        migrations.AlterField(
            model_name="tenantuser",
            name="role",
            field=models.ForeignKey(
                to="core_authtntuser.role",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="tenant_memberships",
            ),
        ),
    ]