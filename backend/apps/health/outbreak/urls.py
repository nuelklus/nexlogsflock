from rest_framework.routers import DefaultRouter
from .views import DiseaseOutbreakViewSet

router = DefaultRouter()

router.register(
    r"",
    DiseaseOutbreakViewSet,
    basename="disease-outbreaks",
)
urlpatterns = router.urls