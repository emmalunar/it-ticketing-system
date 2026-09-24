import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import Feedback, FeedbackToken, ProblemCategory, ProblemType, Ticket


@pytest.mark.django_db
class TestFeedbackWorkflow:
    def setup_method(self):
        self.client = APIClient()
        self.station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        self.problem_type = ProblemType.objects.create(category=category, name="HR System")
        self.user = User.objects.create_user(username="feedback-user", password="secretpass")
        self.agent = User.objects.create_user(username="feedback-agent", password="secretpass", role=User.Role.AGENT)
        AgentStation.objects.create(agent=self.agent, station=self.station)
        self.ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Feedback issue",
        )
        self.ticket.assign_to(self.agent, assigned_by=self.agent)

    def resolve(self):
        self.client.force_authenticate(self.agent)
        response = self.client.post(
            f"/api/v1/tickets/{self.ticket.pk}/resolve/",
            {"resolution_notes": "Reset credentials and verified access."},
            format="json",
        )
        assert response.status_code == 200
        return response.data["feedback_token"]

    def test_resolution_creates_one_time_feedback_token(self):
        token = self.resolve()

        feedback_token = FeedbackToken.objects.get(ticket=self.ticket)
        assert token
        assert feedback_token.token_hash != token
        assert feedback_token.expires_at.hour == 17
        assert self.ticket.refresh_from_db() is None
        assert self.ticket.status == Ticket.Status.RESOLVED
        assert self.ticket.resolution_notes

    def test_positive_feedback_closes_ticket(self):
        token = self.resolve()

        response = self.client.post(
            f"/api/v1/feedback/{token}/",
            {"rating": "POSITIVE", "comment": "Resolved quickly."},
            format="json",
        )

        assert response.status_code == 200
        self.ticket.refresh_from_db()
        assert self.ticket.status == Ticket.Status.CLOSED
        assert Feedback.objects.get().rating == Feedback.Rating.POSITIVE
        assert FeedbackToken.objects.get().used_at is not None

    def test_negative_feedback_reopens_ticket_and_token_cannot_repeat(self):
        token = self.resolve()

        response = self.client.post(
            f"/api/v1/feedback/{token}/",
            {"rating": "NEGATIVE", "comment": "The problem returned."},
            format="json",
        )
        repeated = self.client.post(
            f"/api/v1/feedback/{token}/",
            {"rating": "POSITIVE"},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["data"]["status"] == Ticket.Status.REOPENED
        assert repeated.status_code == 400
        self.ticket.refresh_from_db()
        assert self.ticket.status == Ticket.Status.REOPENED
        assert self.ticket.assignee_id is None

    def test_feedback_token_can_be_validated_without_authentication(self):
        token = self.resolve()
        self.client.force_authenticate(user=None)

        response = self.client.get(f"/api/v1/feedback/{token}/")

        assert response.status_code == 200
        assert response.data["data"]["ticket_number"] == self.ticket.ticket_number
