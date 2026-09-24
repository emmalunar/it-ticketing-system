import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station


@pytest.mark.django_db
class TestAuthenticationApi:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="agent-auth",
            email="agent@example.com",
            password="secretpass",
            first_name="Support",
            last_name="Agent",
            role=User.Role.AGENT,
            priority_level=User.PriorityLevel.P2,
        )
        self.station = Station.objects.create(name="Head Office", code="HO")
        AgentStation.objects.create(agent=self.user, station=self.station)

    def test_login_returns_profile_and_sets_session(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "agent-auth", "password": "secretpass"},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["user"]["role"] == User.Role.AGENT
        assert response.data["user"]["priority_level"] == User.PriorityLevel.P2
        assert response.data["user"]["stations"][0]["code"] == "HO"
        assert "password" not in response.data["user"]
        assert self.client.session.get("_auth_user_id") == str(self.user.pk)

    def test_current_user_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")
        assert response.status_code == 403

    def test_current_user_returns_authenticated_profile(self):
        self.client.force_authenticate(self.user)

        response = self.client.get("/api/v1/auth/me/")

        assert response.status_code == 200
        assert response.data["username"] == "agent-auth"
        assert response.data["stations"][0]["name"] == "Head Office"

    def test_invalid_login_is_rejected(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "agent-auth", "password": "wrongpass"},
            format="json",
        )

        assert response.status_code == 401
        assert response.data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_logout_clears_session(self):
        assert self.client.login(username="agent-auth", password="secretpass")

        response = self.client.post("/api/v1/auth/logout/", {}, format="json")

        assert response.status_code == 200
        assert self.client.get("/api/v1/auth/me/").status_code == 403
