from rest_framework.routers import DefaultRouter

from .views import DiseaseViewSet


router = DefaultRouter()


router.register(
    r"",
    DiseaseViewSet,
    basename="diseases",
)


urlpatterns = router.urls