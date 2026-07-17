"""URL configuration for NexlogsFlock."""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.core.authtntuser.urls")),
    path( "api/branches/",include("apps.organization.branch.urls")),
    path("api/houses/", include("apps.organization.house.urls")),
    path("api/batches/", include("apps.livestock.batch.urls")),
    path("api/breeds/", include("apps.livestock.breed.urls")),
    path("api/", include("apps.livestock.purchase.urls")),
    path("api/feed-types/", include("apps.feed.feed_type.urls")),
    path("api/feed-consumption/",include("apps.feed.consumption.urls")),
    path("api/diseases/",include("apps.health.disease.urls")),
    path("api/",include("apps.health.medication.urls")),
    path("api/treatment-plans/", include("apps.health.treatment.urls")),
    path("api/disease-outbreaks/",include("apps.health.outbreak.urls")),
    path("api/", include("apps.health.vaccination.urls")),
    path("api/", include("apps.production.egg.urls")),
    path("api/mortalities/",include("apps.livestock.mortality.urls")),
    path("api/harvest/",include("apps.production.harvest.urls")),
    path("api/",include("apps.finance.invoice.urls")),
    path("api/egg-inventory/", include("apps.inventory.egg.urls")),
]