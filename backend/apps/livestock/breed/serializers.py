from rest_framework import serializers

from .models import Breed


class BreedSerializer(serializers.ModelSerializer):

    tenant_id = serializers.UUIDField(
        source="tenant.id",
        read_only=True,
    )

    tenant_name = serializers.CharField(
        source="tenant.name",
        read_only=True,
    )


    class Meta:

        model = Breed

        fields = (
            "id",

            "tenant_id",
            "tenant_name",

            "name",
            "bird_type",

            "market_age_days",
            "laying_start_days",
            "retirement_days",

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


    def validate(self, attrs):

        tenant = self.context["request"].tenant

        name = attrs.get(
            "name",
            getattr(self.instance, "name", None)
        )

        bird_type = attrs.get(
            "bird_type",
            getattr(self.instance, "bird_type", None)
        )


        # Prevent duplicate breed names per tenant

        queryset = Breed.objects.filter(
            tenant=tenant,
            name=name,
            bird_type=bird_type,
            is_active=True,
        )


        if self.instance:

            queryset = queryset.exclude(
                pk=self.instance.pk
            )


        if queryset.exists():

            raise serializers.ValidationError(
                {
                    "name":
                    "A breed with this name already exists."
                }
            )


        # Layer validation

        if bird_type == "layer":

            if not attrs.get(
                "laying_start_days",
                getattr(
                    self.instance,
                    "laying_start_days",
                    None
                )
            ):

                raise serializers.ValidationError(
                    {
                        "laying_start_days":
                        "Layer breeds require laying start days."
                    }
                )


        return attrs