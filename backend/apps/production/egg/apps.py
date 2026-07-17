from django.apps import AppConfig


class AppsProductionEggConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.production.egg"
    label = "production_egg"

