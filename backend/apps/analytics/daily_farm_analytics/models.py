from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch
from django.db import models


class DailyFarmAnalytics(TenantBaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    date = models.DateField()

    total_birds = models.IntegerField()
    mortality = models.IntegerField()

    feed_used = models.DecimalField(max_digits=10, decimal_places=2)
    egg_production = models.IntegerField(default=0)

    sales = models.DecimalField(max_digits=12, decimal_places=2)
    expenses = models.DecimalField(max_digits=12, decimal_places=2)
    profit = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "analytics_dailyfarmanalytics"
        verbose_name = "Daily Farm Analytics"
        verbose_name_plural = "Daily Farm Analytics"
        indexes = [
            models.Index(fields=["tenant", "branch", "date"], name="idx_dfa_tenant_branch_date"),
        ]

    def __str__(self):
        return f"Analytics {self.branch} - {self.date}"