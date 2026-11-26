import mimetypes
import uuid
import xml.etree.ElementTree as ElementTree

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Exists, OuterRef, Q
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
from apps.tickets.models import (
    Attachment,
    Feedback,
    FeedbackToken,
    ProblemCategory,
    ProblemType,
    Ticket,
    TicketAssignment,
    TicketMessage,
)
from apps.tickets.serializers import (
    AdminProblemTypeSerializer,
    AttachmentSerializer,
    ClaimSerializer,
    FeedbackSerializer,
    ResolutionSerializer,
    TicketMessageSerializer,
    TicketSerializer,
    TransferSerializer,
)


MAX_ATTACHMENT_SIZE = settings.MAX_ATTACHMENT_SIZE
ALLOWED_ATTACHMENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _validate_image_content(upload, content_type):
    if content_type not in {"image/png", "image/jpeg", "image/svg+xml"}:
        return

    upload.seek(0)
    content = upload.read()
    upload.seek(0)
    if content_type == "image/png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValidationError({"file": "The uploaded file is not a valid PNG image."})
    if content_type == "image/jpeg" and not content.startswith(b"\xff\xd8\xff"):
        raise ValidationError({"file": "The uploaded file is not a valid JPEG image."})
    if content_type == "image/svg+xml":
        try:
            if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
                raise ValueError("External declarations are not allowed.")
            root = ElementTree.fromstring(content)
        except (ElementTree.ParseError, ValueError) as error:
            raise ValidationError({"file": "The uploaded file is not a safe SVG image."}) from error
        if not root.tag.lower().endswith("svg"):
            raise ValidationError({"file": "The uploaded file is not a valid SVG image."})
        for element in root.iter():
            local_name = element.tag.rsplit("}", 1)[-1].lower()
            if local_name in {"script", "foreignobject", "style"}:
                raise ValidationError({"file": "SVG images cannot contain scripts or embedded content."})
            for name, value in element.attrib.items():
                local_name = name.rsplit("}", 1)[-1].lower()
                if local_name.startswith("on") or local_name in {"href", "src"} and not value.startswith("#"):
                    raise ValidationError({"file": "SVG images cannot contain active or external content."})
                if local_name == "style" and "url(" in value.lower():
                    raise ValidationError({"file": "SVG images cannot load external content."})


class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = TicketSerializer

    def get_queryset(self):
        queryset = Ticket.objects.select_related("user", "station", "problem_type", "assignee")
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset.annotate(
                was_assigned_by_request_user=Exists(
                    TicketAssignment.objects.filter(ticket_id=OuterRef("pk"), agent=user)
                )
            )
        if user.role == User.Role.AGENT:
            station_ids = AgentStation.objects.filter(agent=user, is_active=True).values("station_id")
            return queryset.annotate(
                was_assigned_by_request_user=Exists(
                    TicketAssignment.objects.filter(ticket_id=OuterRef("pk"), agent=user)
                )
            ).filter(
                Q(station_id__in=station_ids) | Q(assignments__agent=user)
            ).distinct()
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
            ticket.was_assigned_by_request_user = True
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
            agent_id = serializer.validated_data.get("agent")
            agent = None
            if agent_id:
                try:
                    agent = User.objects.get(
                        pk=agent_id,
                        role__in=(User.Role.AGENT, User.Role.ADMIN),
                        is_active=True,
                    )
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
            raise ValidationError({"file": "Files must be 5 MB or smaller."})
        content_type = upload.content_type or mimetypes.guess_type(upload.name)[0]
        if content_type not in ALLOWED_ATTACHMENT_TYPES:
            raise ValidationError({"file": "This file type is not allowed."})
        _validate_image_content(upload, content_type)
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
        station_list = list(
            Station.objects.filter(is_active=True)
            .order_by("name")
            .values("id", "name", "code")
        )
        problem_types = ProblemType.objects.select_related("category").order_by(
            "category__sort_order", "sort_order", "name"
        )
        if request.user.role != User.Role.ADMIN:
            problem_types = problem_types.filter(is_active=True, category__is_active=True)
        officers = []
        if request.user.role in (User.Role.AGENT, User.Role.ADMIN):
            assignments = AgentStation.objects.filter(
                is_active=True,
                agent__is_active=True,
                agent__role__in=(User.Role.AGENT, User.Role.ADMIN),
                station__is_active=True,
            ).select_related("agent", "station").order_by("agent__first_name", "agent__username")
            officers = [
                {
                    "id": item.agent_id,
                    "name": item.agent.get_full_name() or item.agent.username,
                    "station": item.station_id,
                }
                for item in assignments
            ]
        return Response({
            "stations": station_list,
            "problem_types": [
                {
                    "id": item.id,
                    "name": item.name,
                    "category": item.category.name,
                    "category_id": item.category_id,
                    "description": item.description,
                    "is_active": item.is_active and item.category.is_active,
                }
                for item in problem_types
            ],
            "officers": officers,
        })


class AdminProblemTypeView(APIView):
    permission_classes = (IsAuthenticated,)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only administrators can manage the issue catalog.")

    def post(self, request):
        serializer = AdminProblemTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        problem_type = serializer.save()
        return Response(
            AdminProblemTypeSerializer(problem_type).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, pk):
        if set(request.data) != {"is_active"} or not isinstance(request.data["is_active"], bool):
            raise ValidationError({"is_active": "Provide a boolean active state."})
        problem_type = ProblemType.objects.select_related("category").get(pk=pk)
        problem_type.is_active = request.data["is_active"]
        problem_type.save(update_fields=("is_active", "updated_at"))
        return Response(AdminProblemTypeSerializer(problem_type).data)

    def delete(self, request, pk):
        problem_type = ProblemType.objects.select_related("category").get(pk=pk)
        problem_type.is_active = False
        problem_type.save(update_fields=("is_active", "updated_at"))
        return Response(AdminProblemTypeSerializer(problem_type).data)


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
            has_station_access = AgentStation.objects.filter(
                agent=request.user,
                station=attachment.ticket.station,
                is_active=True,
            ).exists()
            has_assignment_history = TicketAssignment.objects.filter(
                agent=request.user,
                ticket=attachment.ticket,
            ).exists()
            if not has_station_access and not has_assignment_history:
                raise PermissionDenied("You are not assigned to this ticket's station.")
        if not default_storage.exists(attachment.storage_key):
            return Response({"detail": "Attachment is unavailable."}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(
            default_storage.open(attachment.storage_key, "rb"),
            content_type=attachment.content_type,
        )
        from django.utils.http import content_disposition_header

        response["Content-Disposition"] = content_disposition_header(
            as_attachment=True,
            filename=attachment.file_name,
        )
        response["X-Content-Type-Options"] = "nosniff"
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
