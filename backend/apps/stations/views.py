from django.db import transaction
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.stations.serializers import OfficerStationTransferSerializer, StationSerializer


class AdminStationAccessMixin:
    permission_classes = (IsAuthenticated,)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only administrators can manage stations.")


class AdminStationListCreateView(AdminStationAccessMixin, ListCreateAPIView):
    serializer_class = StationSerializer
    queryset = Station.objects.order_by("name")


class AdminOfficerStationTransferView(AdminStationAccessMixin, APIView):
    def post(self, request):
        serializer = OfficerStationTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            officer = serializer.transfer()
        assignments = AgentStation.objects.filter(
            agent=officer,
            is_active=True,
        ).select_related("station").order_by("station__name")
        return Response({
            "officer": str(officer.pk),
            "stations": [
                {
                    "id": str(item.station_id),
                    "name": item.station.name,
                    "code": item.station.code,
                }
                for item in assignments
            ],
        })
