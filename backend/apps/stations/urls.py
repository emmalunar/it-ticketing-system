from django.urls import path

from apps.stations.views import (
    AdminOfficerStationTransferView,
    AdminStationListCreateView,
)

urlpatterns = [
    path("admin/stations/", AdminStationListCreateView.as_view(), name="admin-stations"),
    path(
        "admin/stations/transfer-officer/",
        AdminOfficerStationTransferView.as_view(),
        name="admin-officer-station-transfer",
    ),
]
