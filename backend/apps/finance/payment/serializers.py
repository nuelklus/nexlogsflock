from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers

from .models import Payment, PAYMENT_METHOD_CHOICES
from apps.finance.invoice.models import Invoice


class PaymentSerializer(serializers.ModelSerializer):

    invoice_no = serializers.CharField(
        source="invoice.invoice_no",
        read_only=True,
    )
    customer_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    invoice_total = serializers.DecimalField(
        source="invoice.total",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    balance_before = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "invoice_no",
            "invoice_total",
            "customer_name",
            "amount",
            "method",
            "date",
            "reference",
            "notes",
            "balance_before",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_no",
            "invoice_total",
            "customer_name",
            "balance_before",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        customer = getattr(obj.invoice, "customer", None)
        return customer.name if customer else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return (
                obj.created_by.get_full_name()
                or obj.created_by.email
            )
        return None

    def get_balance_before(self, obj):
        """Balance on the invoice before this payment was made."""
        paid_before = (
            Payment.objects
            .filter(
                invoice=obj.invoice,
                is_active=True,
            )
            .exclude(pk=obj.pk)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        balance = obj.invoice.total - paid_before
        return float(max(balance, Decimal("0.00")))

    def validate(self, attrs):
        request = self.context["request"]
        invoice: Invoice = attrs.get("invoice") or (
            self.instance.invoice if self.instance else None
        )

        if invoice is None:
            raise serializers.ValidationError(
                {"invoice": "Invoice is required."}
            )

        # Tenant isolation
        if invoice.tenant_id != request.tenant.id:
            raise serializers.ValidationError(
                {"invoice": "Invoice does not belong to this tenant."}
            )

        if not invoice.is_active:
            raise serializers.ValidationError(
                {"invoice": "Cannot record payment against an inactive invoice."}
            )

        amount = attrs.get("amount")
        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError(
                {"amount": "Payment amount must be greater than zero."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        invoice = validated_data["invoice"]

        # Lock invoice row to prevent race conditions
        invoice = (
            Invoice.objects
            .select_for_update()
            .get(pk=invoice.pk)
        )

        # Check remaining balance
        paid_so_far = (
            invoice.payments
            .filter(is_active=True)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        remaining = invoice.total - paid_so_far
        amount = validated_data["amount"]

        if amount > remaining:
            raise serializers.ValidationError(
                {
                    "amount": (
                        f"Payment ({amount}) exceeds remaining "
                        f"balance ({remaining})."
                    )
                }
            )

        payment = Payment.objects.create(
            tenant=request.tenant,
            created_by=request.user,
            updated_by=request.user,
            invoice=invoice,
            **{
                k: v for k, v in validated_data.items()
                if k != "invoice"
            },
        )

        # Update invoice payment status
        invoice.update_payment_status()

        return payment
