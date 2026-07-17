from django.db import models

from apps.core.tenant.models import TenantBaseModel
from apps.organization.branch.models import Branch


class House(TenantBaseModel):

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="houses",
    )

    name = models.CharField(
        max_length=255
    )

    house_type = models.CharField(
        max_length=50,
        choices=[
            ("deep_litter", "Deep Litter"),
            ("cage", "Cage"),
        ]
    )

    capacity = models.PositiveIntegerField(
        default=0
    )


    class Meta:

        db_table = "organization_house"

        verbose_name = "House"
        verbose_name_plural = "Houses"

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "branch",
                ],
                name="idx_house_tenant_branch",
            ),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "branch",
                    "name",
                ],
                name="unique_house_name_per_branch",
            ),
        ]


    def __str__(self):
        return self.name