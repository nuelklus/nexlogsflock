from rest_framework.routers import DefaultRouter

from .views import HarvestViewSet

router = DefaultRouter()

router.register(
    r"",
    HarvestViewSet,
    basename="harvest",
)

urlpatterns = router.urls