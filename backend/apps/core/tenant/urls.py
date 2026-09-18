from django.urls import path

from .views import (
    ConfirmTenantSubscriptionPaymentView,
    CurrentTenantSubscriptionView,
    SubscriptionPlanListView,
    TenantCreateView,
    TenantDetailView,
    TenantListView,
    TenantMemberListCreateView,
    TenantMemberDetailView,
    UpdateTenantSubscriptionView,
)

urlpatterns = [
    path("my-organizations/", TenantListView.as_view(), name="tenant_list"),
    path("organizations/", TenantCreateView.as_view(), name="tenant_create"),
    path("organizations/<slug:slug>/", TenantDetailView.as_view(), name="tenant_detail"),
    path("organizations/<slug:slug>/members/", TenantMemberListCreateView.as_view(), name="tenant_member_list_create"),
    path("organizations/<slug:slug>/members/<uuid:user_id>/", TenantMemberDetailView.as_view(), name="tenant_member_detail"),
    path("subscriptions/plans/", SubscriptionPlanListView.as_view(), name="subscription_plans"),
    path("subscriptions/current/", CurrentTenantSubscriptionView.as_view(), name="current_subscription"),
    path("subscriptions/update/", UpdateTenantSubscriptionView.as_view(), name="update_subscription"),
    path("subscriptions/confirm/", ConfirmTenantSubscriptionPaymentView.as_view(), name="confirm_subscription_payment"),
]
