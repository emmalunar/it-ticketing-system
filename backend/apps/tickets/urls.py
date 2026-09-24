from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tickets.views import AttachmentDownloadView, FeedbackView, QueueSummaryView, QueueView, TicketViewSet

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = router.urls
urlpatterns += [
	path("queue/", QueueView.as_view(), name="queue"),
	path("queue/summary/", QueueSummaryView.as_view(), name="queue-summary"),
	path("attachments/<uuid:attachment_id>/", AttachmentDownloadView.as_view(), name="attachment-download"),
	path("feedback/<str:token>/", FeedbackView.as_view(), name="feedback"),
]
