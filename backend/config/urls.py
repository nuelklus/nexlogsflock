"""URL configuration for NexlogsFlock."""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    path("api/feed-inventory/", include("apps.feed.consumption.inventory_urls")),
    path("api/feed-stock-movements/", include("apps.feed.consumption.movement_urls")),
    path("api/diseases/",include("apps.health.disease.urls")),
    path("api/",include("apps.health.medication.urls")),
    path("api/treatment-plans/", include("apps.health.treatment.urls")),
    path("api/disease-outbreaks/",include("apps.health.outbreak.urls")),
    path("api/", include("apps.health.vaccination.urls")),
    path("api/", include("apps.production.egg.urls")),
    path("api/mortalities/",include("apps.livestock.mortality.urls")),
    path("api/harvest/",include("apps.production.harvest.urls")),
    path("api/",include("apps.finance.invoice.urls")),
    path("api/payments/", include("apps.finance.payment.urls")),
    path("api/", include("apps.finance.expense.urls")),
    path("api/egg-inventory/", include("apps.inventory.egg.urls")),
]
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )