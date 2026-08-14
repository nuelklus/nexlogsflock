from rest_framework import serializers

from .models import BirdBatch


class BirdBatchSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    house_name = serializers.CharField(
        source="house.name",
        read_only=True,
    )

    breed_name = serializers.CharField(
        source="breed.name",
        read_only=True,
    )

    age_days = serializers.ReadOnlyField()

    class Meta:
        model = BirdBatch

        fields = (
            "id",

            # Tenant
            "tenant_id",
            "tenant_name",

            # Organization
            "branch",
            "branch_name",

            # House
            "house",
            "house_name",

            # Purchase
            "purchase",

            # Breed
            "breed",
            "breed_name",

            # Batch
            "batch_number",
            "bird_type",

            # Dates
            "arrival_date",

            # Quantities
            "initial_quantity",
            "current_quantity",

            # Status
            "status",

            # Calculated
            "age_days",

            # Audit
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "tenant_id",
            "tenant_name",
            "branch_name",
            "house_name",
            "breed_name",
            "age_days",
            "created_at",
            "updated_at",
        )

        extra_kwargs = {
            "branch": {
                "required": True,
            },
            "house": {
                "required": True,
                "allow_null": False,
            },
            "batch_number": {
                "required": True,
                "allow_blank": False,
            },
            "bird_type": {
                "required": True,
            },
            "arrival_date": {
                "required": True,
            },
            "initial_quantity": {
                "required": True,
            },
        }

    # ---------------------------------------------------------
    # BRANCH VALIDATION
    # ---------------------------------------------------------

    def validate_branch(self, branch):

        tenant = self.context["request"].tenant

        if not tenant:
            raise serializers.ValidationError(
                "Tenant could not be determined."
            )

        if branch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Invalid branch."
            )

        return branch

    # ---------------------------------------------------------
    # HOUSE VALIDATION
    # ---------------------------------------------------------

    def validate_house(self, house):

        tenant = self.context["request"].tenant

        if house is None:
            raise serializers.ValidationError(
                "House is required when creating a batch."
            )

        if house.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Selected house does not belong to this organization."
            )

        return house

    # ---------------------------------------------------------
    # INITIAL QUANTITY VALIDATION
    # ---------------------------------------------------------

    def validate_initial_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Initial quantity must be greater than zero."
            )

        return value

    # ---------------------------------------------------------
    # OBJECT VALIDATION
    # ---------------------------------------------------------

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        if not tenant:
            raise serializers.ValidationError(
                "Tenant could not be determined."
            )

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )

        house = attrs.get(
            "house",
            getattr(self.instance, "house", None),
        )

        initial_quantity = attrs.get(
            "initial_quantity",
            getattr(
                self.instance,
                "initial_quantity",
                None,
            ),
        )

        current_quantity = attrs.get(
            "current_quantity",
            getattr(
                self.instance,
                "current_quantity",
                0,
            ),
        )

        batch_number = attrs.get(
            "batch_number",
            getattr(
                self.instance,
                "batch_number",
                None,
            ),
        )

        # -----------------------------------------------------
        # HOUSE IS REQUIRED
        # -----------------------------------------------------

        if house is None:
            raise serializers.ValidationError(
                {
                    "house": (
                        "House is required when creating "
                        "a bird batch."
                    )
                }
            )

        # -----------------------------------------------------
        # BRANCH MUST BELONG TO TENANT
        # -----------------------------------------------------

        if branch is None:
            raise serializers.ValidationError(
                {
                    "branch": "Branch is required."
                }
            )

        if branch.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "branch": "Invalid branch."
                }
            )

        # -----------------------------------------------------
        # HOUSE MUST BELONG TO TENANT
        # -----------------------------------------------------

        if house.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "house": (
                        "Selected house does not belong "
                        "to this organization."
                    )
                }
            )

        # -----------------------------------------------------
        # HOUSE MUST BELONG TO SELECTED BRANCH
        # -----------------------------------------------------

        if house.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "house": (
                        "Selected house does not belong "
                        "to the selected branch."
                    )
                }
            )

        # -----------------------------------------------------
        # INITIAL QUANTITY
        # -----------------------------------------------------

        if initial_quantity is None:
            raise serializers.ValidationError(
                {
                    "initial_quantity": (
                        "Initial quantity is required."
                    )
                }
            )

        if initial_quantity <= 0:
            raise serializers.ValidationError(
                {
                    "initial_quantity": (
                        "Initial quantity must be "
                        "greater than zero."
                    )
                }
            )

        # -----------------------------------------------------
        # CURRENT QUANTITY
        # -----------------------------------------------------

        if current_quantity < 0:
            raise serializers.ValidationError(
                {
                    "current_quantity": (
                        "Current quantity cannot be negative."
                    )
                }
            )

        if current_quantity > initial_quantity:
            raise serializers.ValidationError(
                {
                    "current_quantity": (
                        "Current quantity cannot exceed "
                        "initial quantity."
                    )
                }
            )

        # -----------------------------------------------------
        # BATCH NUMBER
        #
        # Same batch number is allowed:
        #
        # Tenant A / Branch A / House A / B001
        # Tenant A / Branch A / House B / B001  <-- allowed
        # Tenant A / Branch B / House C / B001  <-- allowed
        # Tenant B / Branch A / House A / B001  <-- allowed
        #
        # Duplicate in the SAME house is not allowed.
        # -----------------------------------------------------

        if batch_number:

            queryset = BirdBatch.objects.filter(
                tenant=tenant,
                branch=branch,
                house=house,
                batch_number=batch_number,
                is_active=True,
            )

            if self.instance:
                queryset = queryset.exclude(
                    pk=self.instance.pk
                )

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "batch_number": (
                            "A batch with this number "
                            "already exists in this house."
                        )
                    }
                )

        return attrs