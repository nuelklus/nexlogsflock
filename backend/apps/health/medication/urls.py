from rest_framework.routers import DefaultRouter
from .views import MedicationViewSet, MedicationAdministrationViewSet


router = DefaultRouter()


router.register(
    "medications",
    MedicationViewSet,
    basename="medications",
)

router.register(
    "medication-administrations",
    MedicationAdministrationViewSet,
    basename="medication-administrations",
)


urlpatterns = router.urls