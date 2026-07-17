from apps.core.tenant.models import TenantBaseModel
from apps.feed.feed_type.models import FeedType
from apps.livestock.batch.models import BirdBatch
from django.db import models


class FeedConsumption(TenantBaseModel):
    batch = models.ForeignKey(BirdBatch, on_delete=models.CASCADE)
    feed_type = models.ForeignKey(FeedType, on_delete=models.SET_NULL, null=True)

    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()

    class Meta:
        db_table = "feed_consumption"
        verbose_name = "Feed Consumption"
        verbose_name_plural = "Feed Consumptions"
        indexes = [
            models.Index(fields=["tenant", "batch", "date"], name="idx_feedcons_tenant_batch_date"),
        ]

    def __str__(self):
        return f"Feed {self.batch} - {self.date} ({self.quantity}kg)"