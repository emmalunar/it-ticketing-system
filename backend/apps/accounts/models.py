import uuid

from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models


class User(AbstractUser):
    class PriorityLevel(models.TextChoices):
        P1 = "P1", "P1"
        P2 = "P2", "P2"
        P3 = "P3", "P3"

    class Role(models.TextChoices):
        USER = "USER", "User"
        AGENT = "AGENT", "Agent"
        ADMIN = "ADMIN", "Admin"

    groups = models.ManyToManyField(
        Group,
        verbose_name="groups",
        blank=True,
        related_name="custom_user_groups",
        help_text="The groups this user belongs to.",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name="user permissions",
        blank=True,
        related_name="custom_user_permissions",
        help_text="Specific permissions for this user.",
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    priority_level = models.CharField(
        max_length=10,
        choices=PriorityLevel.choices,
        default=PriorityLevel.P3,
        db_index=True,
    )
    is_consultant = models.BooleanField(default=False)
    consultant_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_expired_consultant(self):
        if not self.is_consultant or not self.consultant_expires_at:
            return False
        from django.utils import timezone

        return timezone.now() > self.consultant_expires_at
