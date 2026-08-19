from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.authtntuser.models import Role
from apps.core.tenant.models import Tenant, TenantUser
from apps.finance.invoice.models import Invoice
from apps.finance.payment.models import Payment
from apps.livestock.purchase.models import Customer
from apps.organization.branch.models import Branch

User = get_user_model()


class InvoiceListApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="owner@example.com",
            password="Password@123",
            is_active=True,
            first_name="Farm",
            last_name="Owner",
        )

        self.tenant = Tenant.objects.create(
            name="Tenant Alpha",
            slug="tenant-alpha",
        )
        self.other_tenant = Tenant.objects.create(
            name="Tenant Beta",
            slug="tenant-beta",
        )

        self.role = Role.objects.create(
            tenant=self.tenant,
            name="Owner",
            description="Owner role",
            is_system_role=True,
        )

        TenantUser.objects.create(
            user=self.user,
            tenant=self.tenant,
            role=self.role,
            is_active=True,
        )

        other_role = Role.objects.create(
            tenant=self.other_tenant,
            name="Owner",
            description="Other tenant role",
            is_system_role=True,
        )
        TenantUser.objects.create(
            user=self.user,
            tenant=self.other_tenant,
            role=other_role,
            is_active=True,
        )

        self.client.force_authenticate(user=self.user)
        self.headers = {"HTTP_X_TENANT_ID": str(self.tenant.id)}

        self.branch = Branch.objects.create(
            tenant=self.tenant,
            name="Main Branch",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_branch = Branch.objects.create(
            tenant=self.tenant,
            name="North Branch",
            created_by=self.user,
            updated_by=self.user,
        )

        self.customer = Customer.objects.create(
            tenant=self.tenant,
            name="Test Customer",
            phone="0240000000",
            created_by=self.user,
            updated_by=self.user,
        )

        self.customer_other = Customer.objects.create(
            tenant=self.tenant,
            name="Second Customer",
            phone="0241111111",
            created_by=self.user,
            updated_by=self.user,
        )

        for index in range(110):
            invoice_date = "2026-08-01"
            if index % 4 == 0:
                invoice_date = "2026-08-15"
            elif index % 5 == 0:
                invoice_date = "2026-09-01"

            status = "unpaid"
            if index % 3 == 0:
                status = "paid"
            elif index % 3 == 1:
                status = "partially_paid"

            branch = self.branch if index % 2 == 0 else self.other_branch
            customer = self.customer if index % 2 == 0 else self.customer_other
            invoice = Invoice.objects.create(
                tenant=self.tenant,
                customer=customer,
                branch=branch,
                invoice_date=invoice_date,
                due_date="2026-08-20",
                total=Decimal("100.00") + Decimal(index),
                payment_status=status,
                created_by=self.user,
                updated_by=self.user,
            )

            if status == "paid":
                Payment.objects.create(
                    tenant=self.tenant,
                    invoice=invoice,
                    amount=invoice.total,
                    method="cash",
                    payment_purpose="invoice_payment",
                    date=invoice.invoice_date,
                    reference=f"REF-{index}",
                    created_by=self.user,
                    updated_by=self.user,
                )
            elif status == "partially_paid":
                Payment.objects.create(
                    tenant=self.tenant,
                    invoice=invoice,
                    amount=Decimal("50.00"),
                    method="cash",
                    payment_purpose="invoice_payment",
                    date=invoice.invoice_date,
                    reference=f"REF-P-{index}",
                    created_by=self.user,
                    updated_by=self.user,
                )

        self.other_tenant_customer = Customer.objects.create(
            tenant=self.other_tenant,
            name="Other Tenant Customer",
            phone="0249999999",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_branch = Branch.objects.create(
            tenant=self.other_tenant,
            name="Other branch",
            created_by=self.user,
            updated_by=self.user,
        )
        Invoice.objects.create(
            tenant=self.other_tenant,
            customer=self.other_tenant_customer,
            branch=self.other_branch,
            invoice_date="2026-08-10",
            due_date="2026-08-20",
            total=Decimal("500.00"),
            payment_status="paid",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_invoice_list_caps_at_eighty_and_is_paginated(self):
        response = self.client.get("/api/invoice/", **self.headers)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 80)
        self.assertEqual(response.data["count"], 110)

    def test_invoice_summary_aggregates_all_matching_records(self):
        response = self.client.get(
            "/api/invoice/?date_from=2026-08-01&date_to=2026-08-31",
            **self.headers,
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["results"]), 80)
        self.assertGreater(response.data["count"], 80)

        summary_response = self.client.get(
            "/api/invoice/summary/?date_from=2026-08-01&date_to=2026-08-31",
            **self.headers,
        )

        self.assertEqual(summary_response.status_code, 200, summary_response.data)
        self.assertGreater(summary_response.data["summary"]["total_invoices"], 80)

    def test_invoice_status_and_branch_filters_are_applied(self):
        response = self.client.get(
            "/api/invoice/?branch_id=%s&payment_status=paid" % self.branch.id,
            **self.headers,
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(
            all(str(item["branch"]) == str(self.branch.id) for item in response.data["results"])
        )
        self.assertTrue(all(item["payment_status"] == "paid" for item in response.data["results"]))

    def test_invoice_summary_is_tenant_scoped(self):
        response = self.client.get("/api/invoice/summary/", **self.headers)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["summary"]["total_invoices"], 110)

        other_response = self.client.get(
            "/api/invoice/summary/",
            **{"HTTP_X_TENANT_ID": str(self.other_tenant.id)},
        )

        self.assertEqual(other_response.status_code, 200, other_response.data)
        self.assertEqual(other_response.data["summary"]["total_invoices"], 1)

    def test_cancelled_paid_invoice_returns_clear_user_message(self):
        invoice = Invoice.objects.filter(
            tenant=self.tenant,
            payment_status="paid",
        ).first()

        self.assertIsNotNone(invoice)

        response = self.client.delete(
            f"/api/invoice/{invoice.id}/",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already has payments recorded", str(response.data["detail"]))
