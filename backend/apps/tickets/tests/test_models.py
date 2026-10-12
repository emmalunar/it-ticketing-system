import pytest
from django.core.exceptions import ValidationError

from apps.accounts.models import User
from apps.stations.models import Station
from apps.tickets.models import AuditLog, Notification, ProblemCategory, ProblemType, Ticket, TicketMessage


@pytest.mark.django_db
class TestTicketCoreModels:
    def test_user_priority_defaults_to_p3(self):
        user = User.objects.create_user(username="user01", email="user01@example.com", password="secretpass")
        assert user.priority_level == User.PriorityLevel.P3

    def test_ticket_priority_is_copied_from_user_priority(self):
        station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        problem_type = ProblemType.objects.create(category=category, name="HR System")
        user = User.objects.create_user(
            username="manager1",
            email="manager1@example.com",
            password="secretpass",
            priority_level=User.PriorityLevel.P2,
        )

        ticket = Ticket.objects.create(
            user=user,
            station=station,
            problem_type=problem_type,
            description="Laptop is not turning on",
        )

        assert ticket.priority == User.PriorityLevel.P2
        assert ticket.ticket_number.startswith("IT-")

    def test_ticket_requires_station_and_problem_type(self):
        user = User.objects.create_user(username="user02", email="user02@example.com", password="secretpass")
        ticket = Ticket(user=user, description="Issue")

        with pytest.raises(ValidationError):
            ticket.full_clean()

    def test_assignment_updates_ticket_and_preserves_history(self):
        station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        problem_type = ProblemType.objects.create(category=category, name="HR System")
        requester = User.objects.create_user(username="requester", password="secretpass")
        agent = User.objects.create_user(username="agent01", password="secretpass", role=User.Role.AGENT)
        ticket = Ticket.objects.create(user=requester, station=station, problem_type=problem_type, description="Issue")

        assignment = ticket.assign_to(agent, assigned_by=agent, reason="Claimed from queue")

        ticket.refresh_from_db()
        assert ticket.assignee == agent
        assert ticket.status == Ticket.Status.IN_PROGRESS
        assert assignment.ticket == ticket
        assert ticket.assignments.count() == 1
        assert ticket.sla.stopped_at is not None
        assert ticket.notifications.filter(event_type=Notification.EventType.TICKET_ASSIGNED).exists()
        assert ticket.audit_logs.filter(action="ticket.assigned").exists()

    def test_transfer_updates_station_and_preserves_history(self):
        source = Station.objects.create(name="Head Office", code="HO")
        destination = Station.objects.create(name="Tesano", code="TES")
        category = ProblemCategory.objects.create(name="Support")
        problem_type = ProblemType.objects.create(category=category, name="HR System")
        requester = User.objects.create_user(username="requester2", password="secretpass")
        agent = User.objects.create_user(username="agent02", password="secretpass", role=User.Role.AGENT)
        ticket = Ticket.objects.create(user=requester, station=source, problem_type=problem_type, description="Issue")

        transfer = ticket.transfer_to(destination, transferred_by=agent, agent=agent, reason="Requires another station")

        ticket.refresh_from_db()
        assert ticket.station == destination
        assert ticket.assignee == agent
        assert transfer.from_station == source
        assert transfer.to_station == destination
        assert ticket.transfers.count() == 1
        assert ticket.assignments.filter(agent=agent, ended_at__isnull=True).exists()
        assert ticket.notifications.filter(event_type=Notification.EventType.TICKET_TRANSFERRED).exists()
        assert ticket.audit_logs.filter(action="ticket.transferred").exists()

    def test_internal_message_is_distinguished_from_user_message(self):
        station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        problem_type = ProblemType.objects.create(category=category, name="HR System")
        user = User.objects.create_user(username="requester3", password="secretpass")
        ticket = Ticket.objects.create(user=user, station=station, problem_type=problem_type, description="Issue")

        message = TicketMessage.objects.create(
            ticket=ticket,
            author=user,
            visibility=TicketMessage.Visibility.INTERNAL,
            body="Agent-only context",
        )

        assert message.visibility == TicketMessage.Visibility.INTERNAL
        assert ticket.messages.get().body == "Agent-only context"

    def test_notifications_and_audit_logs_are_persisted(self):
        station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        problem_type = ProblemType.objects.create(category=category, name="HR System")
        user = User.objects.create_user(username="requester4", password="secretpass")
        ticket = Ticket.objects.create(user=user, station=station, problem_type=problem_type, description="Issue")

        notification = Notification.objects.create(
            recipient=user,
            ticket=ticket,
            event_type=Notification.EventType.TICKET_ASSIGNED,
            title="Ticket assigned",
            message="Your ticket has been assigned.",
            dedupe_key=f"assignment:{ticket.pk}",
        )
        audit = AuditLog.objects.create(
            ticket=ticket,
            actor=user,
            action="ticket.created",
            new_value={"status": Ticket.Status.QUEUED},
        )

        assert notification.ticket == ticket
        assert audit.new_value["status"] == Ticket.Status.QUEUED
