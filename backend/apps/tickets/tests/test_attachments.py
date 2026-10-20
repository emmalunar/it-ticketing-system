import pytest
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.stations.models import AgentStation, Station
from apps.tickets.models import Attachment, ProblemCategory, ProblemType, Ticket


@pytest.mark.django_db
class TestAttachmentApi:
    def setup_method(self):
        self.client = APIClient()
        self.station = Station.objects.create(name="Head Office", code="HO")
        category = ProblemCategory.objects.create(name="Support")
        self.problem_type = ProblemType.objects.create(category=category, name="HR System")
        self.user = User.objects.create_user(username="attachment-user", password="secretpass")
        self.other_user = User.objects.create_user(username="other-user", password="secretpass")
        self.agent = User.objects.create_user(
            username="attachment-agent",
            password="secretpass",
            role=User.Role.AGENT,
        )
        AgentStation.objects.create(agent=self.agent, station=self.station)
        self.ticket = Ticket.objects.create(
            user=self.user,
            station=self.station,
            problem_type=self.problem_type,
            description="Attachment issue",
        )

    def upload(self, user, visibility=None):
        self.client.force_authenticate(user)
        data = {"file": SimpleUploadedFile("notes.txt", b"support notes", content_type="text/plain")}
        if visibility:
            data["visibility"] = visibility
        return self.client.post(f"/api/v1/tickets/{self.ticket.pk}/attachments/", data, format="multipart")

    def test_user_can_upload_user_visible_attachment(self):
        response = self.upload(self.user)

        assert response.status_code == 201
        attachment = Attachment.objects.get()
        assert attachment.visibility == Attachment.Visibility.USER_VISIBLE
        assert attachment.file_size == len(b"support notes")
        assert default_storage.exists(attachment.storage_key)

    def test_user_can_upload_svg_image(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f"/api/v1/tickets/{self.ticket.pk}/attachments/",
            {
                "file": SimpleUploadedFile(
                    "diagram.svg",
                    b"<svg xmlns='http://www.w3.org/2000/svg'/>",
                    content_type="image/svg+xml",
                )
            },
            format="multipart",
        )

        assert response.status_code == 201
        assert Attachment.objects.get().content_type == "image/svg+xml"

    def test_user_cannot_upload_gif_image(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f"/api/v1/tickets/{self.ticket.pk}/attachments/",
            {
                "file": SimpleUploadedFile(
                    "animation.gif",
                    b"GIF89a",
                    content_type="image/gif",
                )
            },
            format="multipart",
        )

        assert response.status_code == 400
        assert not Attachment.objects.exists()

    def test_user_cannot_upload_internal_attachment(self):
        response = self.upload(self.user, Attachment.Visibility.INTERNAL)

        assert response.status_code == 403
        assert not Attachment.objects.exists()

    def test_user_cannot_download_another_users_attachment(self):
        self.client.force_authenticate(self.user)
        upload_response = self.upload(self.user)
        attachment_id = upload_response.data["id"]
        self.client.force_authenticate(self.other_user)

        response = self.client.get(f"/api/v1/attachments/{attachment_id}/")

        assert response.status_code == 403

    def test_agent_can_download_attachment_at_authorized_station(self):
        self.client.force_authenticate(self.agent)
        upload_response = self.upload(self.user)
        attachment_id = upload_response.data["id"]

        response = self.client.get(f"/api/v1/attachments/{attachment_id}/")

        assert response.status_code == 200
        assert b"".join(response.streaming_content) == b"support notes"
