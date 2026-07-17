import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(
        _("email address"),
        unique=True,
        db_index=True,
    )

    first_name = models.CharField(
        _("first name"),
        max_length=150,
        blank=True,
    )

    last_name = models.CharField(
        _("last name"),
        max_length=150,
        blank=True,
    )

    phone_number = models.CharField(
        _("phone number"),
        max_length=20,
        blank=True,
        null=True,
    )

    is_staff = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=False,  # Becomes True after email verification
        db_index=True,
    )

    date_joined = models.DateTimeField(
        default=timezone.now,
    )
    email_verified_at = models.DateTimeField(
    null=True,
    blank=True,
    )

    last_password_change = models.DateTimeField(
        null=True,
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """
        Return the user's full name.
        """
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        """
        Return the user's short name.
        """
        return self.first_name
