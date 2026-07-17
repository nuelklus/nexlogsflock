import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from ..users.models import User


class Tenant(models.Model):
    """
    Represents a company/business account in the SaaS system.
    Each tenant owns its own data.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    name = models.CharField(
        max_length=255,
        unique=True
    )

    slug = models.SlugField(
        max_length=255,
        unique=True,
        help_text="Unique identifier for URL routing"
    )

    description = models.TextField(
        blank=True
    )

    # Subscription
    subscription_plan = models.CharField(
        max_length=50,
        choices=[
            ("starter", "Starter"),
            ("business", "Business"),
            ("enterprise", "Enterprise"),
        ],
        default="starter"
    )

    # Branding / White label
    logo = models.URLField(
        null=True,
        blank=True
    )

    primary_color = models.CharField(
        max_length=20,
        default="#22c55e"
    )

    custom_domain = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    # Business settings
    timezone = models.CharField(
        max_length=100,
        default="Africa/Accra"
    )

    currency = models.CharField(
        max_length=10,
        default="GHS"
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )


    class Meta:
        db_table = "core_tenant"
        verbose_name = _("Tenant")
        verbose_name_plural = _("Tenants")


    def __str__(self):
        return self.name



class TenantRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Administrator"
    MANAGER = "MANAGER", "Manager"
    STAFF = "STAFF", "Staff"
    VIEWER = "VIEWER", "Viewer"



class TenantUser(models.Model):
    """
    Links users to tenants and controls access level.
    A user can belong to multiple tenants.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tenant_memberships"
    )

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    role = models.CharField(
        max_length=50,
        choices=TenantRole.choices,
        default=TenantRole.STAFF
    )

    is_active = models.BooleanField(
        default=True
    )

    joined_at = models.DateTimeField(
        auto_now_add=True
    )


    class Meta:
        db_table = "core_tenant_user"
        unique_together = (
            "user",
            "tenant",
        )
        verbose_name = _("Tenant User")
        verbose_name_plural = _("Tenant Users")


    def __str__(self):
        return f"{self.user.email} - {self.tenant.name}"

class TenantBaseModel(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
    )


    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )


    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )


    created_at = models.DateTimeField(
        auto_now_add=True
    )


    updated_at = models.DateTimeField(
        auto_now=True
    )


    is_active = models.BooleanField(
        default=True
    )


    class Meta:
        abstract = True