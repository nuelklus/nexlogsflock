from rest_framework.routers import DefaultRouter

from .views import FeedStockMovementViewSet


router = DefaultRouter()

router.register(
    r"",
    FeedStockMovementViewSet,
    basename="feed-stock-movements",
)

urlpatterns = router.urls
