from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.finance.payment.models import PAYMENT_METHOD_CHOICES, Payment
from apps.finance.expense.models import Expense, ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, allow_null=True)
    house_name = serializers.CharField(source="house.name", read_only=True, allow_null=True)
    batch_name = serializers.CharField(source="batch.batch_number", read_only=True, allow_null=True)
    payment_reference = serializers.CharField(source="payment.reference", read_only=True, allow_null=True)
    payment_method_label = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "category_name",
            "branch",
            "branch_name",
            "house",
            "house_name",
            "batch",
            "batch_name",
            "description",
            "amount",
            "expense_date",
            "vendor_name",
            "payment_method",
            "payment_method_label",
            "reference",
            "notes",
            "payment",
            "payment_reference",
            "created_by",
            "created_by_name",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "category_name",
            "branch_name",
            "house_name",
            "batch_name",
            "payment_method_label",
            "payment_reference",
            "created_by_name",
            "created_by_email",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_payment_method_label(self, obj):
        return dict(PAYMENT_METHOD_CHOICES).get(obj.payment_method, obj.payment_method)

    def get_created_by_name(self, obj):
        if obj.created_by is None:
            return None
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def validate(self, attrs):
        amount = attrs.get("amount")
        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError({"amount": "Expense amount must be greater than zero."})

        house = attrs.get("house")
        batch = attrs.get("batch")
        branch = attrs.get("branch")

        if house and branch and house.branch_id != branch.id:
            raise serializers.ValidationError({"house": "Selected house does not belong to the selected branch."})

        if batch:
            if not house:
                raise serializers.ValidationError({"batch": "A house is required when selecting a bird batch."})
            if batch.house_id != house.id:
                raise serializers.ValidationError({"batch": "Selected batch does not belong to the selected house."})
            if branch and batch.branch_id != branch.id:
                raise serializers.ValidationError({"batch": "Selected batch does not belong to the selected branch."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        payment = validated_data.pop("payment", None)
        expense = Expense.objects.create(
            **validated_data,
        )
        if payment and payment.pk:
            expense.payment = payment
            expense.save(update_fields=["payment", "updated_at"])
        return expense
