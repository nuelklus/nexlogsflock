from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.authtntuser.models import Role
from apps.core.tenant.models import Tenant, TenantUser
from apps.feed.consumption.models import (
    FeedInventory,
    FeedStockMovement,
)
from apps.feed.feed_type.models import FeedType
from apps.livestock.batch.models import BirdBatch
from apps.livestock.purchase.models import Supplier
from apps.organization.branch.models import Branch
from apps.organization.house.models import House


User = get_user_model()


class FeedWorkflowApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="owner@example.com",
            password="StrongPass123!",
            is_active=True,
            first_name="Farm",
            last_name="Owner",
        )

        self.tenant = Tenant.objects.create(
            name="Tenant One",
            slug="tenant-one",
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

        self.client.force_authenticate(
            user=self.user
        )

        self.headers = {
            "HTTP_X_TENANT_ID": str(self.tenant.id),
        }

        self.branch = Branch.objects.create(
            tenant=self.tenant,
            name="Main Farm",
            created_by=self.user,
            updated_by=self.user,
        )

        self.house = House.objects.create(
            tenant=self.tenant,
            branch=self.branch,
            name="House 1",
            house_type="deep_litter",
            capacity=5000,
            created_by=self.user,
            updated_by=self.user,
        )

        self.feed_type = FeedType.objects.create(
            tenant=self.tenant,
            name="Layer Grower",
            bird_type="layer",
            created_by=self.user,
            updated_by=self.user,
        )

        self.supplier = Supplier.objects.create(
            tenant=self.tenant,
            name="Best Feed Mill",
            created_by=self.user,
            updated_by=self.user,
        )

        self.batch = BirdBatch.objects.create(
            tenant=self.tenant,
            branch=self.branch,
            house=self.house,
            batch_number="L001",
            bird_type="layer",
            arrival_date="2026-08-01",
            initial_quantity=1000,
            current_quantity=1000,
            created_by=self.user,
            updated_by=self.user,
        )

    def test_feed_purchase_create_builds_inventory_and_movement(self):
        response = self.client.post(
            "/api/feed-purchases/",
            {
                "supplier": str(self.supplier.id),
                "branch": str(self.branch.id),
                "feed_type": str(self.feed_type.id),
                "purchase_date": "2026-08-10",
                "quantity_bags": 100,
                "weight_per_bag": "50.00",
                "unit_cost": "120.00",
                "notes": "Initial stock",
            },
            format="json",
            **self.headers,
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        inventory = FeedInventory.objects.get(
            tenant=self.tenant,
            branch=self.branch,
            feed_type=self.feed_type,
            is_active=True,
        )

        self.assertEqual(
            inventory.quantity,
            Decimal("5000.00"),
        )
        self.assertEqual(
            inventory.available_quantity,
            Decimal("5000.00"),
        )

        movement = FeedStockMovement.objects.get(
            reference_id=response.data["id"]
        )
        self.assertEqual(
            movement.movement_type,
            "purchase",
        )
        self.assertEqual(
            movement.quantity,
            Decimal("5000.00"),
        )
        self.assertEqual(
            response.data["quantity"],
            5000.0,
        )
        self.assertEqual(
            response.data["unit"],
            "kg",
        )

    def test_feed_consumption_create_updates_inventory(self):
        purchase_response = self.client.post(
            "/api/feed-purchases/",
            {
                "supplier": str(self.supplier.id),
                "branch": str(self.branch.id),
                "feed_type": str(self.feed_type.id),
                "purchase_date": "2026-08-10",
                "quantity_bags": 20,
                "weight_per_bag": "50.00",
                "unit_cost": "100.00",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(
            purchase_response.status_code,
            201,
            purchase_response.data,
        )

        response = self.client.post(
            "/api/feed-consumption/",
            {
                "branch": str(self.branch.id),
                "house": str(self.house.id),
                "batch": str(self.batch.id),
                "feed_type": str(self.feed_type.id),
                "consumption_date": "2026-08-11",
                "quantity": "150.00",
                "unit": "kg",
                "notes": "Morning feeding",
            },
            format="json",
            **self.headers,
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        inventory = FeedInventory.objects.get(
            tenant=self.tenant,
            branch=self.branch,
            feed_type=self.feed_type,
            is_active=True,
        )

        self.assertEqual(
            inventory.available_quantity,
            Decimal("850.00"),
        )

        movement = FeedStockMovement.objects.filter(
            reference_id=response.data["id"]
        ).latest("created_at")
        self.assertEqual(
            movement.movement_type,
            "consumption",
        )
        self.assertEqual(
            movement.quantity,
            Decimal("-150.00"),
        )
        self.assertEqual(
            response.data["branch_name"],
            "Main Farm",
        )
        self.assertEqual(
            response.data["house_name"],
            "House 1",
        )
        self.assertEqual(
            response.data["batch_number"],
            "L001",
        )

    def test_feed_consumption_rejects_negative_stock(self):
        self.client.post(
            "/api/feed-purchases/",
            {
                "branch": str(self.branch.id),
                "feed_type": str(self.feed_type.id),
                "purchase_date": "2026-08-10",
                "quantity_bags": 1,
                "weight_per_bag": "50.00",
                "unit_cost": "100.00",
            },
            format="json",
            **self.headers,
        )

        response = self.client.post(
            "/api/feed-consumption/",
            {
                "branch": str(self.branch.id),
                "house": str(self.house.id),
                "batch": str(self.batch.id),
                "feed_type": str(self.feed_type.id),
                "consumption_date": "2026-08-11",
                "quantity": "150.00",
                "unit": "kg",
            },
            format="json",
            **self.headers,
        )

        self.assertEqual(
            response.status_code,
            400,
            response.data,
        )
        self.assertIn(
            "Insufficient feed stock",
            str(response.data),
        )

    def test_feed_purchase_update_adjusts_inventory_by_difference(self):
        response = self.client.post(
            "/api/feed-purchases/",
            {
                "branch": str(self.branch.id),
                "feed_type": str(self.feed_type.id),
                "purchase_date": "2026-08-10",
                "quantity_bags": 100,
                "weight_per_bag": "50.00",
                "unit_cost": "100.00",
            },
            format="json",
            **self.headers,
        )
        purchase_id = response.data["id"]

        update_response = self.client.patch(
            f"/api/feed-purchases/{purchase_id}/",
            {
                "quantity_bags": 80,
            },
            format="json",
            **self.headers,
        )

        self.assertEqual(
            update_response.status_code,
            200,
            update_response.data,
        )

        inventory = FeedInventory.objects.get(
            tenant=self.tenant,
            branch=self.branch,
            feed_type=self.feed_type,
            is_active=True,
        )

        self.assertEqual(
            inventory.available_quantity,
            Decimal("4000.00"),
        )

    def test_feed_consumption_delete_reverses_inventory(self):
        self.client.post(
            "/api/feed-purchases/",
            {
                "branch": str(self.branch.id),
                "feed_type": str(self.feed_type.id),
                "purchase_date": "2026-08-10",
                "quantity_bags": 10,
                "weight_per_bag": "50.00",
                "unit_cost": "100.00",
            },
            format="json",
            **self.headers,
        )

        create_response = self.client.post(
            "/api/feed-consumption/",
            {
                "branch": str(self.branch.id),
                "house": str(self.house.id),
                "batch": str(self.batch.id),
                "feed_type": str(self.feed_type.id),
                "consumption_date": "2026-08-11",
                "quantity": "120.00",
                "unit": "kg",
            },
            format="json",
            **self.headers,
        )

        consumption_id = create_response.data["id"]

        delete_response = self.client.delete(
            f"/api/feed-consumption/{consumption_id}/",
            **self.headers,
        )

        self.assertEqual(
            delete_response.status_code,
            200,
            delete_response.data,
        )

        inventory = FeedInventory.objects.get(
            tenant=self.tenant,
            branch=self.branch,
            feed_type=self.feed_type,
            is_active=True,
        )

        self.assertEqual(
            inventory.available_quantity,
            Decimal("500.00"),
        )
