from rest_framework import serializers
from apps.livestock.breed.models import Breed
from apps.organization.branch.models import Branch
from .models import ChickPurchase, Supplier, Customer, FeedPurchase
from apps.livestock.purchase.models import Supplier


def get_user_display_name(user):
    if not user:
        return None

    full_name = (
        f"{user.first_name} {user.last_name}"
    ).strip()

    return full_name or user.email

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

    # Batch information
    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )

    batch_house_name = serializers.CharField(
        source="batch.house.name",
        read_only=True,
    )

    batch_branch_name = serializers.CharField(
        source="batch.branch.name",
        read_only=True,
    )

    total_cost = serializers.ReadOnlyField()

    class Meta:

        model = ChickPurchase

        fields = (
            "id",

            # Tenant
            "tenant_id",
            "tenant_name",

            # Supplier
            "supplier",
            "supplier_name",

            # Batch
            "batch",
            "batch_number",
            "batch_house_name",
            "batch_branch_name",

            # Breed
            "breed",
            "breed_name",

            # Branch
            "branch",
            "branch_name",

            # Dates
            "purchase_date",
            "arrival_date",

            # Purchase
            "quantity",
            "unit_cost",
            "total_cost",

            # Audit
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "supplier_name",

            "batch_number",
            "batch_house_name",
            "batch_branch_name",

            "breed_name",
            "branch_name",

            "total_cost",

            "created_at",
            "updated_at",
        )

    # ---------------------------------------------------------
    # BRANCH
    # ---------------------------------------------------------

    def validate_branch(self, branch):

        tenant = self.context["request"].tenant

        if branch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Invalid branch."
            )

        return branch

    # ---------------------------------------------------------
    # BREED
    # ---------------------------------------------------------

    def validate_breed(self, breed):

        if breed is None:
            return breed

        tenant = self.context["request"].tenant

        if breed.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Invalid breed."
            )

        return breed

    # ---------------------------------------------------------
    # BATCH
    # ---------------------------------------------------------

    def validate_batch(self, batch):

        tenant = self.context["request"].tenant

        if batch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Invalid batch."
            )

        if batch.house_id is None:
            raise serializers.ValidationError(
                "The selected batch must belong to a house."
            )

        if batch.status != "active":
            raise serializers.ValidationError(
                "Chicks can only be purchased into an active batch."
            )

        return batch

    # ---------------------------------------------------------
    # QUANTITY
    # ---------------------------------------------------------

    def validate_quantity(self, quantity):

        if quantity <= 0:
            raise serializers.ValidationError(
                "Purchase quantity must be greater than zero."
            )

        return quantity

    # ---------------------------------------------------------
    # OBJECT VALIDATION
    # ---------------------------------------------------------

    def validate(self, attrs):

        batch = attrs.get(
            "batch",
            getattr(self.instance, "batch", None),
        )

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )

        breed = attrs.get(
            "breed",
            getattr(self.instance, "breed", None),
        )

        purchase_date = attrs.get(
            "purchase_date",
            getattr(self.instance, "purchase_date", None),
        )

        arrival_date = attrs.get(
            "arrival_date",
            getattr(self.instance, "arrival_date", None),
        )

        quantity = attrs.get(
            "quantity",
            getattr(self.instance, "quantity", 0),
        )

        # -----------------------------------------------------
        # BATCH REQUIRED
        # -----------------------------------------------------

        if batch is None:
            raise serializers.ValidationError(
                {
                    "batch": (
                        "A bird batch must be selected "
                        "for every chick purchase."
                    )
                }
            )

        # -----------------------------------------------------
        # BATCH / BRANCH MUST MATCH
        # -----------------------------------------------------

        if branch and batch.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "branch": (
                        "The selected branch does not match "
                        "the batch branch."
                    )
                }
            )

        # -----------------------------------------------------
        # BATCH / BREED MUST MATCH
        # -----------------------------------------------------

        if breed and batch.breed_id and breed.id != batch.breed_id:
            raise serializers.ValidationError(
                {
                    "breed": (
                        "The selected breed does not match "
                        "the batch breed."
                    )
                }
            )

        # -----------------------------------------------------
        # PURCHASE DATE
        # -----------------------------------------------------

        if (
            arrival_date
            and purchase_date
            and arrival_date < purchase_date
        ):
            raise serializers.ValidationError(
                {
                    "arrival_date": (
                        "Arrival date cannot be before "
                        "purchase date."
                    )
                }
            )

        # -----------------------------------------------------
        # BATCH CAPACITY
        #
        # initial_quantity = batch capacity
        # current_quantity = birds currently in batch
        # -----------------------------------------------------

        if self.instance is None:

            projected_quantity = (
                batch.current_quantity + quantity
            )

            if projected_quantity > batch.initial_quantity:
                available = (
                    batch.initial_quantity
                    - batch.current_quantity
                )

                raise serializers.ValidationError(
                    {
                        "quantity": (
                            f"This purchase exceeds the batch "
                            f"capacity. Only {available} birds "
                            f"can still be added to this batch."
                        )
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

    quantity = serializers.ReadOnlyField(
        source="total_weight",
    )

    unit = serializers.SerializerMethodField()

    created_by_name = serializers.SerializerMethodField()

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

            "quantity",
            "unit",

            "quantity_bags",
            "weight_per_bag",

            "unit_cost",

            "total_weight",
            "total_cost",

            "notes",

            "created_by",
            "created_by_name",

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
            "quantity",
            "unit",
            "total_weight",
            "total_cost",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        )

    def get_created_by_name(self, obj):
        return get_user_display_name(
            obj.created_by
        )

    def get_unit(self, obj):
        return "kg"

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