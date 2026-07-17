from rest_framework.routers import DefaultRouter

from .views import MortalityViewSet


router = DefaultRouter()


router.register(
    r"",
    MortalityViewSet,
    basename="mortalities",
)


urlpatterns = router.urls