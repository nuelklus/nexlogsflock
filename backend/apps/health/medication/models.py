from apps.core.tenant.models import TenantBaseModel
from apps.health.treatment.models import TreatmentPlan
from django.db import models

class Medication(TenantBaseModel):

    name = models.CharField(
        max_length=150
    )

    medication_type = models.CharField(
        max_length=30,
        choices=[
            ("antibiotic", "Antibiotic"),
            ("vaccine", "Vaccine"),
            ("vitamin", "Vitamin"),
            ("supplement", "Supplement"),
            ("other", "Other"),
        ],
        default="other",
    )

    description = models.TextField(
        blank=True
    )

    manufacturer = models.CharField(
        max_length=150,
        blank=True,
    )

    unit = models.CharField(
        max_length=50,
        choices=[
            ("bottle", "Bottle"),
            ("sachet", "Sachet"),
            ("tablet", "Tablet"),
            ("dose", "Dose"),
            ("kg", "Kg"),
            ("liter", "Liter"),
        ],
        default="bottle",
    )


    class Meta:

        db_table = "health_medication"

        verbose_name = "Medication"

        verbose_name_plural = "Medications"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "name",
                ],
                name="unique_medication_per_tenant",
            ),
        ]


        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "medication_type",
                ],
                name="idx_medication_tenant_type",
            ),
        ]


    def __str__(self):

        return self.name
    
class MedicationAdministration(TenantBaseModel):

    treatment = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.CASCADE,
        related_name="medication_administrations",
    )

    medication = models.ForeignKey(
        "Medication",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="administrations",
    )

    dosage = models.CharField(
        max_length=100,
    )

    route = models.CharField(
        max_length=50,
        choices=[
            ("water", "Drinking Water"),
            ("feed", "Feed"),
            ("injection", "Injection"),
            ("oral", "Oral"),
            ("other", "Other"),
        ],
        default="water",
    )

    frequency_per_day = models.PositiveSmallIntegerField(
        default=1,
        help_text="Number of times medication is given per day",
    )

    duration_days = models.PositiveSmallIntegerField(
        default=1,
        help_text="Number of days medication should be administered",
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    instructions = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "health_medicationadministration"

        verbose_name = "Medication Administration"

        verbose_name_plural = "Medication Administrations"

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "treatment",
                ],
                name="idx_medadmin_tenant_treatment",
            ),

        ]


    def save(self, *args, **kwargs):

        if self.start_date and self.duration_days:

            from datetime import timedelta

            self.end_date = (
                self.start_date +
                timedelta(days=self.duration_days - 1)
            )

        super().save(*args, **kwargs)


    def __str__(self):

        return f"{self.medication} - {self.treatment}"