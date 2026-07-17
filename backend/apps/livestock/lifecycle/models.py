from apps.core.tenant.models import TenantBaseModel
from apps.livestock.batch.models import BirdBatch
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from django.db import models


class BatchDailyRecord(TenantBaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    house = models.ForeignKey(House, on_delete=models.CASCADE)
    batch = models.ForeignKey(BirdBatch, on_delete=models.CASCADE)

    record_date = models.DateField()

    opening_quantity = models.IntegerField()
    deaths = models.IntegerField(default=0)
    culls = models.IntegerField(default=0)
    closing_quantity = models.IntegerField()

    feed_consumed_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    water_consumed_l = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    average_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "livestock_batchdailyrecord"
        verbose_name = "Batch Daily Record"
        verbose_name_plural = "Batch Daily Records"
        indexes = [
            models.Index(fields=["tenant", "batch", "record_date"], name="idx_dailyrec_tenant_batch_date"),
            models.Index(fields=["tenant", "branch", "record_date"], name="idx_dailyrec_tnt_branch_date"),
        ]

    def __str__(self):
        return f"DailyRecord {self.batch} - {self.record_date}"


# class MortalityRecord(TenantBaseModel):
#     batch = models.ForeignKey(BirdBatch, on_delete=models.CASCADE)

#     date = models.DateField()
#     quantity = models.IntegerField()
#     reason = models.CharField(max_length=255, blank=True)

#     class Meta:
#         db_table = "livestock_mortalityrecord"
#         verbose_name = "Mortality Record"
#         verbose_name_plural = "Mortality Records"
#         indexes = [
#             models.Index(fields=["tenant", "batch", "date"], name="idx_mortality_tnt_batch_date"),
#         ]

#     def __str__(self):
#         return f"Mortality {self.batch} - {self.date} ({self.quantity})"


class WeightRecord(TenantBaseModel):
    batch = models.ForeignKey(BirdBatch, on_delete=models.CASCADE)

    average_weight = models.DecimalField(max_digits=10, decimal_places=2)
    sample_size = models.IntegerField(default=10)

    date = models.DateField()

    class Meta:
        db_table = "livestock_weightrecord"
        verbose_name = "Weight Record"
        verbose_name_plural = "Weight Records"
        indexes = [
            models.Index(fields=["tenant", "batch", "date"], name="idx_weight_tenant_batch_date"),
        ]

    def __str__(self):
        return f"Weight {self.batch} - {self.date} ({self.average_weight}kg)"