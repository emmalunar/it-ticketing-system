import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station


@pytest.mark.django_db
class TestAdminStationApi:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="station-admin",
            password="test-password",
            role=User.Role.ADMIN,
        )
        self.agent = User.objects.create_user(
            username="station-agent",
            password="test-password",
            role=User.Role.AGENT,
        )
        self.source = Station.objects.create(name="Source Office", code="SOURCE")
        self.destination = Station.objects.create(name="Destination Office", code="DEST")

    def test_admin_can_create_station(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/v1/admin/stations/",
            {"name": "West Office", "code": "WEST", "description": "West region"},
            format="json",
        )

        assert response.status_code == 201
        assert Station.objects.filter(code="WEST", is_active=True).exists()

    def test_non_admin_cannot_create_station(self):
        self.client.force_authenticate(self.agent)

        response = self.client.post(
            "/api/v1/admin/stations/",
            {"name": "West Office", "code": "WEST"},
            format="json",
        )

        assert response.status_code == 403
        assert not Station.objects.filter(code="WEST").exists()

    def test_admin_can_transfer_officer_between_stations(self):
        AgentStation.objects.create(agent=self.agent, station=self.source)
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/v1/admin/stations/transfer-officer/",
            {
                "officer": str(self.agent.pk),
                "from_station": str(self.source.pk),
                "to_station": str(self.destination.pk),
            },
            format="json",
        )

        assert response.status_code == 200
        assert not AgentStation.objects.filter(
            agent=self.agent,
            station=self.source,
            is_active=True,
        ).exists()
        assert AgentStation.objects.filter(
            agent=self.agent,
            station=self.destination,
            is_active=True,
        ).exists()

    def test_admin_cannot_transfer_officer_from_unassigned_station(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/v1/admin/stations/transfer-officer/",
            {
                "officer": str(self.agent.pk),
                "from_station": str(self.source.pk),
                "to_station": str(self.destination.pk),
            },
            format="json",
        )

        assert response.status_code == 400
        assert not AgentStation.objects.filter(agent=self.agent).exists()
