from rest_framework import serializers

from apps.stations.models import Station
from apps.tickets.models import Attachment, ProblemType, Ticket, TicketMessage


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "user",
            "station",
            "problem_type",
            "description",
            "status",
            "priority",
            "assignee",
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
    station = serializers.PrimaryKeyRelatedField(queryset=Station.objects.all())
    agent = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class ClaimSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class ResolutionSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField()


class FeedbackSerializer(serializers.Serializer):
    rating = serializers.ChoiceField(choices=("POSITIVE", "NEGATIVE"))
    comment = serializers.CharField(required=False, allow_blank=True)
