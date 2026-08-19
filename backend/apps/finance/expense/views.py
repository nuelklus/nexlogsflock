from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.authtntuser.permissions.drf_permissions import HasModulePermission
from apps.core.tenant.permissions import HasTenantAccess
from .models import Expense, ExpenseCategory
from .serializers import ExpenseCategorySerializer, ExpenseSerializer


class ExpenseCategoryViewSet(ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    module = "finance"
    permission_classes = (IsAuthenticated, HasTenantAccess, HasModulePermission)
    lookup_field = "id"

    def get_permissions(self):
        self.permission_action = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "update",
            "partial_update": "update",
            "destroy": "delete",
        }.get(self.action, "view")
        return super().get_permissions()

    def get_queryset(self):
        return ExpenseCategory.objects.filter(is_active=True).order_by("name")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)


class ExpenseViewSet(ModelViewSet):
    serializer_class = ExpenseSerializer
    module = "finance"
    permission_classes = (IsAuthenticated, HasTenantAccess, HasModulePermission)
    lookup_field = "id"

    def get_permissions(self):
        self.permission_action = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "update",
            "partial_update": "update",
            "destroy": "delete",
        }.get(self.action, "view")
        return super().get_permissions()

    def get_queryset(self):
        qs = (
            Expense.objects.filter(
                tenant=self.request.tenant,
                is_active=True,
            )
            .select_related(
                "category",
                "branch",
                "house",
                "batch",
                "payment",
                "created_by",
            )
            .order_by("-expense_date", "-created_at")
        )

        category_id = self.request.query_params.get("category_id") or self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        house_id = self.request.query_params.get("house_id") or self.request.query_params.get("house")
        if house_id:
            qs = qs.filter(house_id=house_id)

        batch_id = self.request.query_params.get("batch_id") or self.request.query_params.get("batch")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        payment_method = self.request.query_params.get("payment_method")
        if payment_method:
            qs = qs.filter(payment_method=payment_method)

        created_by = self.request.query_params.get("created_by")
        if created_by:
            qs = qs.filter(created_by_id=created_by)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)

        amount = self.request.query_params.get("amount")
        if amount:
            try:
                qs = qs.filter(amount__gte=Decimal(amount))
            except Exception:
                qs = qs.filter(amount=amount)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(description__icontains=search)

        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user, updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"detail": "Expense deleted successfully."}, status=status.HTTP_200_OK)
