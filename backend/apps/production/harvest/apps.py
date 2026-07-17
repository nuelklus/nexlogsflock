from django.apps import AppConfig


class AppsProductionHarvestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.production.harvest"
    label = "production_harvest"

