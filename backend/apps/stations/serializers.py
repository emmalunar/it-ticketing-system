from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station


class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = ("id", "name", "code", "description", "is_active")
        read_only_fields = ("id",)


class OfficerStationTransferSerializer(serializers.Serializer):
    officer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            role__in=(User.Role.AGENT, User.Role.ADMIN),
        )
    )
    from_station = serializers.PrimaryKeyRelatedField(
        queryset=Station.objects.filter(is_active=True)
    )
    to_station = serializers.PrimaryKeyRelatedField(
        queryset=Station.objects.filter(is_active=True)
    )

    def validate(self, attrs):
        if attrs["from_station"] == attrs["to_station"]:
            raise serializers.ValidationError(
                {"to_station": "Choose a different destination station."}
            )
        return attrs

    def transfer(self):
        officer = User.objects.select_for_update().get(pk=self.validated_data["officer"].pk)
        from_station = self.validated_data["from_station"]
        to_station = self.validated_data["to_station"]
        assignment = AgentStation.objects.select_for_update().filter(
            agent=officer,
            station=from_station,
            is_active=True,
        ).first()
        if assignment is None:
            raise serializers.ValidationError(
                {"from_station": "The officer is not assigned to this station."}
            )

        assignment.is_active = False
        assignment.ended_at = timezone.now()
        assignment.save(update_fields=("is_active", "ended_at"))
        AgentStation.objects.get_or_create(
            agent=officer,
            station=to_station,
            is_active=True,
        )
        return officer
