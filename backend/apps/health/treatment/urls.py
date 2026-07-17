from rest_framework.routers import DefaultRouter

from .views import TreatmentPlanViewSet


router = DefaultRouter()

router.register(
    r"",
    TreatmentPlanViewSet,
    basename="treatment-plans",
)

urlpatterns = router.urls