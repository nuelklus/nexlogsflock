from types import SimpleNamespace

from django.test import TestCase

from apps.core.tenant.models import Tenant
from apps.core.users.models import User
from apps.finance.invoice.serializers import InvoiceSerializer
from apps.inventory.egg.models import EggInventory, EggStockMovement
from apps.livestock.batch.models import BirdBatch
from apps.livestock.breed.models import Breed
from apps.livestock.purchase.models import Customer
from apps.organization.branch.models import Branch
from apps.organization.house.models import House
from apps.production.egg.models import EggProduction
from apps.production.egg.serializers import EggProductionSerializer


class EggInventoryWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="secret123",
            is_active=True,
        )
        self.tenant = Tenant.objects.create(
            name="Farm A",
            slug="farm-a",
        )
        self.other_tenant = Tenant.objects.create(
            name="Farm B",
            slug="farm-b",
        )
        self.branch = Branch.objects.create(
            tenant=self.tenant,
            name="Main Branch",
        )
        self.other_branch = Branch.objects.create(
            tenant=self.tenant,
            name="Second Branch",
        )
        self.foreign_branch = Branch.objects.create(
            tenant=self.other_tenant,
            name="Foreign Branch",
        )
        self.house = House.objects.create(
            tenant=self.tenant,
            branch=self.branch,
            name="House 1",
            house_type="cage",
            capacity=1000,
        )
        self.breed = Breed.objects.create(
            tenant=self.tenant,
            name="Layer Breed",
            bird_type="layer",
        )
        self.batch = BirdBatch.objects.create(
            tenant=self.tenant,
            branch=self.branch,
            house=self.house,
            batch_number="B-001",
            breed=self.breed,
            bird_type="layer",
            arrival_date="2026-01-01",
            initial_quantity=500,
        )
        self.customer = Customer.objects.create(
            tenant=self.tenant,
            name="ABC Restaurant",
            phone="0200000000",
        )
        self.request = SimpleNamespace(
            tenant=self.tenant,
            user=self.user,
        )

    def create_production(self, **overrides):
        data = {
            "branch": str(self.branch.id),
            "house": str(self.house.id),
            "batch": str(self.batch.id),
            "production_date": "2026-08-12",
            "large_eggs": 0,
            "medium_eggs": 0,
            "small_eggs": 0,
            "pullet_eggs": 0,
            "unsorted_eggs": 0,
            "good_eggs": 0,
            "cracked_eggs": 0,
            "broken_eggs": 0,
            "dirty_eggs": 0,
            "double_yolk_eggs": 0,
            "notes": "",
        }
        data.update(overrides)
        serializer = EggProductionSerializer(
            data=data,
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save(
            tenant=self.tenant,
            created_by=self.user,
            updated_by=self.user,
        )

    def create_invoice(self, **overrides):
        data = {
            "customer": str(self.customer.id),
            "branch": str(self.branch.id),
            "invoice_date": "2026-08-12",
            "due_date": "2026-08-19",
            "notes": "",
            "items_write": [],
        }
        data.update(overrides)
        serializer = InvoiceSerializer(
            data=data,
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save()

    def get_inventory(self, grade, branch=None):
        return EggInventory.objects.get(
            tenant=self.tenant,
            branch=branch or self.branch,
            grade=grade,
            is_active=True,
        )

    def test_record_large_eggs_creates_large_inventory(self):
        self.create_production(large_eggs=100)

        inventory = self.get_inventory(EggInventory.GRADE_LARGE)
        self.assertEqual(inventory.quantity, 100)
        self.assertEqual(inventory.available_quantity, 100)

    def test_record_unsorted_eggs_creates_unsorted_inventory_only(self):
        self.create_production(unsorted_eggs=100)

        inventory = self.get_inventory(EggInventory.GRADE_UNSORTED)
        self.assertEqual(inventory.quantity, 100)
        self.assertEqual(inventory.available_quantity, 100)
        self.assertFalse(
            EggInventory.objects.filter(
                tenant=self.tenant,
                branch=self.branch,
                grade=EggInventory.GRADE_LARGE,
                is_active=True,
            ).exists()
        )

    def test_record_multiple_grades_in_one_collection(self):
        self.create_production(
            large_eggs=40,
            medium_eggs=30,
            small_eggs=20,
            pullet_eggs=10,
            unsorted_eggs=100,
        )

        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_LARGE).quantity,
            40,
        )
        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_MEDIUM).quantity,
            30,
        )
        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_SMALL).quantity,
            20,
        )
        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_PULLET).quantity,
            10,
        )
        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_UNSORTED).quantity,
            100,
        )

    def test_sell_one_crate_of_large_eggs(self):
        self.create_production(large_eggs=100)
        inventory = self.get_inventory(EggInventory.GRADE_LARGE)

        invoice = self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(inventory.id),
                    "quantity": "1",
                    "unit": "crate",
                    "unit_price": "45.00",
                }
            ]
        )

        inventory.refresh_from_db()
        item = invoice.items.get()
        self.assertEqual(item.quantity, 1)
        self.assertEqual(item.unit, "crate")
        self.assertEqual(item.stock_quantity, 30)
        self.assertEqual(inventory.available_quantity, 70)
        self.assertEqual(inventory.quantity, 70)

    def test_sell_two_crates_of_unsorted_eggs(self):
        self.create_production(unsorted_eggs=100)
        inventory = self.get_inventory(EggInventory.GRADE_UNSORTED)

        self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(inventory.id),
                    "quantity": "2",
                    "unit": "crate",
                    "unit_price": "40.00",
                }
            ]
        )

        inventory.refresh_from_db()
        self.assertEqual(inventory.available_quantity, 40)
        self.assertEqual(inventory.quantity, 40)

    def test_reject_sale_when_inventory_is_insufficient(self):
        self.create_production(large_eggs=50)
        inventory = self.get_inventory(EggInventory.GRADE_LARGE)

        serializer = InvoiceSerializer(
            data={
                "customer": str(self.customer.id),
                "branch": str(self.branch.id),
                "invoice_date": "2026-08-12",
                "items_write": [
                    {
                        "egg_inventory": str(inventory.id),
                        "quantity": "2",
                        "unit": "crate",
                        "unit_price": "45.00",
                    }
                ],
            },
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        with self.assertRaisesMessage(Exception, "Not enough eggs available"):
            serializer.save()

    def test_grades_remain_separate_when_selling(self):
        self.create_production(large_eggs=50, medium_eggs=50)
        medium_inventory = self.get_inventory(EggInventory.GRADE_MEDIUM)

        self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(medium_inventory.id),
                    "quantity": "10",
                    "unit": "piece",
                    "unit_price": "2.00",
                }
            ]
        )

        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_MEDIUM).available_quantity,
            40,
        )
        self.assertEqual(
            self.get_inventory(EggInventory.GRADE_LARGE).available_quantity,
            50,
        )

    def test_invoice_cancellation_restores_inventory(self):
        self.create_production(large_eggs=100)
        inventory = self.get_inventory(EggInventory.GRADE_LARGE)
        invoice = self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(inventory.id),
                    "quantity": "2",
                    "unit": "crate",
                    "unit_price": "45.00",
                }
            ]
        )

        serializer = InvoiceSerializer(
            invoice,
            context={"request": self.request},
        )
        serializer.cancel(invoice, request=self.request)

        inventory.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(inventory.available_quantity, 100)
        self.assertEqual(inventory.quantity, 100)
        self.assertFalse(invoice.is_active)

    def test_invoice_edit_restores_then_reapplies_inventory(self):
        self.create_production(large_eggs=150)
        inventory = self.get_inventory(EggInventory.GRADE_LARGE)
        invoice = self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(inventory.id),
                    "quantity": "2",
                    "unit": "crate",
                    "unit_price": "45.00",
                }
            ]
        )

        serializer = InvoiceSerializer(
            invoice,
            data={
                "customer": str(self.customer.id),
                "branch": str(self.branch.id),
                "invoice_date": "2026-08-12",
                "due_date": "2026-08-19",
                "notes": "",
                "items_write": [
                    {
                        "egg_inventory": str(inventory.id),
                        "quantity": "3",
                        "unit": "crate",
                        "unit_price": "45.00",
                    }
                ],
            },
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        inventory.refresh_from_db()
        self.assertEqual(inventory.available_quantity, 60)
        self.assertEqual(inventory.quantity, 60)

    def test_tenant_isolation_is_enforced(self):
        foreign_inventory = EggInventory.objects.create(
            tenant=self.other_tenant,
            branch=self.foreign_branch,
            grade=EggInventory.GRADE_LARGE,
            quantity=100,
            available_quantity=100,
            unit=EggInventory.UNIT_PIECE,
            collection_start_date="2026-08-01",
            collection_end_date="2026-08-12",
        )

        serializer = InvoiceSerializer(
            data={
                "customer": str(self.customer.id),
                "branch": str(self.branch.id),
                "invoice_date": "2026-08-12",
                "items_write": [
                    {
                        "egg_inventory": str(foreign_inventory.id),
                        "quantity": "10",
                        "unit": "piece",
                        "unit_price": "2.00",
                    }
                ],
            },
            context={"request": self.request},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("items_write", serializer.errors)

    def test_branch_isolation_is_enforced(self):
        second_house = House.objects.create(
            tenant=self.tenant,
            branch=self.other_branch,
            name="House 2",
            house_type="cage",
            capacity=1000,
        )
        second_batch = BirdBatch.objects.create(
            tenant=self.tenant,
            branch=self.other_branch,
            house=second_house,
            batch_number="B-002",
            breed=self.breed,
            bird_type="layer",
            arrival_date="2026-01-02",
            initial_quantity=500,
        )

        request_for_other_branch = SimpleNamespace(
            tenant=self.tenant,
            user=self.user,
        )

        serializer = EggProductionSerializer(
            data={
                "branch": str(self.other_branch.id),
                "house": str(second_house.id),
                "batch": str(second_batch.id),
                "production_date": "2026-08-13",
                "large_eggs": 90,
                "medium_eggs": 0,
                "small_eggs": 0,
                "pullet_eggs": 0,
                "unsorted_eggs": 0,
                "good_eggs": 0,
                "cracked_eggs": 0,
                "broken_eggs": 0,
                "dirty_eggs": 0,
                "double_yolk_eggs": 0,
            },
            context={"request": request_for_other_branch},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save(
            tenant=self.tenant,
            created_by=self.user,
            updated_by=self.user,
        )

        other_inventory = self.get_inventory(
            EggInventory.GRADE_LARGE,
            branch=self.other_branch,
        )

        invoice_serializer = InvoiceSerializer(
            data={
                "customer": str(self.customer.id),
                "branch": str(self.branch.id),
                "invoice_date": "2026-08-12",
                "items_write": [
                    {
                        "egg_inventory": str(other_inventory.id),
                        "quantity": "1",
                        "unit": "crate",
                        "unit_price": "45.00",
                    }
                ],
            },
            context={"request": self.request},
        )
        self.assertFalse(invoice_serializer.is_valid())
        self.assertIn("branch", invoice_serializer.errors)

    def test_inventory_movements_are_created_for_collection_and_sale(self):
        self.create_production(large_eggs=100)
        inventory = self.get_inventory(EggInventory.GRADE_LARGE)
        self.create_invoice(
            items_write=[
                {
                    "egg_inventory": str(inventory.id),
                    "quantity": "1",
                    "unit": "crate",
                    "unit_price": "45.00",
                }
            ]
        )

        movement_types = list(
            EggStockMovement.objects
            .filter(
                tenant=self.tenant,
                branch=self.branch,
                grade=EggInventory.GRADE_LARGE,
            )
            .values_list("movement_type", flat=True)
        )
        self.assertIn(EggStockMovement.MOVEMENT_PRODUCTION, movement_types)
        self.assertIn(EggStockMovement.MOVEMENT_INVOICE_SALE, movement_types)
