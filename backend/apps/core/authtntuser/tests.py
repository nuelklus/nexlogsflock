from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.authtntuser.models import Role, Permission, RolePermission
from apps.core.authtntuser.services.permissions import setup_tenant_permissions
from apps.core.tenant.models import Tenant, TenantUser
from apps.organization.branch.models import Branch

User = get_user_model()


class StaffRegistrationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="SecurePassword123!",
            first_name="Farm",
            last_name="Owner",
            phone_number="0240000000",
            is_active=True,
        )

        self.tenant = Tenant.objects.create(
            name="Alpha Farm",
            slug="alpha-farm",
            is_active=True,
        )
        self.other_tenant = Tenant.objects.create(
            name="Beta Farm",
            slug="beta-farm",
            is_active=True,
        )

        self.owner_role = Role.objects.create(
            tenant=self.tenant,
            name="Owner",
            description="Owner role",
            is_system_role=True,
            is_active=True,
        )
        TenantUser.objects.create(
            user=self.owner,
            tenant=self.tenant,
            role=self.owner_role,
            is_active=True,
        )

        self.branch = Branch.objects.create(
            tenant=self.tenant,
            name="Main Farm",
            location="Accra",
            is_active=True,
        )
        self.other_branch = Branch.objects.create(
            tenant=self.other_tenant,
            name="Other Branch",
            location="Kumasi",
            is_active=True,
        )

        setup_tenant_permissions(self.tenant)

        self.manager_user = User.objects.create_user(
            email="manager@example.com",
            password="SecurePassword123!",
            first_name="Farm",
            last_name="Manager",
            phone_number="0241111111",
            is_active=True,
        )
        self.manager_role = Role.objects.create(
            tenant=self.tenant,
            name="Farm Manager",
            description="Farm manager role",
            is_system_role=True,
            is_active=True,
        )
        TenantUser.objects.create(
            user=self.manager_user,
            tenant=self.tenant,
            role=self.manager_role,
            is_active=True,
        )

        self.attendant_user = User.objects.create_user(
            email="attendant@example.com",
            password="SecurePassword123!",
            first_name="Farm",
            last_name="Attendant",
            phone_number="0242222222",
            is_active=True,
        )
        self.attendant_role = Role.objects.create(
            tenant=self.tenant,
            name="Farm Attendant",
            description="Farm attendant role",
            is_system_role=True,
            is_active=True,
        )
        TenantUser.objects.create(
            user=self.attendant_user,
            tenant=self.tenant,
            role=self.attendant_role,
            is_active=True,
        )

        self.owner_headers = {"HTTP_X_TENANT_ID": str(self.tenant.id)}
        self.other_tenant_headers = {"HTTP_X_TENANT_ID": str(self.other_tenant.id)}

    def _post_staff(self, payload, user=None, headers=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user=user)
        if headers is not None:
            return client.post(
                "/api/auth/register/staff/",
                payload,
                format="json",
                **headers,
            )
        return client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
        )

    def test_owner_can_register_farm_manager(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone_number": "0240000000",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_manager",
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["staff_type"], "farm_manager")
        self.assertEqual(response.data["user"]["role"]["name"], "Farm Manager")
        self.assertEqual(response.data["user"]["branch"]["name"], "Main Farm")

        user = User.objects.get(email="john@example.com")
        self.assertTrue(user.check_password("SecurePassword123!"))
        membership = TenantUser.objects.get(user=user, tenant=self.tenant)
        self.assertEqual(membership.role.name, "Farm Manager")
        self.assertEqual(membership.tenant_id, self.tenant.id)
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="dashboard",
                permission__action="view",
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="finance",
                permission__action="view",
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="finance",
                permission__action="create",
                is_active=True,
            ).exists()
        )

    def test_owner_can_register_farm_attendant(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Mary",
            "last_name": "Nana",
            "email": "mary@example.com",
            "phone_number": "0243333333",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_attendant",
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["staff_type"], "farm_attendant")
        self.assertEqual(response.data["user"]["role"]["name"], "Farm Attendant")

        user = User.objects.get(email="mary@example.com")
        membership = TenantUser.objects.get(user=user, tenant=self.tenant)
        self.assertEqual(membership.role.name, "Farm Attendant")
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="eggs",
                permission__action="create",
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="finance",
                permission__action="view",
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="finance",
                permission__action="create",
                is_active=True,
            ).exists()
        )
        self.assertFalse(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="finance",
                permission__action="update",
                is_active=True,
            ).exists()
        )
        self.assertFalse(
            RolePermission.objects.filter(
                tenant=self.tenant,
                role=membership.role,
                permission__tenant=self.tenant,
                permission__module="staff",
                permission__action="create",
                is_active=True,
            ).exists()
        )

    def test_farm_manager_and_farm_attendant_are_forbidden(self):
        payload = {
            "first_name": "Blocked",
            "last_name": "User",
            "email": "blocked@example.com",
            "phone_number": "0244444444",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_manager",
        }

        manager_response = self._post_staff(
            payload,
            user=self.manager_user,
            headers=self.owner_headers,
        )
        self.assertEqual(manager_response.status_code, 403)

        attendant_response = self._post_staff(
            {
                **payload,
                "email": "blocked-attendant@example.com",
                "staff_type": "farm_attendant",
            },
            user=self.attendant_user,
            headers=self.owner_headers,
        )
        self.assertEqual(attendant_response.status_code, 403)

    def test_unauthenticated_user_cannot_register_staff(self):
        response = self._post_staff(
            {
                "first_name": "No",
                "last_name": "Auth",
                "email": "noauth@example.com",
                "phone_number": "0245555555",
                "password": "SecurePassword123!",
                "branch_id": str(self.branch.id),
                "staff_type": "farm_manager",
            },
            headers=self.owner_headers,
        )
        self.assertEqual(response.status_code, 401)

    def test_owner_cannot_assign_branch_from_another_tenant(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Cross",
            "last_name": "Tenant",
            "email": "cross@example.com",
            "phone_number": "0246666666",
            "password": "SecurePassword123!",
            "branch_id": str(self.other_branch.id),
            "staff_type": "farm_manager",
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("branch_id", response.data)
        self.assertFalse(User.objects.filter(email="cross@example.com").exists())

    def test_role_id_override_is_rejected(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Role",
            "last_name": "Test",
            "email": "roleoverride@example.com",
            "phone_number": "0247777777",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_attendant",
            "role_id": str(self.owner_role.id),
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("role_id", response.data)
        self.assertFalse(User.objects.filter(email="roleoverride@example.com").exists())

    def test_invalid_staff_type_is_rejected(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Bad",
            "last_name": "Type",
            "email": "badtype@example.com",
            "phone_number": "0248888888",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "admin",
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("staff_type", response.data)

    def test_duplicate_email_is_rejected(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Existing",
            "last_name": "User",
            "email": "owner@example.com",
            "phone_number": "0249999999",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_manager",
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_tenant_id_cannot_be_manipulated(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "first_name": "Tenant",
            "last_name": "Tamper",
            "email": "tamper@example.com",
            "phone_number": "0241010101",
            "password": "SecurePassword123!",
            "branch_id": str(self.branch.id),
            "staff_type": "farm_manager",
            "tenant_id": str(self.other_tenant.id),
        }

        response = self.client.post(
            "/api/auth/register/staff/",
            payload,
            format="json",
            **self.owner_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("tenant_id", response.data)
        self.assertFalse(User.objects.filter(email="tamper@example.com").exists())
