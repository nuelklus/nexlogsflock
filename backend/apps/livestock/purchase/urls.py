from rest_framework.routers import DefaultRouter

from .views import  ChickPurchaseViewSet,SupplierViewSet,CustomerViewSet, FeedPurchaseViewSet
router = DefaultRouter()


router.register(
    "purchases",
    ChickPurchaseViewSet,
    basename="purchases"
)
router.register(
    "suppliers",
    SupplierViewSet,
    basename="suppliers",
)

router.register(
    "customers",
    CustomerViewSet,
    basename="customers",
)

router.register(
    "feed-purchases",
    FeedPurchaseViewSet,
    basename="feed-purchases",
)

urlpatterns = router.urls