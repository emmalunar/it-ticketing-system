import mimetypes
import uuid

from django.core.files.storage import default_storage
from django.http import FileResponse
from django.utils import timezone
from django.utils.text import get_valid_filename
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.queue import queue_position, queue_summary, queue_tickets
from apps.tickets.models import Attachment, Feedback, FeedbackToken, ProblemType, Ticket, TicketMessage
from apps.tickets.serializers import (
    AttachmentSerializer,
    ClaimSerializer,
    FeedbackSerializer,
    ResolutionSerializer,
    TicketMessageSerializer,
    TicketSerializer,
    TransferSerializer,
)


MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_TYPES = {
    "application/pdf",
    "image/gif",
    "image/jpeg",
    "image/png",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = TicketSerializer

    def get_queryset(self):
        queryset = Ticket.objects.select_related("user", "station", "problem_type", "assignee")
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.AGENT:
            station_ids = AgentStation.objects.filter(agent=user, is_active=True).values("station_id")
            return queryset.filter(station_id__in=station_ids)
        return queryset.filter(user=user)

    def perform_create(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="Tickets are retained for audit history. Administrators can archive them by closing the ticket.",
        )

    def _require_agent(self):
        if self.request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
            raise PermissionDenied("Only agents and administrators can perform this action.")

    def _require_admin(self):
        if self.request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only administrators can archive tickets.")

    @action(detail=True, methods=("post",))
    def archive(self, request, pk=None):
        self._require_admin()
        ticket = self.get_object()
        if ticket.status != Ticket.Status.CLOSED or ticket.closed_at is None:
            ticket.status = Ticket.Status.CLOSED
            ticket.closed_at = ticket.closed_at or timezone.now()
            ticket.save(update_fields=("status", "closed_at", "updated_at"))
        return Response(TicketSerializer(ticket, context={"request": request}).data)

    def _require_station_access(self, station):
        if self.request.user.role == User.Role.ADMIN:
            return
        if not AgentStation.objects.filter(agent=self.request.user, station=station, is_active=True).exists():
            raise PermissionDenied("You are not assigned to this station.")

    @action(detail=True, methods=("post",))
    def claim(self, request, pk=None):
        self._require_agent()
        ticket = self.get_object()
        serializer = ClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
            self._require_station_access(ticket.station)
            if ticket.assignee_id or ticket.status not in (Ticket.Status.QUEUED, Ticket.Status.REOPENED):
                raise ValidationError({
                    "code": "TICKET_NOT_CLAIMABLE",
                    "message": "This ticket is already assigned or is not available to claim.",
                })
            ticket.assign_to(request.user, assigned_by=request.user, reason=serializer.validated_data.get("reason", ""))
        return Response(TicketSerializer(ticket, context={"request": request}).data)

    @action(detail=True, methods=("get",), url_path="queue-position")
    def queue_position(self, request, pk=None):
        ticket = self.get_object()
        return Response({"data": queue_position(ticket)})

    @action(detail=True, methods=("post",))
    def transfer(self, request, pk=None):
        self._require_agent()
        ticket = self.get_object()
        with transaction.atomic():
            ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
            self._require_station_access(ticket.station)
            if ticket.status not in (
                Ticket.Status.QUEUED,
                Ticket.Status.IN_PROGRESS,
                Ticket.Status.WAITING_USER,
                Ticket.Status.REOPENED,
            ):
                raise ValidationError({
                    "code": "TICKET_NOT_TRANSFERABLE",
                    "message": "Only active tickets can be transferred.",
                })
            serializer = TransferSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            station = serializer.validated_data["station"]
            self._require_station_access(station)
            agent_id = serializer.validated_data.get("agent")
            agent = None
            if agent_id:
                try:
                    agent = User.objects.get(pk=agent_id, role=User.Role.AGENT, is_active=True)
                except User.DoesNotExist as exc:
                    raise ValidationError({"agent": "The selected agent is not active or does not exist."}) from exc
                if not AgentStation.objects.filter(agent=agent, station=station, is_active=True).exists():
                    raise ValidationError({"agent": "The selected agent is not assigned to the receiving station."})
            ticket.transfer_to(
                station,
                transferred_by=request.user,
                agent=agent,
                reason=serializer.validated_data.get("reason", ""),
            )
        return Response(TicketSerializer(ticket, context={"request": request}).data)

    @action(detail=True, methods=("post",))
    def resolve(self, request, pk=None):
        self._require_agent()
        ticket = self.get_object()
        self._require_station_access(ticket.station)
        serializer = ResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            raw_token = ticket.resolve(serializer.validated_data["resolution_notes"], resolved_by=request.user)
        return Response({"data": TicketSerializer(ticket, context={"request": request}).data, "feedback_token": raw_token})

    @action(detail=True, methods=("get", "post"), url_path="messages")
    def messages(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "GET":
            messages = ticket.messages.all()
            if request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
                messages = messages.filter(visibility=TicketMessage.Visibility.USER)
            return Response(TicketMessageSerializer(messages, many=True).data)
        if request.user.role == User.Role.USER and ticket.user_id != request.user.id:
            raise PermissionDenied("You cannot message this ticket.")
        serializer = TicketMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visibility = serializer.validated_data.get("visibility", TicketMessage.Visibility.USER)
        if visibility == TicketMessage.Visibility.INTERNAL and request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
            raise PermissionDenied("Only agents and administrators can create internal messages.")
        message = TicketMessage.objects.create(ticket=ticket, author=request.user, **serializer.validated_data)
        return Response(TicketMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=("post", "get"), url_path="attachments")
    def attachments(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "GET":
            attachments = ticket.attachments.all()
            if request.user.role == User.Role.USER:
                attachments = attachments.filter(visibility=Attachment.Visibility.USER_VISIBLE)
            return Response(AttachmentSerializer(attachments, many=True).data)
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": "A file is required."})
        if upload.size > MAX_ATTACHMENT_SIZE:
            raise ValidationError({"file": "Files must be 10 MB or smaller."})
        content_type = upload.content_type or mimetypes.guess_type(upload.name)[0]
        if content_type not in ALLOWED_ATTACHMENT_TYPES:
            raise ValidationError({"file": "This file type is not allowed."})
        if request.user.role == User.Role.USER and ticket.user_id != request.user.id:
            raise PermissionDenied("You cannot attach files to this ticket.")
        visibility = request.data.get("visibility", Attachment.Visibility.USER_VISIBLE)
        if visibility == Attachment.Visibility.INTERNAL and request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
            raise PermissionDenied("Only agents and administrators can create internal attachments.")
        message = None
        message_id = request.data.get("message")
        if message_id:
            message = ticket.messages.filter(pk=message_id).first()
            if message is None:
                raise ValidationError({"message": "The message does not belong to this ticket."})
            if message.visibility == TicketMessage.Visibility.INTERNAL and visibility != Attachment.Visibility.INTERNAL:
                raise ValidationError({"visibility": "An internal message requires an internal attachment."})
        safe_name = get_valid_filename(upload.name) or "attachment"
        storage_key = f"tickets/{ticket.pk}/{uuid.uuid4()}-{safe_name}"
        saved_key = default_storage.save(storage_key, upload)
        attachment = Attachment.objects.create(
            ticket=ticket,
            message=message,
            uploaded_by=request.user,
            file_name=upload.name,
            storage_key=saved_key,
            content_type=content_type,
            file_size=upload.size,
            visibility=visibility,
        )
        return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


class QueueView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
            raise PermissionDenied("Only agents and administrators can view station queues.")
        station_id = request.query_params.get("station")
        if request.user.role == User.Role.AGENT:
            station_ids = AgentStation.objects.filter(agent=request.user, is_active=True).values_list("station_id", flat=True)
            if station_id and station_id not in {str(value) for value in station_ids}:
                raise PermissionDenied("You are not assigned to this station.")
            if not station_id:
                station_id = list(station_ids)
        priority = request.query_params.get("priority")
        tickets = queue_tickets(station_id, priority=priority)
        return Response({
            "data": [
                {
                    "id": str(ticket.pk),
                    "ticket_number": ticket.ticket_number,
                    "station": {"id": str(ticket.station_id), "name": ticket.station.name},
                    "priority": ticket.priority,
                    "status": ticket.status,
                    "created_at": ticket.created_at,
                    "assignee": str(ticket.assignee_id) if ticket.assignee_id else None,
                }
                for ticket in tickets
            ]
        })


class TicketOptionsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        stations = request.user.agent_stations.filter(is_active=True).select_related("station")
        if request.user.role in (User.Role.USER, User.Role.ADMIN):
            station_list = list(
                Station.objects.filter(is_active=True)
                .order_by("name")
                .values("id", "name", "code")
            )
        else:
            station_list = [
                {"id": item.station_id, "name": item.station.name, "code": item.station.code}
                for item in stations.order_by("station__name")
            ]
        problem_types = ProblemType.objects.filter(is_active=True, category__is_active=True).select_related("category").order_by("category__sort_order", "sort_order", "name")
        return Response({
            "stations": station_list,
            "problem_types": [
                {"id": item.id, "name": item.name, "category": item.category.name}
                for item in problem_types
            ],
        })


class QueueSummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if request.user.role not in (User.Role.AGENT, User.Role.ADMIN):
            raise PermissionDenied("Only agents and administrators can view queue summaries.")
        station_id = request.query_params.get("station")
        if request.user.role == User.Role.AGENT:
            station_ids = AgentStation.objects.filter(agent=request.user, is_active=True).values_list("station_id", flat=True)
            if station_id and station_id not in {str(value) for value in station_ids}:
                raise PermissionDenied("You are not assigned to this station.")
            if not station_id:
                station_id = list(station_ids)
        return Response({"data": queue_summary(station_id)})


class AttachmentDownloadView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, attachment_id):
        attachment = Attachment.objects.select_related("ticket").filter(pk=attachment_id).first()
        if attachment is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == User.Role.USER and (
            attachment.ticket.user_id != request.user.id
            or attachment.visibility != Attachment.Visibility.USER_VISIBLE
        ):
            raise PermissionDenied("You cannot access this attachment.")
        if request.user.role == User.Role.AGENT:
            if not AgentStation.objects.filter(
                agent=request.user,
                station=attachment.ticket.station,
                is_active=True,
            ).exists():
                raise PermissionDenied("You are not assigned to this ticket's station.")
        if not default_storage.exists(attachment.storage_key):
            return Response({"detail": "Attachment is unavailable."}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(
            default_storage.open(attachment.storage_key, "rb"),
            content_type=attachment.content_type,
        )
        response["Content-Disposition"] = f'attachment; filename="{attachment.file_name}"'
        return response


class FeedbackView(APIView):
    permission_classes = ()

    def _token(self, raw_token):
        token = FeedbackToken.find_valid(raw_token)
        if token is None:
            raise ValidationError({"token": "This feedback link is invalid or expired."})
        return token

    def get(self, request, token):
        feedback_token = self._token(token)
        return Response({
            "data": {
                "ticket_number": feedback_token.ticket.ticket_number,
                "expires_at": feedback_token.expires_at,
                "eligible": True,
            }
        })

    def post(self, request, token):
        feedback_token = self._token(token)
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = feedback_token.ticket
        with transaction.atomic():
            feedback_token.used_at = timezone.now()
            feedback_token.save(update_fields=("used_at",))
            feedback = Feedback.objects.create(
                ticket=ticket,
                user=ticket.user,
                token=feedback_token,
                rating=serializer.validated_data["rating"],
                comment=serializer.validated_data.get("comment", ""),
            )
            if feedback.rating == Feedback.Rating.POSITIVE:
                ticket.close_from_feedback(feedback)
            else:
                ticket.reopen_from_feedback(feedback)
        return Response({"data": {"ticket_number": ticket.ticket_number, "status": ticket.status}})
