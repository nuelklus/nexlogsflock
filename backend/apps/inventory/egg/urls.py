from rest_framework.routers import DefaultRouter

from .views import EggInventoryViewSet

router = DefaultRouter()

router.register(
    "",
    EggInventoryViewSet,
    basename="egg-inventory",
)

urlpatterns = router.urls