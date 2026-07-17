from apps.core.tenant.models import TenantBaseModel
from django.db import models


class FeedType(TenantBaseModel):

    name = models.CharField(max_length=100)

    bird_type = models.CharField(
        max_length=20,
        choices=[
            ("layer", "Layer"),
            ("broiler", "Broiler"),
            ("both", "Both"),
        ],
        default="both",
    )

    description = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "feed_feedtype"
        verbose_name = "Feed Type"
        verbose_name_plural = "Feed Types"

        indexes = [
            models.Index(
                fields=["tenant"],
                name="idx_feedtype_tenant",
            ),
        ]

    def __str__(self):
        return self.name