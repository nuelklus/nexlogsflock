from rest_framework.routers import DefaultRouter

from .views import FeedConsumptionViewSet


router = DefaultRouter()

router.register(
    r"",
    FeedConsumptionViewSet,
    basename="feed-consumption",
)

urlpatterns = router.urls