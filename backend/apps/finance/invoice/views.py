from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import (
    Case,
    Count,
    DecimalField,
    F,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.common.mixins import AuditUserMixin
from apps.core.tenant.permissions import HasTenantAccess
from apps.finance.payment.models import Payment

from .models import Invoice
from .serializers import InvoiceSerializer


class InvoicePagePagination(PageNumberPagination):
    page_size = 80
    page_size_query_param = "page_size"
    max_page_size = 80


class InvoiceViewSet(
    AuditUserMixin,
    viewsets.ModelViewSet,
):

    serializer_class = InvoiceSerializer
    pagination_class = InvoicePagePagination

    permission_classes = [
        IsAuthenticated,
        HasTenantAccess,
    ]

    lookup_field = "id"

    def _parse_date_filter(self, key):
        raw_value = self.request.query_params.get(key)
        if not raw_value:
            return None

        parsed_date = parse_date(raw_value)
        if parsed_date is None:
            raise ValueError(f"{key} must be a valid YYYY-MM-DD date.")
        return parsed_date

    def _money_value(self, value):
        if isinstance(value, Decimal):
            return str(value.quantize(Decimal("0.01")))
        return value

    def _validate_payment_status(self, payment_status):
        if not payment_status:
            return None

        valid = {"unpaid", "partially_paid", "paid", "overdue"}
        if payment_status not in valid:
            raise ValueError("Invalid payment_status value.")
        return payment_status

    def _validate_item_type(self, item_type):
        if not item_type:
            return None

        valid = {"eggs", "birds", "meat"}
        if item_type not in valid:
            raise ValueError("Invalid item_type value. Allowed values: eggs, birds, meat.")
        return item_type

    def get_filtered_queryset(self):
        queryset = (
            Invoice.objects
            .filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related("customer", "branch")
            .prefetch_related(
                "items",
                "items__harvest",
                "items__harvest__batch",
                "items__harvest__branch",
                "items__meat_inventory",
                "items__egg_inventory",
                "payments",
            )
            .order_by("-invoice_date", "-created_at")
        )

        try:
            date_from = self._parse_date_filter("date_from")
            date_to = self._parse_date_filter("date_to")
            payment_status = self._validate_payment_status(
                self.request.query_params.get("payment_status")
            )
            item_type = self._validate_item_type(
                self.request.query_params.get("item_type")
            )
        except ValueError as exc:
            raise ValueError(str(exc))

        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        customer_id = self.request.query_params.get("customer_id") or self.request.query_params.get("customer")
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        invoice_no = self.request.query_params.get("invoice_no")
        if invoice_no:
            queryset = queryset.filter(invoice_no__icontains=invoice_no)

        due_date = self.request.query_params.get("due_date")
        if due_date:
            queryset = queryset.filter(due_date=due_date)

        overdue = self.request.query_params.get("overdue")
        if overdue is not None:
            if overdue.lower() in {"true", "1", "yes"}:
                queryset = queryset.filter(payment_status="overdue")
            elif overdue.lower() in {"false", "0", "no"}:
                queryset = queryset.exclude(payment_status="overdue")

        if item_type == "eggs":
            queryset = queryset.filter(items__egg_inventory__isnull=False).distinct()
        elif item_type == "birds":
            queryset = queryset.filter(items__harvest__isnull=False).distinct()
        elif item_type == "meat":
            queryset = queryset.filter(items__meat_inventory__isnull=False).distinct()

        amount_min = self.request.query_params.get("amount_min")
        if amount_min:
            try:
                queryset = queryset.filter(total__gte=Decimal(amount_min))
            except Exception as exc:
                raise ValueError("amount_min must be a valid decimal number.") from exc

        amount_max = self.request.query_params.get("amount_max")
        if amount_max:
            try:
                queryset = queryset.filter(total__lte=Decimal(amount_max))
            except Exception as exc:
                raise ValueError("amount_max must be a valid decimal number.") from exc

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(invoice_no__icontains=search)
                | Q(notes__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(customer__phone__icontains=search)
            )

        return queryset

    def get_queryset(self):
        try:
            return self.get_filtered_queryset()
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

    def get_summary_queryset(self):
        queryset = self.get_filtered_queryset()
        payment_totals = (
            Payment.objects.filter(
                invoice_id=OuterRef("pk"),
                is_active=True,
            )
            .values("invoice_id")
            .annotate(total_paid=Sum("amount"))
            .values("total_paid")
        )

        return queryset.annotate(
            total_paid=Coalesce(
                Subquery(payment_totals, output_field=DecimalField(max_digits=12, decimal_places=2)),
                Value(Decimal("0.00")),
            ),
            balance_due=F("total") - F("total_paid"),
        )

    def get_summary_data(self):
        queryset = self.get_filtered_queryset()
        invoice_rows = list(
            queryset.values("id", "total", "payment_status")
        )

        invoice_ids = [row["id"] for row in invoice_rows]
        paid_by_invoice = {}
        if invoice_ids:
            paid_rows = (
                Payment.objects.filter(
                    invoice_id__in=invoice_ids,
                    is_active=True,
                )
                .values("invoice_id")
                .annotate(total_paid=Sum("amount"))
            )
            for row in paid_rows:
                paid_by_invoice[row["invoice_id"]] = row["total_paid"] or Decimal("0.00")

        invoice_count = len(invoice_rows)
        total_invoiced = sum(
            (Decimal(str(row["total"])) if row["total"] is not None else Decimal("0.00"))
            for row in invoice_rows
        )
        total_paid = sum(
            paid_by_invoice.get(row["id"], Decimal("0.00"))
            for row in invoice_rows
        )
        total_outstanding = total_invoiced - total_paid

        total_partially_paid = sum(
            (Decimal(str(row["total"])) if row["total"] is not None else Decimal("0.00"))
            for row in invoice_rows
            if row["payment_status"] == "partially_paid"
        )
        total_unpaid = sum(
            (Decimal(str(row["total"])) if row["total"] is not None else Decimal("0.00"))
            for row in invoice_rows
            if row["payment_status"] == "unpaid"
        )

        paid_invoice_count = sum(1 for row in invoice_rows if row["payment_status"] == "paid")
        partially_paid_invoice_count = sum(1 for row in invoice_rows if row["payment_status"] == "partially_paid")
        unpaid_invoice_count = sum(1 for row in invoice_rows if row["payment_status"] == "unpaid")

        normalized = {
            "invoice_count": invoice_count,
            "total_invoices": invoice_count,
            "total_invoiced": self._money_value(total_invoiced),
            "total_amount": self._money_value(total_invoiced),
            "total_paid": self._money_value(total_paid),
            "amount_paid": self._money_value(total_paid),
            "total_partially_paid": self._money_value(total_partially_paid),
            "total_unpaid": self._money_value(total_unpaid),
            "total_outstanding": self._money_value(total_outstanding),
            "amount_outstanding": self._money_value(total_outstanding),
            "total_balance": self._money_value(total_outstanding),
            "paid_invoice_count": paid_invoice_count,
            "paid_invoices": paid_invoice_count,
            "partially_paid_invoice_count": partially_paid_invoice_count,
            "partial_invoices": partially_paid_invoice_count,
            "unpaid_invoice_count": unpaid_invoice_count,
            "unpaid_invoices": unpaid_invoice_count,
        }

        return {"summary": normalized}

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["summary"] = self.get_summary_data()["summary"]
            return response

        serializer = self.get_serializer(queryset, many=True)
        response = Response(serializer.data)
        response.data["summary"] = self.get_summary_data()["summary"]
        return response

    @action(detail=False, methods=["get"], url_path="summary")
    def invoice_summary(self, request, *args, **kwargs):
        try:
            return Response(self.get_summary_data())
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        serializer = self.get_serializer(invoice)
        serializer.cancel(invoice, request=request)
        return Response(
            {"detail": "Invoice cancelled successfully."},
            status=status.HTTP_200_OK,
        )
