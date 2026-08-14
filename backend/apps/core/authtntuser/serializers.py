from django.db import transaction, IntegrityError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.tenant.models import Tenant, TenantUser, TenantRole
from apps.core.users.models import User
from apps.core.authtntuser.models import RolePermission
from apps.organization.branch.models import Branch
# ---------------------------------------------------------
from django.utils.text import slugify
# from apps.core.tenant.models import Tenant, TenantUser, Branch
from apps.core.authtntuser.models import Role
from apps.core.authtntuser.services.permissions import (
    setup_tenant_permissions,
)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user

        # ---------------------------------------------------------
        # Account status
        # ---------------------------------------------------------
        if not user.is_active:
            raise serializers.ValidationError(
                "Account is not active. Please verify your email."
            )

        # ---------------------------------------------------------
        # User information
        # ---------------------------------------------------------
        data["user"] = {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
        }

        # ---------------------------------------------------------
        # Organizations / Tenants
        # ---------------------------------------------------------
        memberships = (
            TenantUser.objects
            .select_related("tenant", "role")
            .filter(
                user=user,
                is_active=True,
                tenant__is_active=True,
            )
            .order_by("tenant__name")
        )

        organizations = []

        for membership in memberships:

            tenant = membership.tenant
            role = membership.role

            # -----------------------------------------------------
            # Get permissions for this user's role in this tenant
            # -----------------------------------------------------
            role_permissions = (
                RolePermission.objects
                .filter(
                    tenant=tenant,
                    role=role,
                    permission__tenant=tenant,
                    permission__is_active=True,
                    is_active=True,
                )
                .select_related("permission")
            )

            permissions = [
                f"{rp.permission.module}.{rp.permission.action}"
                for rp in role_permissions
            ]

            # -----------------------------------------------------
            # Safely resolve organization logo
            # -----------------------------------------------------
            logo_url = None

            if tenant.logo:
                try:
                    request = self.context.get("request")

                    if request:
                        logo_url = request.build_absolute_uri(
                            tenant.logo.url
                        )
                    else:
                        logo_url = tenant.logo.url

                except ValueError:
                    logo_url = None

            # -----------------------------------------------------
            # Organization payload
            # -----------------------------------------------------
            organizations.append({
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "is_active": tenant.is_active,
                "subscription_plan": tenant.subscription_plan,
                "logo": logo_url,
                "primary_color": tenant.primary_color,
                "timezone": tenant.timezone,
                "currency": tenant.currency,

                "role": {
                    "id": str(role.id),
                    "name": role.name,
                    "description": role.description,
                    "is_system_role": role.is_system_role,
                },

                "permissions": permissions,
            })

        data["organizations"] = organizations

        # ---------------------------------------------------------
        # Convenience field
        # ---------------------------------------------------------
        data["organization_count"] = len(organizations)

        return data
    
class OrganizationSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "subscription_plan",
            "logo",
            "primary_color",
            "timezone",
            "currency",
            "role",
            "permissions",
        ]

    def get_role(self, tenant):
        user = self.context["request"].user

        membership = (
            TenantUser.objects
            .select_related("role")
            .filter(
                user=user,
                tenant=tenant,
                is_active=True,
            )
            .first()
        )

        if not membership or not membership.role:
            return None

        return {
            "id": str(membership.role.id),
            "name": membership.role.name,
            "description": membership.role.description,
            "is_system_role": membership.role.is_system_role,
        }

    def get_permissions(self, tenant):
        user = self.context["request"].user

        membership = (
            TenantUser.objects
            .select_related("role")
            .filter(
                user=user,
                tenant=tenant,
                is_active=True,
            )
            .first()
        )

        if not membership or not membership.role:
            return []

        permissions = (
            RolePermission.objects
            .filter(
                tenant=tenant,
                role=membership.role,
                permission__tenant=tenant,
                permission__is_active=True,
                is_active=True,
            )
            .select_related("permission")
        )

        return [
            f"{rp.permission.module}.{rp.permission.action}"
            for rp in permissions
        ]
    def get_logo(self, obj):
        if not obj.logo:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(obj.logo.url)

        return obj.logo.url

