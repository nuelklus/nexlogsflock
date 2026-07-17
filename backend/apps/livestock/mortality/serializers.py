from rest_framework import serializers

from .models import Mortality


class MortalitySerializer(serializers.ModelSerializer):

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    house_name = serializers.CharField(
        source="house.name",
        read_only=True,
    )

    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )

    disease_name = serializers.CharField(
        source="disease.name",
        read_only=True,
    )

    outbreak_disease = serializers.CharField(
        source="disease_outbreak.disease.name",
        read_only=True,
    )


    class Meta:

        model = Mortality

        fields = (

            "id",

            "branch",
            "branch_name",

            "house",
            "house_name",

            "batch",
            "batch_number",

            "disease",
            "disease_name",

            "disease_outbreak",
            "outbreak_disease",

            "date",

            "quantity",

            "cause",

            "notes",

            "is_active",

            "created_at",
            "updated_at",

        )


        read_only_fields = (

            "id",

            "branch_name",
            "house_name",
            "batch_number",

            "disease_name",
            "outbreak_disease",

            "created_at",
            "updated_at",

        )


    def validate(self, attrs):

        request = self.context.get("request")

        tenant = getattr(
            request,
            "tenant",
            None
        )


        batch = attrs.get(
            "batch",
            getattr(
                self.instance,
                "batch",
                None
            )
        )


        branch = attrs.get(
            "branch",
            getattr(
                self.instance,
                "branch",
                None
            )
        )


        house = attrs.get(
            "house",
            getattr(
                self.instance,
                "house",
                None
            )
        )


        disease = attrs.get(
            "disease",
            getattr(
                self.instance,
                "disease",
                None
            )
        )


        outbreak = attrs.get(
            "disease_outbreak",
            getattr(
                self.instance,
                "disease_outbreak",
                None
            )
        )


        quantity = attrs.get(
            "quantity",
            getattr(
                self.instance,
                "quantity",
                0
            )
        )


        # Required relationship checks

        if not batch:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Batch is required."
                }
            )


        if not branch:

            raise serializers.ValidationError(
                {
                    "branch":
                    "Branch is required."
                }
            )


        if not house:

            raise serializers.ValidationError(
                {
                    "house":
                    "House is required."
                }
            )


        # Tenant security checks

        if tenant:

            if branch.tenant_id != tenant.id:

                raise serializers.ValidationError(
                    {
                        "branch":
                        "Invalid branch."
                    }
                )


            if house.tenant_id != tenant.id:

                raise serializers.ValidationError(
                    {
                        "house":
                        "Invalid house."
                    }
                )


            if batch.tenant_id != tenant.id:

                raise serializers.ValidationError(
                    {
                        "batch":
                        "Invalid batch."
                    }
                )


            if disease and disease.tenant_id != tenant.id:

                raise serializers.ValidationError(
                    {
                        "disease":
                        "Invalid disease."
                    }
                )


            if outbreak and outbreak.tenant_id != tenant.id:

                raise serializers.ValidationError(
                    {
                        "disease_outbreak":
                        "Invalid outbreak."
                    }
                )


        # Relationship validation

        if house.branch_id != branch.id:

            raise serializers.ValidationError(
                {
                    "house":
                    "House does not belong to this branch."
                }
            )


        if batch.house_id != house.id:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Batch does not belong to this house."
                }
            )


        # Mortality quantity validation

        if self.instance:

            available_quantity = (
                batch.current_quantity
                +
                self.instance.quantity
            )

        else:

            available_quantity = batch.current_quantity


        if quantity > available_quantity:

            raise serializers.ValidationError(
                {
                    "quantity":
                    (
                        f"Cannot record {quantity} deaths. "
                        f"Only {available_quantity} birds are available."
                    )
                }
            )


        if quantity <= 0:

            raise serializers.ValidationError(
                {
                    "quantity":
                    "Mortality quantity must be greater than zero."
                }
            )


        # Disease outbreak validation

        if outbreak:

            if outbreak.batch_id != batch.id:

                raise serializers.ValidationError(
                    {
                        "disease_outbreak":
                        "Outbreak does not belong to this batch."
                    }
                )


            if disease and outbreak.disease_id != disease.id:

                raise serializers.ValidationError(
                    {
                        "disease":
                        "Disease does not match outbreak disease."
                    }
                )


        return attrs