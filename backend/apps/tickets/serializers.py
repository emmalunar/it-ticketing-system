from rest_framework import serializers

from apps.stations.models import Station
from apps.tickets.models import Attachment, ProblemCategory, ProblemType, Ticket, TicketMessage


class TicketSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="station.name", read_only=True)
    problem_type_name = serializers.CharField(source="problem_type.name", read_only=True)
    requester_name = serializers.SerializerMethodField()
    requester_username = serializers.CharField(source="user.username", read_only=True)
    assignee_name = serializers.SerializerMethodField()
    assigned_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "user",
            "requester_name",
            "requester_username",
            "station",
            "station_name",
            "problem_type",
            "problem_type_name",
            "description",
            "status",
            "priority",
            "assignee",
            "assignee_name",
            "assigned_by_me",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        )
        read_only_fields = (
            "id",
            "ticket_number",
            "user",
            "status",
            "priority",
            "assignee",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        )

    def validate_station(self, station):
        if not station.is_active:
            raise serializers.ValidationError("The selected station is inactive.")
        return station

    def get_requester_name(self, ticket):
        return ticket.user.get_full_name() or ticket.user.username

    def get_assignee_name(self, ticket):
        if ticket.assignee_id is None:
            return None
        return ticket.assignee.get_full_name() or ticket.assignee.username

    def get_assigned_by_me(self, ticket):
        return bool(getattr(ticket, "was_assigned_by_request_user", False))

    def validate_problem_type(self, problem_type):
        if not problem_type.is_active:
            raise serializers.ValidationError("The selected problem type is inactive.")
        return problem_type

    def create(self, validated_data):
        return Ticket.objects.create(user=self.context["request"].user, **validated_data)


class TicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketMessage
        fields = ("id", "ticket", "author", "visibility", "body", "created_at", "updated_at")
        read_only_fields = ("id", "ticket", "author", "created_at", "updated_at")


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = (
            "id",
            "ticket",
            "message",
            "uploaded_by",
            "file_name",
            "content_type",
            "file_size",
            "visibility",
            "created_at",
        )
        read_only_fields = fields


class TransferSerializer(serializers.Serializer):
    station = serializers.PrimaryKeyRelatedField(queryset=Station.objects.filter(is_active=True))
    agent = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class ClaimSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class AdminProblemTypeSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_id = serializers.UUIDField(read_only=True)
    category_name = serializers.CharField(max_length=200, write_only=True)

    class Meta:
        model = ProblemType
        fields = (
            "id",
            "name",
            "category",
            "category_id",
            "category_name",
            "description",
            "is_active",
        )
        read_only_fields = ("id", "category", "category_id", "is_active")

    def validate(self, attrs):
        category_name = attrs.get("category_name", "IT Support")
        category = ProblemCategory.objects.filter(name=category_name).first()
        name = attrs.get("name")
        if category and name and ProblemType.objects.filter(category=category, name=name).exists():
            raise serializers.ValidationError({"name": "This issue type already exists in that category."})
        return attrs

    def create(self, validated_data):
        category_name = validated_data.pop("category_name", "IT Support")
        category, _ = ProblemCategory.objects.get_or_create(
            name=category_name,
            defaults={"is_active": True},
        )
        if not category.is_active:
            category.is_active = True
            category.save(update_fields=("is_active",))
        return ProblemType.objects.create(category=category, **validated_data)


class ResolutionSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField()


class FeedbackSerializer(serializers.Serializer):
    rating = serializers.ChoiceField(choices=("POSITIVE", "NEGATIVE"))
    comment = serializers.CharField(required=False, allow_blank=True)
