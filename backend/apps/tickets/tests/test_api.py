import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import ProblemCategory, ProblemType, Ticket, TicketMessage


@pytest.mark.django_db
class TestTicketApi:
    def setup_method(self):
        self.client = APIClient()
        self.station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        self.problem_type = ProblemType.objects.create(category=category, name="HR System")
        self.user = User.objects.create_user(username="api-user", password="secretpass")
        self.agent = User.objects.create_user(
            username="api-agent",
            password="secretpass",
            role=User.Role.AGENT,
        )
        AgentStation.objects.create(agent=self.agent, station=self.station)

    def test_authenticated_user_can_create_ticket(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/v1/tickets/",
            {
                "station": str(self.station.pk),
                "problem_type": str(self.problem_type.pk),
                "description": "Cannot access HR system",
            },
            format="json",
        )

        assert response.status_code == 201
        assert str(response.data["user"]) == str(self.user.pk)
        assert response.data["status"] == Ticket.Status.QUEUED
        assert Ticket.objects.get().sla.escalation_due_at is not None

    def test_agent_can_claim_ticket_at_assigned_station(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Cannot access HR system",
        )
        self.client.force_authenticate(self.agent)

        response = self.client.post(f"/api/v1/tickets/{ticket.pk}/claim/", {}, format="json")

        assert response.status_code == 200
        ticket.refresh_from_db()
        assert ticket.assignee == self.agent
        assert ticket.status == Ticket.Status.IN_PROGRESS

    def test_user_cannot_see_internal_messages(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Cannot access HR system",
        )
        TicketMessage.objects.create(
            ticket=ticket,
            author=self.agent,
            visibility=TicketMessage.Visibility.INTERNAL,
            body="Internal investigation details",
        )
        TicketMessage.objects.create(
            ticket=ticket,
            author=self.agent,
            visibility=TicketMessage.Visibility.USER,
            body="Please restart the application",
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(f"/api/v1/tickets/{ticket.pk}/messages/")

        assert response.status_code == 200
        assert [item["body"] for item in response.data] == ["Please restart the application"]
