from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.tenant.models import Tenant, TenantUser, TenantRole
from apps.core.users.models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add custom claims
        data["id"] = self.user.id
        data["email"] = self.user.email
        data["first_name"] = self.user.first_name
        data["last_name"] = self.user.last_name
        # You might want to add active organization or list of organizations here after selection
        # For now, let's just return basic user info

        if not self.user.is_active:
            raise serializers.ValidationError("Account is not active. Please verify your email.")

        return data

class UserRegistrationSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    password2 = serializers.CharField(
        write_only=True,
        required=True
    )

    organization_name = serializers.CharField(
        write_only=True,
        required=True
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
        )

        extra_kwargs = {
            "password": {
                "write_only": True
            }
        }


    def validate(self, attrs):

        # Check passwords match
        if attrs["password"] != attrs["password2"]:

            raise serializers.ValidationError(
                {
                    "password": "Password fields didn't match."
                }
            )


        # Validate password strength
        try:

            validate_password(
                attrs["password"],
                user=User(
                    email=attrs.get("email"),
                    first_name=attrs.get("first_name", ""),
                    last_name=attrs.get("last_name", ""),
                )
            )

        except ValidationError as e:

            raise serializers.ValidationError(
                {
                    "password": list(e.messages)
                }
            )


        # Check duplicate email
        if User.objects.filter(
            email=attrs["email"]
        ).exists():

            raise serializers.ValidationError(
                {
                    "email": "A user with this email already exists."
                }
            )


        return attrs



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


        # Create inactive user
        user = User.objects.create_user(

            email=validated_data.get("email"),

            password=password,

            first_name=validated_data.get(
                "first_name",
                ""
            ),

            last_name=validated_data.get(
                "last_name",
                ""
            ),

            phone_number=validated_data.get(
                "phone_number",
                ""
            ),

            is_active=False,
        )


        # Create tenant/company
        tenant = Tenant.objects.create(

            name=organization_name,

            slug=organization_name.lower()
                .replace(" ", "-"),

            is_active=True,
        )


        # Assign user as tenant owner
        TenantUser.objects.create(

            user=user,

            tenant=tenant,

            role=TenantRole.OWNER,

            is_active=True,
        )


        return user

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
