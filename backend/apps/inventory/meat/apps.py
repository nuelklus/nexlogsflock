from django.apps import AppConfig


class MeatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.inventory.meat'
    label = "inventory_meat"