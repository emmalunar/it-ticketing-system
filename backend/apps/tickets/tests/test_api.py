import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import ProblemCategory, ProblemType, Ticket, TicketMessage, TicketTransfer


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

    def test_requester_ticket_list_only_contains_their_own_tickets(self):
        own_ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Cannot access HR system",
        )
        other_user = User.objects.create_user(username="other-requester", password="secretpass")
        Ticket.objects.create(
            user=other_user,
            station=self.station,
            problem_type=self.problem_type,
            description="Another person's issue",
        )
        self.client.force_authenticate(self.user)

        response = self.client.get("/api/v1/tickets/")

        assert response.status_code == 200
        assert [item["id"] for item in response.data] == [str(own_ticket.pk)]

    def test_requester_can_load_ticket_form_options(self):
        self.client.force_authenticate(self.user)

        response = self.client.get("/api/v1/tickets/options/")

        assert response.status_code == 200
        data = response.json()
        assert data["stations"] == [
            {"id": str(self.station.pk), "name": self.station.name, "code": self.station.code}
        ]
        problem_types = {item["name"]: item for item in data["problem_types"]}
        assert problem_types[self.problem_type.name] == {
            "id": str(self.problem_type.pk),
            "name": self.problem_type.name,
            "category": self.problem_type.category.name,
            "category_id": str(self.problem_type.category.pk),
            "description": self.problem_type.description,
            "is_active": True,
        }
        default_issue_types = {
            "Software Error": "Application crashes, unexpected behavior, or error pop-ups.",
            "Hardware Issue": "Problems with physical equipment like monitors, keyboards, or mice.",
            "Network & Wi-Fi": "Issues connecting to the office network, or internet services.",
            "Access & Permissions": "Account lockouts, password resets, or authorization requests.",
            "Printer Issue": "Paper Jam, Tray Empty, Toner exhausted, Printer Network, Unable to print.",
        }
        assert all(
            problem_types[name]["description"] == description
            for name, description in default_issue_types.items()
        )
        assert data["officers"] == []

    def test_agent_ticket_options_include_cross_station_transfer_targets(self):
        destination = Station.objects.create(name="North Office", code="NORTH")
        recipient = User.objects.create_user(
            username="receiving-agent",
            password="test-password",
            role=User.Role.AGENT,
        )
        AgentStation.objects.create(agent=recipient, station=destination)
        self.client.force_authenticate(self.agent)

        response = self.client.get("/api/v1/tickets/options/")

        assert response.status_code == 200
        data = response.json()
        assert {station["id"] for station in data["stations"]} == {
            str(self.station.pk),
            str(destination.pk),
        }
        assert {
            (officer["id"], officer["station"])
            for officer in data["officers"]
        } == {
            (str(self.agent.pk), str(self.station.pk)),
            (str(recipient.pk), str(destination.pk)),
        }

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
        assert str(response.data["assignee"]) == str(self.agent.pk)
        assert response.data["assigned_by_me"] is True
        ticket.refresh_from_db()
        assert ticket.assignee == self.agent
        assert ticket.status == Ticket.Status.IN_PROGRESS

    def test_agent_cannot_claim_an_already_assigned_ticket(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Cannot access HR system",
        )
        ticket.assign_to(self.agent, assigned_by=self.agent)
        self.client.force_authenticate(self.agent)

        response = self.client.post(f"/api/v1/tickets/{ticket.pk}/claim/", {}, format="json")

        assert response.status_code == 400
        ticket.refresh_from_db()
        assert ticket.assignments.count() == 1

    def test_agent_cannot_claim_a_ticket_in_an_ineligible_state(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Cannot access HR system",
            status=Ticket.Status.WAITING_USER,
        )
        self.client.force_authenticate(self.agent)

        response = self.client.post(f"/api/v1/tickets/{ticket.pk}/claim/", {}, format="json")

        assert response.status_code == 400
        ticket.refresh_from_db()
        assert ticket.assignee is None

    def test_agent_can_transfer_assigned_ticket_to_an_authorized_station(self):
        destination = Station.objects.create(name="North Office", code="NORTH")
        AgentStation.objects.create(agent=self.agent, station=destination)
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Requires a different station",
        )
        ticket.assign_to(self.agent, assigned_by=self.agent)
        self.client.force_authenticate(self.agent)

        response = self.client.post(
            f"/api/v1/tickets/{ticket.pk}/transfer/",
            {"station": str(destination.pk), "reason": "Specialist coverage"},
            format="json",
        )

        assert response.status_code == 200
        ticket.refresh_from_db()
        transfer = TicketTransfer.objects.get(ticket=ticket)
        assert ticket.station == destination
        assert ticket.assignee is None
        assert ticket.status == Ticket.Status.QUEUED
        assert transfer.from_station == self.station
        assert transfer.to_station == destination
        assert ticket.sla.stopped_at is None
        assert ticket.notifications.filter(event_type="TICKET_TRANSFERRED").exists()
        prior_assignment = ticket.assignments.get(agent=self.agent)
        assert prior_assignment.ended_at is not None

    def test_agent_can_transfer_to_another_active_station(self):
        destination = Station.objects.create(name="Remote Office", code="REMOTE")
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Requires a different station",
        )
        self.client.force_authenticate(self.agent)

        response = self.client.post(
            f"/api/v1/tickets/{ticket.pk}/transfer/",
            {"station": str(destination.pk)},
            format="json",
        )

        assert response.status_code == 200
        ticket.refresh_from_db()
        assert ticket.station == destination
        assert TicketTransfer.objects.filter(
            ticket=ticket,
            from_station=self.station,
            to_station=destination,
        ).exists()

    def test_agent_can_transfer_ticket_to_officer_at_another_station(self):
        destination = Station.objects.create(name="Remote Office", code="REMOTE")
        receiving_officer = User.objects.create_user(
            username="receiving-agent",
            password="test-password",
            role=User.Role.AGENT,
        )
        AgentStation.objects.create(agent=receiving_officer, station=destination)
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Needs a specialist",
        )
        ticket.assign_to(self.agent, assigned_by=self.agent)
        self.client.force_authenticate(self.agent)

        response = self.client.post(
            f"/api/v1/tickets/{ticket.pk}/transfer/",
            {"station": str(destination.pk), "agent": str(receiving_officer.pk)},
            format="json",
        )

        assert response.status_code == 200
        ticket.refresh_from_db()
        assert ticket.station == destination
        assert ticket.assignee == receiving_officer
        assert ticket.status == Ticket.Status.IN_PROGRESS

    def test_admin_can_claim_and_transfer_across_stations(self):
        destination = Station.objects.create(name="Admin Destination", code="ADMIN-DEST")
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Needs administrative intervention",
        )
        admin = User.objects.create_user(
            username="ticket-admin",
            password="test-pass-123",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(admin)

        claim = self.client.post(f"/api/v1/tickets/{ticket.pk}/claim/", {}, format="json")
        assert claim.status_code == 200
        assert str(claim.data["assignee"]) == str(admin.pk)
        assert claim.data["assigned_by_me"] is True
        ticket.refresh_from_db()
        assert ticket.assignee == admin

        transfer = self.client.post(
            f"/api/v1/tickets/{ticket.pk}/transfer/",
            {"station": str(destination.pk), "reason": "Move to the correct location"},
            format="json",
        )

        assert transfer.status_code == 200
        ticket.refresh_from_db()
        assert ticket.station == destination
        assert ticket.assignee is None
        assert ticket.status == Ticket.Status.QUEUED

    def test_admin_can_add_and_delete_issue_catalog_items(self):
        admin = User.objects.create_user(username="catalog-admin", role=User.Role.ADMIN)
        self.client.force_authenticate(admin)

        created = self.client.post(
            "/api/v1/admin/issue-types/",
            {
                "name": "VPN access",
                "category_name": "Connectivity",
                "description": "VPN connection and access issues.",
            },
            format="json",
        )

        assert created.status_code == 201
        assert created.data["name"] == "VPN access"
        assert created.data["is_active"] is True

        deleted = self.client.delete(f"/api/v1/admin/issue-types/{created.data['id']}/")

        assert deleted.status_code == 200
        assert deleted.data["is_active"] is False
        assert ProblemType.objects.filter(pk=created.data["id"]).exists()

    def test_non_admin_cannot_manage_issue_catalog(self):
        self.client.force_authenticate(self.agent)

        response = self.client.post(
            "/api/v1/admin/issue-types/",
            {"name": "Restricted", "category_name": "IT Support"},
            format="json",
        )

        assert response.status_code == 403

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

    def test_admin_can_archive_ticket_without_erasing_history(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Keep this ticket for audit history",
        )
        admin = User.objects.create_user(username="ticket-admin", password="admin-test-pass", role=User.Role.ADMIN)
        self.client.force_authenticate(admin)

        response = self.client.post(f"/api/v1/tickets/{ticket.pk}/archive/", {}, format="json")

        assert response.status_code == 200
        ticket.refresh_from_db()
        assert ticket.status == Ticket.Status.CLOSED
        assert ticket.closed_at is not None

    def test_ticket_hard_delete_is_disabled(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Ticket history must be retained",
        )
        self.client.force_authenticate(self.user)

        response = self.client.delete(f"/api/v1/tickets/{ticket.pk}/")

        assert response.status_code == 405
        assert Ticket.objects.filter(pk=ticket.pk).exists()

    def test_non_admin_cannot_archive_ticket(self):
        ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Only an admin can archive this",
        )
        self.client.force_authenticate(self.agent)

        response = self.client.post(f"/api/v1/tickets/{ticket.pk}/archive/", {}, format="json")

        assert response.status_code == 403
        ticket.refresh_from_db()
        assert ticket.status == Ticket.Status.QUEUED
