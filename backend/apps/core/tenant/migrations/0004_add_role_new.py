from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        (
            "core_authtntuser",
            "0003_permission_created_by_permission_updated_by_and_more",
        ),
        (
            "core_tenant",
            "0003_alter_tenantuser_options_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="tenantuser",
            name="role_new",
            field=models.ForeignKey(
                to="core_authtntuser.role",
                on_delete=django.db.models.deletion.PROTECT,
                null=True,
                blank=True,
                related_name="+",
            ),
        ),
    ]