from rest_framework import serializers

from .models import Harvest


class HarvestSerializer(serializers.ModelSerializer):

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )


    class Meta:

        model = Harvest

        fields = [

            "id",

            "branch",
            "branch_name",

            "batch",
            "batch_number",

            "harvest_date",

            "birds_harvested",

            "average_weight",

            "total_weight",

            "harvest_reason",

            "notes",

            "is_active",

            "created_at",
            "updated_at",

        ]


        read_only_fields = [

            "id",

            "branch_name",
            "batch_number",

            "total_weight",

            "created_at",
            "updated_at",

        ]


    def validate(self, attrs):

        request = self.context["request"]

        tenant = request.tenant


        branch = attrs.get(
            "branch",
            self.instance.branch if self.instance else None
        )


        batch = attrs.get(
            "batch",
            self.instance.batch if self.instance else None
        )


        birds = attrs.get(
            "birds_harvested",
            self.instance.birds_harvested if self.instance else 0
        )


        # Prevent changing batch after harvest creation
        if self.instance:

            if (
                "batch" in attrs
                and batch.id != self.instance.batch_id
            ):

                raise serializers.ValidationError(
                    {
                        "batch":
                        "Batch cannot be changed after harvest creation."
                    }
                )


        # Tenant checks

        if branch.tenant_id != tenant.id:

            raise serializers.ValidationError(
                {
                    "branch":
                    "Invalid branch."
                }
            )


        if batch.tenant_id != tenant.id:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Invalid batch."
                }
            )


        # Branch-Batch relationship

        if batch.branch_id != branch.id:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Batch does not belong to this branch."
                }
            )


        # Available birds

        available = batch.current_quantity


        if self.instance:

            available += self.instance.birds_harvested


        if birds > available:

            raise serializers.ValidationError(
                {
                    "birds_harvested":
                    (
                        f"Only {available} birds available."
                    )
                }
            )


        return attrs