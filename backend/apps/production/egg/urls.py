from rest_framework.routers import DefaultRouter

from .views import EggProductionViewSet

router = DefaultRouter()

router.register(
    r"egg-productions",
    EggProductionViewSet,
    basename="egg-productions",
)

urlpatterns = router.urls