from django.urls import path

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from .views import (
    CustomTokenObtainPairView,
    OrganizationListView,
    OwnerRegistrationView,
    VerifyEmailView,
    RequestPasswordResetEmailView,
    SetNewPasswordView,
    ChangePasswordView,
    LogoutView,
    TestAuthView
)


app_name = "authtntuser"


urlpatterns = [

    # =========================
    # User Registration
    # =========================
    # path(
    #     "register/",
    #     RegisterUserView.as_view(),
    #     name="register",
    # ),
    path(
        "OwnerRegister/",
        OwnerRegistrationView.as_view(),
        name="owner_register",
    ),


    # =========================
    # JWT Authentication
    # =========================
    path(
        "token/",
        CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),


    # Optional alias (if your frontend already uses /login/)
    path(
        "login/",
        CustomTokenObtainPairView.as_view(),
        name="login",
    ),


    # =========================
    # Email Verification
    # =========================
    path(
        "verify-email/",
        VerifyEmailView.as_view(),
        name="verify_email",
    ),


    # =========================
    # Password Management
    # =========================
    path(
        "password-reset/",
        RequestPasswordResetEmailView.as_view(),
        name="password_reset",
    ),


    path(
        "password-reset-confirm/",
        SetNewPasswordView.as_view(),
        name="password_reset_confirm",
    ),


    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change_password",
    ),


    # =========================
    # Logout
    # =========================
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
    path(
        "test/",
        TestAuthView.as_view(),
        name="test-auth"
    ),
    
     path(
        "organizations/",
        OrganizationListView.as_view(),
        name="organizations",
    ),
]