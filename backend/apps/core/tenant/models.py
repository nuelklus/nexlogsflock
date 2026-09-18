import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from ..users.models import User

class Tenant(models.Model):
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

    subscription_status = models.CharField(
        max_length=30,
        choices=[
            ("trial", "Trial"),
            ("active", "Active"),
            ("pending_manual_payment", "Pending Manual Payment"),
            ("past_due", "Past Due"),
            ("cancelled", "Cancelled"),
        ],
        default="trial",
        help_text="Manual subscription lifecycle for SaaS billing.",
    )

    # Branding / White label
    logo = models.ImageField(
        upload_to="organizations/logos/",
        null=True,
        blank=True,
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


class SubscriptionPlan(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    billing_cycle = models.CharField(
        max_length=20,
        choices=[("monthly", "Monthly"), ("annual", "Annual")],
        default="monthly",
    )
    max_users = models.PositiveIntegerField(default=5)
    max_branches = models.PositiveIntegerField(default=1)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_subscription_plan"
        ordering = ["amount"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class TenantSubscription(models.Model):
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="tenant_subscriptions",
    )
    status = models.CharField(
        max_length=30,
        choices=[
            ("trial", "Trial"),
            ("active", "Active"),
            ("pending_manual_payment", "Pending Manual Payment"),
            ("past_due", "Past Due"),
            ("cancelled", "Cancelled"),
        ],
        default="trial",
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=[("monthly", "Monthly"), ("annual", "Annual")],
        default="monthly",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    next_billing_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_tenant_subscription"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name}"


class SubscriptionHistory(models.Model):
    subscription = models.ForeignKey(
        TenantSubscription,
        on_delete=models.CASCADE,
        related_name="history",
    )
    previous_status = models.CharField(
        max_length=30,
        choices=[
            ("trial", "Trial"),
            ("active", "Active"),
            ("pending_manual_payment", "Pending Manual Payment"),
            ("past_due", "Past Due"),
            ("cancelled", "Cancelled"),
        ],
        blank=True,
        null=True,
    )
    new_status = models.CharField(
        max_length=30,
        choices=[
            ("trial", "Trial"),
            ("active", "Active"),
            ("pending_manual_payment", "Pending Manual Payment"),
            ("past_due", "Past Due"),
            ("cancelled", "Cancelled"),
        ],
    )
    payment_reference = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscription_history_updates",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_subscription_history"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subscription.tenant.name}: {self.previous_status} -> {self.new_status}"


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

    role = models.ForeignKey(
        "core_authtntuser.Role",
        on_delete=models.PROTECT,
        related_name="tenant_memberships",
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