class OwnerRegistrationSerializer(serializers.ModelSerializer):
    """
    Public farm-owner onboarding serializer.

    Creates:
        - User
        - Tenant / Organization
        - Owner Role
        - TenantUser membership
        - Tenant permissions
        - Initial Branch

    The client cannot choose:
        - tenant_id
        - role
        - permissions
        - is_active
        - is_staff
        - is_superuser
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        validators=[validate_password],
    )

    password2 = serializers.CharField(
        write_only=True,
        required=True,
    )

    organization_name = serializers.CharField(
        write_only=True,
        required=True,
        max_length=150,
    )

    organization_logo = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    branch_name = serializers.CharField(
        write_only=True,
        required=True,
        max_length=150,
    )

    branch_location = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        default="",
        max_length=255,
    )

    class Meta:
        model = User

        fields = (
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "phone_number",
            "organization_name",
            "organization_logo",
            "branch_name",
            "branch_location",
        )

        extra_kwargs = {
            "email": {
                "required": True,
            },
            "first_name": {
                "required": True,
            },
            "last_name": {
                "required": True,
            },
        }

    # ==========================================================
    # EMAIL VALIDATION
    # ==========================================================

    def validate_email(self, value):
        """
        Normalize email and prevent duplicate accounts.
        """

        email = value.strip().lower()

        if User.objects.filter(
            email__iexact=email
        ).exists():

            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return email

    # ==========================================================
    # ORGANIZATION VALIDATION
    # ==========================================================

    def validate_organization_name(self, value):
        """
        Validate organization name and prevent duplicates.
        """

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Organization name is required."
            )

        slug = slugify(value)

        if not slug:
            raise serializers.ValidationError(
                "Please provide a valid organization name."
            )

        # Prevent duplicate organization names.
        if Tenant.objects.filter(
            name__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "An organization with this name already exists."
            )

        # Prevent duplicate slugs.
        if Tenant.objects.filter(
            slug=slug
        ).exists():

            raise serializers.ValidationError(
                "An organization with this name already exists."
            )

        return value

    # ==========================================================
    # BRANCH VALIDATION
    # ==========================================================

    def validate_branch_name(self, value):
        """
        Validate the initial branch name.
        """

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Branch name is required."
            )

        return value

    # ==========================================================
    # CROSS-FIELD VALIDATION
    # ==========================================================

    def validate(self, attrs):
        """
        Validate fields that depend on each other.
        """

        password = attrs.get("password")
        password2 = attrs.get("password2")

        if password != password2:

            raise serializers.ValidationError(
                {
                    "password2": "Password fields didn't match."
                }
            )

        return attrs

    # ==========================================================
    # CREATE OWNER + TENANT + ROLE + PERMISSIONS + BRANCH
    # ==========================================================

    @transaction.atomic
    def create(self, validated_data):

        password = validated_data.pop(
            "password"
        )

        validated_data.pop(
            "password2"
        )

        organization_name = validated_data.pop(
            "organization_name"
        )

        organization_logo = validated_data.pop(
            "organization_logo",
            None,
        )

        branch_name = validated_data.pop(
            "branch_name"
        )

        branch_location = validated_data.pop(
            "branch_location",
            "",
        )

        try:

            # --------------------------------------------------
            # 1. Create owner account
            # --------------------------------------------------

            user = User.objects.create_user(
                email=validated_data["email"],
                password=password,
                first_name=validated_data.get(
                    "first_name",
                    "",
                ),
                last_name=validated_data.get(
                    "last_name",
                    "",
                ),
                phone_number=validated_data.get(
                    "phone_number",
                    "",
                ),

                # Owner can log in immediately after registration.
                is_active=True,
            )

            # --------------------------------------------------
            # 2. Generate organization slug
            # --------------------------------------------------

            organization_slug = slugify(
                organization_name
            )

            # --------------------------------------------------
            # 3. Create organization / tenant
            # --------------------------------------------------

            tenant = Tenant.objects.create(
                name=organization_name,
                slug=organization_slug,
                logo=organization_logo,
                is_active=True,
            )

            # --------------------------------------------------
            # 4. Create Owner role
            # --------------------------------------------------

            owner_role = Role.objects.create(
                tenant=tenant,
                name="Owner",
                description=(
                    "Full access to the organization."
                ),
                is_system_role=True,
                is_active=True,
            )

            # --------------------------------------------------
            # 5. Create tenant membership
            # --------------------------------------------------

            TenantUser.objects.create(
                user=user,
                tenant=tenant,
                role=owner_role,
                is_active=True,
            )

            # --------------------------------------------------
            # 6. Create tenant permissions
            #    and assign them to Owner
            # --------------------------------------------------

            setup_tenant_permissions(
                tenant
            )

            # --------------------------------------------------
            # 7. Create initial branch
            # --------------------------------------------------

            Branch.objects.create(
                tenant=tenant,
                name=branch_name,
                location=branch_location,
                is_active=True,
            )

            # --------------------------------------------------
            # 8. Return created user
            # --------------------------------------------------

            return user

        except IntegrityError as exc:

            error_message = str(
                exc
            ).lower()

            # --------------------------------------------------
            # Organization duplicate
            # --------------------------------------------------

            if (
                "tenant" in error_message
                and (
                    "name" in error_message
                    or "slug" in error_message
                )
            ):

                raise serializers.ValidationError(
                    {
                        "organization_name": (
                            "An organization with this "
                            "name already exists."
                        )
                    }
                )

            # --------------------------------------------------
            # User duplicate
            # --------------------------------------------------

            if (
                "user" in error_message
                and "email" in error_message
            ):

                raise serializers.ValidationError(
                    {
                        "email": (
                            "A user with this email "
                            "already exists."
                        )
                    }
                )

            # --------------------------------------------------
            # Unknown database integrity error
            # --------------------------------------------------
            # Do not hide unexpected database errors.
            # Let Django handle/log them normally.

            raise

class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class SetNewPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        
        # Validate password strength with Django's built-in validators
        try:
            validate_password(attrs["new_password"])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "New password fields didn't match."})

        if not self.context["request"].user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Wrong password."})

        # Validate new password strength with Django's built-in validators
        try:
            validate_password(attrs["new_password"], user=self.context["request"].user)
        except ValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        return attrs
