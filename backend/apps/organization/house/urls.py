from rest_framework.routers import DefaultRouter

from .views import HouseViewSet


router = DefaultRouter()

router.register(
    r"",
    HouseViewSet,
    basename="houses"
)


urlpatterns = router.urls