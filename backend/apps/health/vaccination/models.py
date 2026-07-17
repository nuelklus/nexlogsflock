from apps.core.tenant.models import TenantBaseModel
from apps.livestock.batch.models import BirdBatch
from django.db import models


class Vaccine(TenantBaseModel):

    name = models.CharField(
        max_length=100,
    )

    manufacturer = models.CharField(
        max_length=100,
        blank=True,
    )

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

        db_table = "health_vaccine"

        verbose_name = "Vaccine"

        verbose_name_plural = "Vaccines"

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "bird_type",
                ],
                name="idx_vaccine_tenant_type",
            ),

        ]


    def __str__(self):

        return self.name


class VaccinationProgram(TenantBaseModel):

    name = models.CharField(
        max_length=100,
    )

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

        db_table = "health_vaccinationprogram"

        verbose_name = "Vaccination Program"

        verbose_name_plural = "Vaccination Programs"

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "bird_type",
                ],
                name="idx_vaccprog_tenant_birdtype",
            ),

        ]


    def __str__(self):

        return self.name


class VaccinationSchedule(TenantBaseModel):

    program = models.ForeignKey(
        VaccinationProgram,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    vaccine = models.ForeignKey(
        Vaccine,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    recommended_day = models.PositiveIntegerField()

    route = models.CharField(
        max_length=50,
        choices=[
            ("water", "Water"),
            ("injection", "Injection"),
            ("spray", "Spray"),
            ("eye_drop", "Eye Drop"),
            ("oral", "Oral"),
            ("other", "Other"),
        ],
        default="water",
    )

    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "health_vaccinationschedule"

        verbose_name = "Vaccination Schedule"

        verbose_name_plural = "Vaccination Schedules"

        ordering = [
            "recommended_day",
        ]

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "program",
                ],
                name="idx_vaccsched_tenant_program",
            ),

        ]


    def __str__(self):

        return (
            f"{self.vaccine.name} "
            f"(Day {self.recommended_day})"
        )


class BatchVaccinationPlan(TenantBaseModel):

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="vaccination_plans",
    )

    schedule = models.ForeignKey(
        VaccinationSchedule,
        on_delete=models.CASCADE,
        related_name="batch_plans",
    )

    due_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("done", "Done"),
            ("missed", "Missed"),
        ],
        default="pending",
    )


    class Meta:

        db_table = "health_batchvaccinationplan"

        verbose_name = "Batch Vaccination Plan"

        verbose_name_plural = "Batch Vaccination Plans"

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "due_date",
                ],
                name="idx_batchvacc_tenant_batch_due",
            ),

            models.Index(
                fields=[
                    "tenant",
                    "status",
                ],
                name="idx_batchvacc_tenant_status",
            ),

        ]


    def __str__(self):

        return (
            f"{self.batch} - "
            f"{self.schedule}"
        )


class VaccinationRecord(TenantBaseModel):

    batch = models.ForeignKey(
        BirdBatch,
        on_delete=models.CASCADE,
        related_name="vaccination_records",
    )

    plan = models.ForeignKey(
        BatchVaccinationPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )

    vaccine = models.ForeignKey(
        Vaccine,
        on_delete=models.SET_NULL,
        null=True,
        related_name="records",
    )

    date_administered = models.DateField()

    quantity_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    route = models.CharField(
        max_length=50,
        choices=[
            ("water", "Water"),
            ("injection", "Injection"),
            ("spray", "Spray"),
            ("eye_drop", "Eye Drop"),
            ("oral", "Oral"),
            ("other", "Other"),
        ],
        default="water",
    )

    notes = models.TextField(
        blank=True,
    )


    class Meta:

        db_table = "health_vaccinationrecord"

        verbose_name = "Vaccination Record"

        verbose_name_plural = "Vaccination Records"

        indexes = [

            models.Index(
                fields=[
                    "tenant",
                    "batch",
                    "date_administered",
                ],
                name="idx_vaccrec_tenant_batch_date",
            ),

        ]


    def __str__(self):

        return (
            f"{self.batch} - "
            f"{self.vaccine}"
        )