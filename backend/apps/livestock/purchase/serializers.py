from rest_framework import serializers
from apps.livestock.breed.models import Breed
from apps.organization.branch.models import Branch
from .models import ChickPurchase, Supplier, Customer, FeedPurchase
from apps.livestock.purchase.models import Supplier

class ChickPurchaseSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )

    breed_name = serializers.CharField(
        source="breed.name",
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    total_cost = serializers.ReadOnlyField()


    class Meta:

        model = ChickPurchase

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "supplier",
            "supplier_name",

            "breed",
            "breed_name",

            "branch",
            "branch_name",

            "purchase_date",
            "arrival_date",

            "quantity",
            "unit_cost",
            "total_cost",

            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "supplier_name",
            "breed_name",
            "branch_name",
            "total_cost",
            "created_at",
            "updated_at",
        )

    def validate_branch(self, branch):

        if branch.tenant != self.context["request"].tenant:
            raise serializers.ValidationError(
                "Invalid branch."
            )

        return branch

    def validate_breed(self, breed):

        if breed and breed.tenant != self.context["request"].tenant:
            raise serializers.ValidationError(
                "Invalid breed."
            )

        return breed

    def validate(self, attrs):

        purchase_date = attrs.get("purchase_date")
        arrival_date = attrs.get("arrival_date")

        if arrival_date and arrival_date < purchase_date:
            raise serializers.ValidationError(
                {
                    "arrival_date":
                    "Arrival date cannot be before purchase date."
                }
            )

        return attrs

class SupplierSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    class Meta:
        model = Supplier

        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "name",
            "phone",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):

        tenant = self.context["request"].tenant

        queryset = Supplier.objects.filter(
            tenant=tenant,
            name=value,
            is_active=True,
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "Supplier already exists."
            )

        return value


class CustomerSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    class Meta:
        model = Customer

        fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "name",
            "phone",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):

        tenant = self.context["request"].tenant

        queryset = Customer.objects.filter(
            tenant=tenant,
            name=value,
            is_active=True,
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "Customer already exists."
            )

        return value


class FeedPurchaseSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )

    feed_type_name = serializers.CharField(
        source="feed_type.name",
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    total_weight = serializers.ReadOnlyField()

    total_cost = serializers.ReadOnlyField()


    class Meta:

        model = FeedPurchase

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "supplier",
            "supplier_name",

            "feed_type",
            "feed_type_name",

            "branch",
            "branch_name",

            "purchase_date",

            "quantity_bags",
            "weight_per_bag",

            "unit_cost",

            "total_weight",
            "total_cost",

            "notes",

            "is_active",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "supplier_name",
            "feed_type_name",
            "branch_name",
            "total_weight",
            "total_cost",
            "created_at",
            "updated_at",
        )

    def validate_supplier(self, supplier):

        if supplier and supplier.tenant != self.context["request"].tenant:
            raise serializers.ValidationError(
                "Invalid supplier."
            )

        return supplier

    def validate_branch(self, branch):

        if branch.tenant != self.context["request"].tenant:
            raise serializers.ValidationError(
                "Invalid branch."
            )

        return branch

    def validate_feed_type(self, feed_type):

        if feed_type.tenant != self.context["request"].tenant:
            raise serializers.ValidationError(
                "Invalid feed type."
            )

        return feed_type

    def validate_quantity_bags(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

    def validate_weight_per_bag(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Weight must be greater than zero."
            )

        return value

    def validate_unit_cost(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Unit cost cannot be negative."
            )

        return value