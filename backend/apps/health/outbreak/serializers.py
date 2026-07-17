from rest_framework import serializers

from .models import DiseaseOutbreak


class DiseaseOutbreakSerializer(serializers.ModelSerializer):

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


    class Meta:

        model = DiseaseOutbreak

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

            "outbreak_date",

            "birds_affected",

            "severity",

            "status",

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

            "created_at",

            "updated_at",

        )


    def validate(self, attrs):

        request = self.context.get("request")

        if not request:
            return attrs


        tenant = request.tenant


        branch = attrs.get("branch")

        house = attrs.get("house")

        batch = attrs.get("batch")

        disease = attrs.get("disease")


        if branch and branch.tenant != tenant:

            raise serializers.ValidationError(
                {
                    "branch":
                    "Invalid branch for this tenant."
                }
            )


        if house and house.tenant != tenant:

            raise serializers.ValidationError(
                {
                    "house":
                    "Invalid house for this tenant."
                }
            )


        if batch and batch.tenant != tenant:

            raise serializers.ValidationError(
                {
                    "batch":
                    "Invalid batch for this tenant."
                }
            )


        if disease and disease.tenant != tenant:

            raise serializers.ValidationError(
                {
                    "disease":
                    "Invalid disease for this tenant."
                }
            )


        if house and branch:

            if house.branch != branch:

                raise serializers.ValidationError(
                    {
                        "house":
                        "House does not belong to this branch."
                    }
                )


        if batch and house:

            if batch.house != house:

                raise serializers.ValidationError(
                    {
                        "batch":
                        "Batch does not belong to this house."
                    }
                )


        return attrs