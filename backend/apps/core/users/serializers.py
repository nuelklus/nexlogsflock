from rest_framework import serializers
from .models import User

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("email", "is_active", "date_joined")

class UserAvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "avatar") # Assuming you will add an 'avatar' field to the User model
        read_only_fields = ("id",)
