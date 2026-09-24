from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.stations.models import AgentStation
from apps.tickets.models import Notification, Ticket, TicketSLA


def _station_agents(station_id):
    return AgentStation.objects.filter(
        station_id=station_id,
        is_active=True,
        agent__is_active=True,
    ).values_list("agent_id", flat=True)


@shared_task
def notify_p1_ticket(ticket_id):
    ticket = Ticket.objects.select_related("station").get(pk=ticket_id)
    recipients = _station_agents(ticket.station_id)
    notifications = [
        Notification(
            recipient_id=agent_id,
            ticket=ticket,
            event_type=Notification.EventType.P1_TICKET_CREATED,
            title="P1 ticket created",
            message=f"P1 ticket {ticket.ticket_number} requires immediate attention.",
            dedupe_key=f"p1-created:{ticket.pk}:{agent_id}",
        )
        for agent_id in recipients
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)
    return len(notifications)


@shared_task
def process_due_escalations():
    now = timezone.now()
    sla_ids = list(
        TicketSLA.objects.filter(
            escalation_due_at__lte=now,
            escalated_at__isnull=True,
            stopped_at__isnull=True,
            ticket__status=Ticket.Status.QUEUED,
            ticket__priority__in=(Ticket.Priority.P2, Ticket.Priority.P3),
        ).values_list("id", flat=True)
    )
    escalated = 0
    for sla_id in sla_ids:
        with transaction.atomic():
            sla = TicketSLA.objects.select_for_update().select_related("ticket").get(pk=sla_id)
            if sla.escalated_at or sla.stopped_at or sla.ticket.status != Ticket.Status.QUEUED:
                continue
            event_type = (
                Notification.EventType.P2_ESCALATION
                if sla.ticket.priority == Ticket.Priority.P2
                else Notification.EventType.P3_ESCALATION
            )
            recipients = _station_agents(sla.ticket.station_id)
            Notification.objects.bulk_create(
                [
                    Notification(
                        recipient_id=agent_id,
                        ticket=sla.ticket,
                        event_type=event_type,
                        title=f"{sla.ticket.priority} ticket escalation",
                        message=f"Ticket {sla.ticket.ticket_number} has been unattended too long.",
                        dedupe_key=f"escalation:{sla.ticket.pk}:{agent_id}",
                    )
                    for agent_id in recipients
                ],
                ignore_conflicts=True,
            )
            sla.escalated_at = now
            sla.save(update_fields=("escalated_at", "updated_at"))
            escalated += 1
    return escalated