from rest_framework.routers import DefaultRouter

from .views import FeedTypeViewSet


router = DefaultRouter()

router.register(
    r"",
    FeedTypeViewSet,
    basename="feed-types",
)

urlpatterns = router.urls