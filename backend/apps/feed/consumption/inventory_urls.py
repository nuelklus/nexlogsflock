from rest_framework.routers import DefaultRouter

from .views import FeedInventoryViewSet


router = DefaultRouter()

router.register(
    r"",
    FeedInventoryViewSet,
    basename="feed-inventory",
)

urlpatterns = router.urls
