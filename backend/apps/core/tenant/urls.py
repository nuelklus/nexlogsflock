from django.urls import path

from .views import (
    TenantCreateView,
    TenantDetailView,
    TenantListView,
    TenantMemberListCreateView,
    TenantMemberDetailView,
)

urlpatterns = [
    path("my-organizations/", TenantListView.as_view(), name="tenant_list"),
    path("organizations/", TenantCreateView.as_view(), name="tenant_create"),
    path("organizations/<slug:slug>/", TenantDetailView.as_view(), name="tenant_detail"),
    path("organizations/<slug:slug>/members/", TenantMemberListCreateView.as_view(), name="tenant_member_list_create"),
    path("organizations/<slug:slug>/members/<uuid:user_id>/", TenantMemberDetailView.as_view(), name="tenant_member_detail"),
]
