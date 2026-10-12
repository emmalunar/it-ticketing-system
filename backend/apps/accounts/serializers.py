from rest_framework import serializers
from django.utils import timezone

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station


class StationSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    code = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    stations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "priority_level",
            "is_active",
            "is_consultant",
            "consultant_expires_at",
            "stations",
        )
        read_only_fields = fields

    def get_stations(self, user):
        return [
            {
                "id": assignment["station_id"],
                "name": assignment["station__name"],
                "code": assignment["station__code"],
            }
            for assignment in user.agent_stations.filter(is_active=True).values(
                "station_id",
                "station__name",
                "station__code",
            )
        ]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    station_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Station.objects.filter(is_active=True),
        required=False,
        source="stations",
    )
    stations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "role",
            "priority_level",
            "is_active",
            "stations",
            "station_ids",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "stations")

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A password is required when creating an account."})
        role = attrs.get("role", getattr(self.instance, "role", User.Role.USER))
        if role not in (User.Role.AGENT, User.Role.ADMIN) and attrs.get("stations"):
            raise serializers.ValidationError({"station_ids": "Only IT officers and administrators can be assigned to stations."})
        return attrs

    def get_stations(self, user):
        return [
            {"id": item.station_id, "name": item.station.name, "code": item.station.code}
            for item in user.agent_stations.filter(is_active=True).select_related("station")
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        stations = validated_data.pop("stations", [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        self._sync_stations(user, stations)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        stations = validated_data.pop("stations", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        if stations is not None or instance.role not in (User.Role.AGENT, User.Role.ADMIN):
            self._sync_stations(instance, stations or [])
        return instance

    @staticmethod
    def _sync_stations(user, stations):
        active_assignments = user.agent_stations.filter(is_active=True)
        selected_ids = {station.pk for station in stations}
        for assignment in active_assignments:
            if assignment.station_id not in selected_ids:
                assignment.is_active = False
                assignment.ended_at = timezone.now()
                assignment.save(update_fields=("is_active", "ended_at"))
        for station in stations:
            AgentStation.objects.get_or_create(agent=user, station=station, is_active=True)
