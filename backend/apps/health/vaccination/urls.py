from rest_framework.routers import DefaultRouter

from .views import (
    VaccineViewSet,
    VaccinationProgramViewSet,
    VaccinationScheduleViewSet,
    BatchVaccinationPlanViewSet,
    VaccinationRecordViewSet,
)


router = DefaultRouter()


router.register(
    r"vaccines",
    VaccineViewSet,
    basename="vaccines",
)


router.register(
    r"vaccination-programs",
    VaccinationProgramViewSet,
    basename="vaccination-programs",
)


router.register(
    r"vaccination-schedules",
    VaccinationScheduleViewSet,
    basename="vaccination-schedules",
)


router.register(
    r"batch-vaccination-plans",
    BatchVaccinationPlanViewSet,
    basename="batch-vaccination-plans",
)


router.register(
    r"vaccination-records",
    VaccinationRecordViewSet,
    basename="vaccination-records",
)


urlpatterns = router.urls