from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers

from .models import Payment, PAYMENT_METHOD_CHOICES, PaymentPurpose
from apps.finance.invoice.models import Invoice


class PaymentSerializer(serializers.ModelSerializer):

    invoice_no = serializers.CharField(
        source="invoice.invoice_no",
        read_only=True,
        allow_null=True,
    )
    customer_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    invoice_total = serializers.DecimalField(
        source="invoice.total",
        max_digits=12,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    balance_before = serializers.SerializerMethodField()
    payment_purpose_display = serializers.SerializerMethodField()

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
            "payment_purpose",
            "payment_purpose_display",
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
            "payment_purpose_display",
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

    def get_payment_purpose_display(self, obj):
        return dict(PaymentPurpose.choices).get(obj.payment_purpose, obj.payment_purpose)

    def get_balance_before(self, obj):
        if obj.invoice is None:
            return 0.0
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
        invoice: Invoice | None = attrs.get("invoice") or (
            self.instance.invoice if self.instance else None
        )
        purpose = attrs.get("payment_purpose", getattr(self.instance, "payment_purpose", PaymentPurpose.INVOICE_PAYMENT))

        if purpose == PaymentPurpose.INVOICE_PAYMENT and invoice is None:
            raise serializers.ValidationError({"invoice": "Invoice is required for invoice payments."})

        if invoice is not None:
            if invoice.tenant_id != request.tenant.id:
                raise serializers.ValidationError({"invoice": "Invoice does not belong to this tenant."})
            if not invoice.is_active:
                raise serializers.ValidationError({"invoice": "Cannot record payment against an inactive invoice."})

        amount = attrs.get("amount")
        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        invoice = validated_data.get("invoice")
        purpose = validated_data.get("payment_purpose", PaymentPurpose.INVOICE_PAYMENT)

        if purpose == PaymentPurpose.INVOICE_PAYMENT:
            if invoice is None:
                raise serializers.ValidationError({"invoice": "Invoice is required for invoice payments."})
            invoice = (
                Invoice.objects
                .select_for_update()
                .get(pk=invoice.pk)
            )

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

        if invoice is not None and payment.payment_purpose == PaymentPurpose.INVOICE_PAYMENT:
            invoice.update_payment_status()

        return payment
