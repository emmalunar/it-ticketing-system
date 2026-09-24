from rest_framework import serializers

from apps.accounts.models import User


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
