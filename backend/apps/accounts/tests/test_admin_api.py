import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station


@pytest.mark.django_db
class TestAdminUserApi:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username="system-admin", password="admin-test-pass", role=User.Role.ADMIN)
        self.agent = User.objects.create_user(username="existing-agent", password="agent-test-pass", role=User.Role.AGENT)
        self.requester = User.objects.create_user(username="existing-requester", password="requester-test-pass")
        self.station = Station.objects.create(name="Head Office", code="HO")

    def test_only_admins_can_list_managed_users(self):
        self.client.force_authenticate(self.requester)
        response = self.client.get("/api/v1/admin/users/")

        assert response.status_code == 403

    def test_admin_can_create_agent_with_station_assignment(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/admin/users/",
            {
                "username": "new-agent",
                "password": "securepass123",
                "role": User.Role.AGENT,
                "station_ids": [str(self.station.pk)],
            },
            format="json",
        )

        assert response.status_code == 201
        agent = User.objects.get(username="new-agent")
        assert agent.check_password("securepass123")
        assert AgentStation.objects.filter(agent=agent, station=self.station, is_active=True).exists()
        assert response.data["stations"][0]["code"] == "HO"

    def test_admin_can_assign_a_station_to_their_own_admin_account(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/v1/admin/users/{self.admin.pk}/",
            {"station_ids": [str(self.station.pk)]},
            format="json",
        )

        assert response.status_code == 200
        self.admin.refresh_from_db()
        assert self.admin.role == User.Role.ADMIN
        assert AgentStation.objects.filter(agent=self.admin, station=self.station, is_active=True).exists()
        assert response.data["stations"][0]["id"] == self.station.pk

    def test_admin_can_deactivate_user_without_deleting_history(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/admin/users/{self.requester.pk}/",
            {"is_active": False},
            format="json",
        )

        assert response.status_code == 200
        self.requester.refresh_from_db()
        assert not self.requester.is_active
        assert User.objects.filter(pk=self.requester.pk).exists()

    def test_admin_cannot_deactivate_own_account(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/admin/users/{self.admin.pk}/",
            {"is_active": False},
            format="json",
        )

        assert response.status_code == 400
        self.admin.refresh_from_db()
        assert self.admin.is_active
