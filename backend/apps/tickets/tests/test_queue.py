import pytest
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import ProblemCategory, ProblemType, Ticket
from apps.tickets.queue import queue_position, queue_tickets


@pytest.mark.django_db
class TestTicketQueue:
    def setup_method(self):
        self.client = APIClient()
        self.station = Station.objects.create(name="Head Office", code="HO")
        self.other_station = Station.objects.create(name="Tesano", code="TES")
        category = ProblemCategory.objects.create(name="Support")
        self.problem_type = ProblemType.objects.create(category=category, name="HR System")
        self.p2_user = User.objects.create_user(username="manager-queue", password="secretpass", priority_level=User.PriorityLevel.P2)
        self.p3_user = User.objects.create_user(username="employee-queue", password="secretpass")
        self.agent = User.objects.create_user(username="agent-queue", password="secretpass", role=User.Role.AGENT)
        AgentStation.objects.create(agent=self.agent, station=self.station)

    def create_ticket(self, user, station=None):
        return Ticket.objects.create(
            user=user,
            station=station or self.station,
            problem_type=self.problem_type,
            description="Queue issue",
        )

    def test_queue_orders_p2_before_p3_and_excludes_p1(self):
        p3 = self.create_ticket(self.p3_user)
        p2 = self.create_ticket(self.p2_user)
        p1_user = User.objects.create_user(username="executive-queue", password="secretpass", priority_level=User.PriorityLevel.P1)
        p1 = self.create_ticket(p1_user)
        p3.created_at = timezone.now() - timedelta(hours=1)
        p3.save(update_fields=("created_at",))

        assert list(queue_tickets(self.station.pk)) == [p2, p3]
        assert queue_position(p2)["position"] == 1
        assert queue_position(p1)["queue_applicable"] is False

    def test_queue_is_station_specific_and_recomputes_after_claim(self):
        first = self.create_ticket(self.p3_user)
        second = self.create_ticket(self.p3_user)
        other = self.create_ticket(self.p3_user, self.other_station)

        assert list(queue_tickets(self.station.pk)) == [first, second]
        assert queue_position(second)["tickets_ahead"] == 1
        first.assign_to(self.agent, assigned_by=self.agent)
        second.refresh_from_db()
        assert queue_position(second)["position"] == 1
        assert list(queue_tickets(self.station.pk)) == [second]
        assert list(queue_tickets(self.other_station.pk)) == [other]

    def test_agent_can_view_only_authorized_station_queue(self):
        self.create_ticket(self.p3_user)
        self.client.force_authenticate(self.agent)

        response = self.client.get("/api/v1/queue/")

        assert response.status_code == 200
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["ticket_number"].startswith("IT-")