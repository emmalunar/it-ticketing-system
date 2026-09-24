import uuid

from django.db import models


class Station(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stations"

    def __str__(self):
        return self.name


class AgentStation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="agent_stations")
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="agent_stations")
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "agent_stations"
        unique_together = ("agent", "station", "is_active")

    def __str__(self):
        return f"{self.agent} -> {self.station}"
