from django.conf import settings
from django.core.files.uploadhandler import FileUploadHandler, StopUpload


class AttachmentSizeLimitUploadHandler(FileUploadHandler):
    def new_file(self, *args, **kwargs):
        super().new_file(*args, **kwargs)
        self.uploaded_size = 0

    def receive_data_chunk(self, raw_data, start):
        self.uploaded_size += len(raw_data)
        if self.uploaded_size > settings.MAX_ATTACHMENT_SIZE:
            raise StopUpload(connection_reset=False)
        return raw_data

    def file_complete(self, file_size):
        return None
