from rest_framework.routers import DefaultRouter

from .views import BreedViewSet


router = DefaultRouter()


router.register(
    r"",
    BreedViewSet,
    basename="breeds"
)


urlpatterns = router.urls