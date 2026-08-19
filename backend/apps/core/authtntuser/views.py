from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import smart_str, DjangoUnicodeDecodeError
from django.utils.http import urlsafe_base64_decode
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerificationSerializer,
    PasswordResetRequestSerializer,
    SetNewPasswordSerializer,
    OwnerRegistrationSerializer,
    StaffRegistrationSerializer,
)
from .utils import (
    send_verification_email,
    send_password_reset_email,
)
from apps.core.tenant.models import Tenant, TenantUser, TenantRole
from apps.core.tenant.permissions import HasTenantAccess
from apps.organization.branch.models import Branch
from .serializers import OrganizationSerializer


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# start
class OwnerRegistrationView(generics.CreateAPIView):
    """
    Public farm-owner onboarding endpoint.

    POST /api/auth/register/
    """

    serializer_class = OwnerRegistrationSerializer
    permission_classes = [AllowAny]

    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        return Response(
            {
                "message": (
                    "Farm account created successfully."
                ),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )
# end

class StaffRegistrationView(generics.CreateAPIView):
    serializer_class = StaffRegistrationSerializer
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def create(self, request, *args, **kwargs):
        membership = getattr(request, "tenant_membership", None)
        if not membership or not membership.role:
            return Response(
                {"detail": "Only the tenant owner can register staff members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if membership.role.name != "Owner" or not membership.role.is_system_role:
            return Response(
                {"detail": "Only the tenant owner can register staff members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tenant_membership = (
            TenantUser.objects.select_related("role")
            .filter(user=user, tenant=request.tenant, is_active=True)
            .first()
        )
        role = tenant_membership.role if tenant_membership else None
        branch_id = serializer.validated_data["branch_id"]
        branch = Branch.objects.filter(id=branch_id, tenant=request.tenant, is_active=True).first()

        if not role or not branch:
            return Response(
                {"detail": "Staff registration failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_user = {
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "staff_type": serializer.validated_data["staff_type"],
            "role": {
                "id": str(role.id),
                "name": role.name,
            },
            "branch": {
                "id": str(branch.id),
                "name": branch.name,
            },
        }

        return Response(
            {
                "message": "Staff member registered successfully.",
                "user": response_user,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):

    permission_classes = [AllowAny]


    def post(self, request):

        serializer = EmailVerificationSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        token = serializer.validated_data["token"]


        try:
            uidb64, token = token.split(".")

            uid = smart_str(
                urlsafe_base64_decode(uidb64)
            )

            user = User.objects.get(
                pk=uid
            )


        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
            DjangoUnicodeDecodeError,
        ):

            return Response(
                {
                    "detail": "Invalid verification link."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        if not PasswordResetTokenGenerator().check_token(
            user,
            token
        ):

            return Response(
                {
                    "detail": "Verification link expired or invalid."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        user.is_active = True
        user.email_verified_at = timezone.now()
        user.save()


        return Response(
            {
                "detail": "Account activated successfully."
            },
            status=status.HTTP_200_OK
        )

class RequestPasswordResetEmailView(APIView):

    permission_classes = [AllowAny]


    def post(self, request):

        serializer = PasswordResetRequestSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )


        email = serializer.validated_data["email"]


        user = User.objects.filter(
            email=email
        ).first()


        if user:
            send_password_reset_email(user)


        return Response(
            {
                "detail": "If an account with that email exists, a password reset link has been sent."
            },
            status=status.HTTP_200_OK
        )

class SetNewPasswordView(APIView):

    permission_classes = [AllowAny]


    def post(self, request):

        serializer = SetNewPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )


        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]


        try:

            uid = smart_str(
                urlsafe_base64_decode(uid)
            )

            user = User.objects.get(
                pk=uid
            )


        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
            DjangoUnicodeDecodeError,
        ):

            return Response(
                {
                    "detail": "Invalid reset link."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        if not PasswordResetTokenGenerator().check_token(
            user,
            token
        ):

            return Response(
                {
                    "detail": "Reset link expired or invalid."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        user.set_password(
            new_password
        )

        user.save()


        return Response(
            {
                "detail": "Password reset successfully."
            },
            status=status.HTTP_200_OK
        )

class ChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]


    def post(self, request):

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={
                "request": request
            }
        )


        serializer.is_valid(
            raise_exception=True
        )


        request.user.set_password(
            serializer.validated_data["new_password"]
        )

        request.user.save()


        return Response(
            {
                "detail": "Password changed successfully."
            },
            status=status.HTTP_200_OK
        )

class LogoutView(APIView):

    permission_classes = [IsAuthenticated]


    def post(self, request):

        try:

            refresh_token = request.data["refresh"]

            token = RefreshToken(
                refresh_token
            )

            token.blacklist()


            return Response(
                {
                    "detail": "Successfully logged out."
                },
                status=status.HTTP_200_OK
            )


        except Exception as e:

            return Response(
                {
                    "detail": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

class TestAuthView(APIView):

    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):

        tenant = getattr(request, "tenant", None)
        
        return Response(
            {
                "message": "Authentication successful",
                "user": request.user.email,
                "user_id": str(request.user.id),
                "tenant": str(tenant) if tenant else None,
                "tenant_id": str(tenant.id) if tenant else None,
            }
        )
        
class OrganizationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        memberships = (
            TenantUser.objects
            .filter(
                user=request.user,
                is_active=True,
                tenant__is_active=True,
            )
            .select_related("tenant", "role")
            .order_by("tenant__name")
        )

        organizations = [
            membership.tenant
            for membership in memberships
        ]

        serializer = OrganizationSerializer(
            organizations,
            many=True,
            context={"request": request},
        )

        return Response({
            "organizations": serializer.data,
            "organization_count": len(organizations),
        })