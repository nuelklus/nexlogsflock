from rest_framework.routers import DefaultRouter

from .views import BirdBatchViewSet

router = DefaultRouter()

router.register(
    r"",
    BirdBatchViewSet,
    basename="batches",
)

urlpatterns = router.urls