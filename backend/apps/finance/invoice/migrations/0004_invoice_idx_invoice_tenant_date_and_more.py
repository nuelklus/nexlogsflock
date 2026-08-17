from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance_invoice", "0003_invoiceitem_stock_quantity_alter_invoiceitem_unit"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="invoice",
            index=models.Index(fields=["tenant", "invoice_date"], name="idx_invoice_tenant_date"),
        ),
        migrations.AddIndex(
            model_name="invoice",
            index=models.Index(fields=["tenant", "branch"], name="idx_invoice_tenant_branch"),
        ),
        migrations.AddIndex(
            model_name="invoice",
            index=models.Index(fields=["tenant", "customer"], name="idx_invoice_tenant_customer"),
        ),
    ]
