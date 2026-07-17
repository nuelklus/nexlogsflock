from apps.core.tenant.models import TenantBaseModel
from django.db import models


class Disease(TenantBaseModel):

    name = models.CharField(
        max_length=100
    )


    bird_type = models.CharField(
        max_length=20,
        choices=[
            ("layer", "Layer"),
            ("broiler", "Broiler"),
            ("both", "Both"),
        ],
    )


    disease_type = models.CharField(
        max_length=30,
        choices=[
            ("viral", "Viral"),
            ("bacterial", "Bacterial"),
            ("parasitic", "Parasitic"),
            ("fungal", "Fungal"),
            ("nutritional", "Nutritional"),
            ("other", "Other"),
        ],
    )


    description = models.TextField(
        blank=True
    )


    symptoms = models.TextField(
        blank=True
    )


    prevention = models.TextField(
        blank=True
    )


    class Meta:

        db_table = "health_disease"

        verbose_name = "Disease"

        verbose_name_plural = "Diseases"


        constraints = [

            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "name",
                ],
                name="unique_disease_per_tenant",
            ),

        ]


        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "bird_type",
                ],
                name="idx_disease_tenant_birdtype",
            ),

        ]


    def __str__(self):

        return self.name