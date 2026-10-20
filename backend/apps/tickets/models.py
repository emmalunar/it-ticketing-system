import uuid
from datetime import timedelta
import hashlib
import secrets

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class ProblemCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "problem_categories"

    def __str__(self):
        return self.name


class ProblemType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(ProblemCategory, on_delete=models.CASCADE, related_name="problem_types")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "problem_types"
        unique_together = ("category", "name")

    def __str__(self):
        return f"{self.category.name}: {self.name}"


class Ticket(models.Model):
    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        WAITING_USER = "WAITING_USER", "Waiting for user"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        REOPENED = "REOPENED", "Reopened"

    class Priority(models.TextChoices):
        P1 = "P1", "P1"
        P2 = "P2", "P2"
        P3 = "P3", "P3"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="tickets")
    station = models.ForeignKey("stations.Station", on_delete=models.PROTECT, related_name="tickets")
    problem_type = models.ForeignKey(ProblemType, on_delete=models.PROTECT, related_name="tickets")
    ticket_number = models.CharField(max_length=30, unique=True, blank=True)
    description = models.TextField()
    resolution_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    priority = models.CharField(max_length=10, choices=Priority.choices, blank=True, default="")
    assignee = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tickets"
        indexes = [
            models.Index(
                fields=("station", "status", "priority", "created_at"),
                name="ticket_station_queue_idx",
            ),
            models.Index(fields=("user", "created_at"), name="ticket_user_created_idx"),
        ]

    def clean(self):
        super().clean()
        if not self.station_id:
            raise ValidationError({"station": "A station is required."})
        if not self.problem_type_id:
            raise ValidationError({"problem_type": "A problem type is required."})
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        if not self.priority and self.user_id:
            self.priority = self.user.priority_level

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        if not self.priority and self.user_id:
            self.priority = self.user.priority_level
        super().save(*args, **kwargs)
        if is_new:
            TicketSLA.objects.create_from_ticket(self)
            if self.priority == self.Priority.P1:
                from apps.tickets.tasks import notify_p1_ticket

                notify_p1_ticket(str(self.pk))

    def assign_to(self, agent, assigned_by=None, reason=""):
        TicketAssignment.objects.filter(ticket=self, ended_at__isnull=True).update(ended_at=timezone.now())
        assignment = TicketAssignment.objects.create(
            ticket=self,
            agent=agent,
            assigned_by=assigned_by,
            reason=reason,
        )
        self.assignee = agent
        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=("assignee", "status", "updated_at"))
        TicketSLA.objects.filter(ticket=self, stopped_at__isnull=True).update(stopped_at=timezone.now())
        Notification.objects.create(
            recipient=agent,
            ticket=self,
            event_type=Notification.EventType.TICKET_ASSIGNED,
            title="Ticket assigned",
            message=f"Ticket {self.ticket_number} has been assigned to you.",
            dedupe_key=f"assignment:{assignment.id}",
        )
        AuditLog.objects.create(
            ticket=self,
            actor=assigned_by,
            action="ticket.assigned",
            new_value={"agent_id": str(agent.pk)},
        )
        return assignment

    def transfer_to(self, station, transferred_by, agent=None, reason=""):
        now = timezone.now()
        TicketAssignment.objects.filter(ticket=self, ended_at__isnull=True).update(ended_at=now)
        transfer = TicketTransfer.objects.create(
            ticket=self,
            from_station=self.station,
            to_station=station,
            from_agent=self.assignee,
            to_agent=agent,
            transferred_by=transferred_by,
            reason=reason,
        )
        self.station = station
        self.assignee = agent
        self.status = self.Status.IN_PROGRESS if agent else self.Status.QUEUED
        self.save(update_fields=("station", "assignee", "status", "updated_at"))
        if agent:
            TicketAssignment.objects.create(
                ticket=self,
                agent=agent,
                assigned_by=transferred_by,
                reason=reason,
            )
            TicketSLA.objects.filter(ticket=self).update(stopped_at=now)
            recipients = [agent.pk]
        else:
            escalation_minutes = {
                self.Priority.P2: 10,
                self.Priority.P3: 60,
            }.get(self.priority)
            TicketSLA.objects.filter(ticket=self).update(
                escalation_due_at=now + timedelta(minutes=escalation_minutes)
                if escalation_minutes is not None
                else None,
                escalated_at=None,
                stopped_at=None,
            )
            from apps.stations.models import AgentStation

            recipients = AgentStation.objects.filter(
                station=station,
                is_active=True,
                agent__is_active=True,
            ).values_list("agent_id", flat=True)
        Notification.objects.bulk_create(
            [
                Notification(
                    recipient_id=recipient_id,
                    ticket=self,
                    event_type=Notification.EventType.TICKET_TRANSFERRED,
                    title="Ticket transferred",
                    message=f"Ticket {self.ticket_number} has been transferred to {station.name}.",
                    dedupe_key=f"transfer:{transfer.id}:{recipient_id}",
                )
                for recipient_id in recipients
            ],
            ignore_conflicts=True,
        )
        AuditLog.objects.create(
            ticket=self,
            actor=transferred_by,
            action="ticket.transferred",
            old_value={"station_id": str(transfer.from_station_id)},
            new_value={"station_id": str(transfer.to_station_id)},
        )
        return transfer

    def resolve(self, resolution_notes, resolved_by):
        if self.status != self.Status.IN_PROGRESS:
            raise ValidationError("Only tickets in progress can be resolved.")
        if not resolution_notes.strip():
            raise ValidationError({"resolution_notes": "Resolution notes are required."})
        self.resolution_notes = resolution_notes
        self.status = self.Status.RESOLVED
        self.resolved_at = timezone.now()
        self.save(update_fields=("resolution_notes", "status", "resolved_at", "updated_at"))
        raw_token = FeedbackToken.issue_for_ticket(self)
        Notification.objects.create(
            recipient=self.user,
            ticket=self,
            event_type=Notification.EventType.TICKET_RESOLVED,
            title="Ticket resolved",
            message=f"Ticket {self.ticket_number} has been resolved. Please provide feedback.",
            dedupe_key=f"resolved:{self.pk}:{self.resolved_at.isoformat()}",
        )
        AuditLog.objects.create(
            ticket=self,
            actor=resolved_by,
            action="ticket.resolved",
            new_value={"resolution_notes": resolution_notes},
        )
        return raw_token

    def close_from_feedback(self, feedback):
        self.status = self.Status.CLOSED
        self.closed_at = timezone.now()
        self.save(update_fields=("status", "closed_at", "updated_at"))
        AuditLog.objects.create(
            ticket=self,
            actor=feedback.user,
            action="ticket.closed",
            new_value={"feedback_id": str(feedback.pk)},
        )

    def reopen_from_feedback(self, feedback):
        previous_assignee = self.assignee
        self.status = self.Status.REOPENED
        self.assignee = None
        self.save(update_fields=("status", "assignee", "updated_at"))
        Notification.objects.create(
            recipient=previous_assignee or self.user,
            ticket=self,
            event_type=Notification.EventType.TICKET_REOPENED,
            title="Ticket reopened",
            message=f"Ticket {self.ticket_number} requires further support.",
            dedupe_key=f"reopened:{feedback.pk}",
        )
        AuditLog.objects.create(
            ticket=self,
            actor=feedback.user,
            action="ticket.reopened",
            new_value={"feedback_id": str(feedback.pk)},
        )

    def generate_ticket_number(self):
        year = timezone.now().year
        count = Ticket.objects.filter(created_at__year=year).count() + 1
        return f"IT-{year}-{count:06d}"

    def __str__(self):
        return self.ticket_number or f"Ticket {self.id}"


class TicketAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="assignments")
    agent = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="ticket_assignments")
    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="created_ticket_assignments",
    )
    reason = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_assignments"
        ordering = ("-assigned_at",)


class TicketTransfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="transfers")
    from_station = models.ForeignKey("stations.Station", on_delete=models.PROTECT, related_name="outgoing_transfers")
    to_station = models.ForeignKey("stations.Station", on_delete=models.PROTECT, related_name="incoming_transfers")
    from_agent = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="outgoing_ticket_transfers",
    )
    to_agent = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="incoming_ticket_transfers",
    )
    transferred_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="ticket_transfers")
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_transfers"
        ordering = ("-created_at",)


class TicketMessage(models.Model):
    class Visibility(models.TextChoices):
        USER = "USER", "User visible"
        INTERNAL = "INTERNAL", "Internal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="messages")
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="ticket_messages")
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.USER)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ticket_messages"
        ordering = ("created_at",)


class Attachment(models.Model):
    class Visibility(models.TextChoices):
        USER_VISIBLE = "USER_VISIBLE", "User visible"
        INTERNAL = "INTERNAL", "Internal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="attachments")
    message = models.ForeignKey(
        TicketMessage,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="uploaded_attachments")
    file_name = models.CharField(max_length=255)
    storage_key = models.CharField(max_length=500, unique=True)
    content_type = models.CharField(max_length=150)
    file_size = models.PositiveBigIntegerField()
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.USER_VISIBLE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attachments"
        ordering = ("created_at",)


class FeedbackToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="feedback_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "feedback_tokens"

    @classmethod
    def issue_for_ticket(cls, ticket):
        now = timezone.now()
        expiry = now.replace(hour=17, minute=0, second=0, microsecond=0)
        if now >= expiry:
            expiry += timedelta(days=1)
        while expiry.weekday() >= 5:
            expiry += timedelta(days=1)
        raw_token = secrets.token_urlsafe(32)
        cls.objects.filter(ticket=ticket, used_at__isnull=True, revoked_at__isnull=True).update(revoked_at=now)
        cls.objects.create(ticket=ticket, token_hash=hashlib.sha256(raw_token.encode()).hexdigest(), expires_at=expiry)
        return raw_token

    @classmethod
    def find_valid(cls, raw_token):
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        return cls.objects.select_related("ticket").filter(
            token_hash=token_hash,
            used_at__isnull=True,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
            ticket__status=Ticket.Status.RESOLVED,
        ).first()


class Feedback(models.Model):
    class Rating(models.TextChoices):
        POSITIVE = "POSITIVE", "Positive"
        NEGATIVE = "NEGATIVE", "Negative"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, related_name="feedback")
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="feedback")
    token = models.OneToOneField(FeedbackToken, on_delete=models.PROTECT, related_name="feedback")
    rating = models.CharField(max_length=10, choices=Rating.choices)
    comment = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback"


class TicketSLAManager(models.Manager):
    def create_from_ticket(self, ticket):
        if ticket.priority == Ticket.Priority.P2:
            escalation_due_at = ticket.created_at + timedelta(minutes=10)
        elif ticket.priority == Ticket.Priority.P3:
            escalation_due_at = ticket.created_at + timedelta(minutes=60)
        else:
            escalation_due_at = None
        return self.create(ticket=ticket, escalation_due_at=escalation_due_at)


class TicketSLA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.OneToOneField(Ticket, on_delete=models.PROTECT, related_name="sla")
    escalation_due_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TicketSLAManager()

    class Meta:
        db_table = "ticket_slas"

    @property
    def is_unattended(self):
        return self.stopped_at is None and self.escalated_at is None


class Notification(models.Model):
    class Channel(models.TextChoices):
        IN_APP = "IN_APP", "In app"
        EMAIL = "EMAIL", "Email"
        WEBSOCKET = "WEBSOCKET", "WebSocket"

    class EventType(models.TextChoices):
        P1_TICKET_CREATED = "P1_TICKET_CREATED", "P1 ticket created"
        P2_ESCALATION = "P2_ESCALATION", "P2 escalation"
        P3_ESCALATION = "P3_ESCALATION", "P3 escalation"
        TICKET_ASSIGNED = "TICKET_ASSIGNED", "Ticket assigned"
        TICKET_TRANSFERRED = "TICKET_TRANSFERRED", "Ticket transferred"
        USER_MESSAGE = "USER_MESSAGE", "User message"
        AGENT_MESSAGE = "AGENT_MESSAGE", "Agent message"
        TICKET_RESOLVED = "TICKET_RESOLVED", "Ticket resolved"
        TICKET_REOPENED = "TICKET_REOPENED", "Ticket reopened"
        SYSTEM = "SYSTEM_NOTIFICATION", "System notification"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="notifications")
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, null=True, blank=True, related_name="notifications")
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.IN_APP)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    dedupe_key = models.CharField(max_length=255, unique=True, null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ("-created_at",)


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT, null=True, blank=True, related_name="audit_logs")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=100)
    field_name = models.CharField(max_length=100, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ("-created_at",)
