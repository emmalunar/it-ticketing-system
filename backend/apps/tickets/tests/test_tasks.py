from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import Notification, ProblemCategory, ProblemType, Ticket
from apps.tickets.tasks import process_due_escalations


@pytest.mark.django_db
class TestTicketNotificationTasks:
    def setup_method(self):
        self.station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        self.problem_type = ProblemType.objects.create(category=category, name="HR System")
        self.user = User.objects.create_user(username="task-user", password="secretpass")
        self.agent = User.objects.create_user(username="task-agent", password="secretpass", role=User.Role.AGENT)
        AgentStation.objects.create(agent=self.agent, station=self.station)

    def create_ticket(self, user=None):
        return Ticket.objects.create(
            user=user or self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Task issue",
        )

    def test_p1_creation_notifies_active_station_agents(self):
        p1_user = User.objects.create_user(
            username="task-executive",
            password="secretpass",
            priority_level=User.PriorityLevel.P1,
        )

        ticket = self.create_ticket(p1_user)

        assert Notification.objects.filter(
            ticket=ticket,
            recipient=self.agent,
            event_type=Notification.EventType.P1_TICKET_CREATED,
        ).count() == 1

    def test_due_p2_escalates_once(self):
        manager = User.objects.create_user(
            username="task-manager",
            password="secretpass",
            priority_level=User.PriorityLevel.P2,
        )
        ticket = self.create_ticket(manager)
        ticket.sla.escalation_due_at = timezone.now() - timedelta(minutes=1)
        ticket.sla.save(update_fields=("escalation_due_at",))

        assert process_due_escalations() == 1
        assert process_due_escalations() == 0
        assert Notification.objects.filter(
            ticket=ticket,
            recipient=self.agent,
            event_type=Notification.EventType.P2_ESCALATION,
        ).count() == 1
        assert ticket.sla.__class__.objects.get(ticket=ticket).escalated_at is not None

    def test_claimed_ticket_does_not_escalate(self):
        manager = User.objects.create_user(
            username="task-manager-claimed",
            password="secretpass",
            priority_level=User.PriorityLevel.P2,
        )
        ticket = self.create_ticket(manager)
        ticket.assign_to(self.agent, assigned_by=self.agent)
        ticket.sla.escalation_due_at = timezone.now() - timedelta(minutes=1)
        ticket.sla.stopped_at = timezone.now()
        ticket.sla.save(update_fields=("escalation_due_at", "stopped_at"))

        assert process_due_escalations() == 0
        assert not Notification.objects.filter(ticket=ticket, event_type=Notification.EventType.P2_ESCALATION).exists()