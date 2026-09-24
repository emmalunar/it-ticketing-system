from django.db.models import QuerySet

from apps.tickets.models import Ticket


QUEUE_STATUSES = (Ticket.Status.QUEUED,)
NORMAL_PRIORITIES = (Ticket.Priority.P2, Ticket.Priority.P3)
ACTIVE_STATUSES = (
    Ticket.Status.QUEUED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.WAITING_USER,
    Ticket.Status.REOPENED,
)


def normal_queue(station_id=None) -> QuerySet:
    queryset = Ticket.objects.filter(
        status__in=QUEUE_STATUSES,
        priority__in=NORMAL_PRIORITIES,
    ).select_related("station", "problem_type", "assignee")
    if station_id:
          lookup = "station_id__in" if isinstance(station_id, (list, tuple)) else "station_id"
          queryset = queryset.filter(**{lookup: station_id})
    return queryset.order_by("priority", "created_at")


def queue_tickets(station_id=None, priority=None) -> QuerySet:
    queryset = normal_queue(station_id)
    if priority:
        queryset = queryset.filter(priority=priority)
    return queryset


def queue_position(ticket) -> dict:
    if ticket.priority == Ticket.Priority.P1:
        return {
            "ticket_id": str(ticket.pk),
            "queue_applicable": False,
            "tickets_ahead": None,
            "position": None,
            "reason": "P1 tickets bypass the normal queue.",
        }
    if ticket.priority not in NORMAL_PRIORITIES or ticket.status not in QUEUE_STATUSES:
        return {
            "ticket_id": str(ticket.pk),
            "queue_applicable": False,
            "tickets_ahead": None,
            "position": None,
            "reason": "This ticket is not currently waiting in the normal queue.",
        }
    tickets_ahead = queue_tickets(ticket.station_id).filter(
        priority__lt=ticket.priority,
    ).count()
    tickets_ahead += queue_tickets(ticket.station_id, priority=ticket.priority).filter(
        created_at__lt=ticket.created_at,
    ).count()
    return {
        "ticket_id": str(ticket.pk),
        "queue_applicable": True,
        "tickets_ahead": tickets_ahead,
        "position": tickets_ahead + 1,
    }


def queue_summary(station_id=None) -> dict:
    queryset = Ticket.objects.filter(
        status__in=ACTIVE_STATUSES,
    )
    if station_id:
           lookup = "station_id__in" if isinstance(station_id, (list, tuple)) else "station_id"
           queryset = queryset.filter(**{lookup: station_id})
    return {
        "p1_count": queryset.filter(priority=Ticket.Priority.P1).count(),
        "p2_count": queryset.filter(priority=Ticket.Priority.P2, status=Ticket.Status.QUEUED).count(),
        "p3_count": queryset.filter(priority=Ticket.Priority.P3, status=Ticket.Status.QUEUED).count(),
    }
