import os

from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

if os.getenv("USE_SQLITE", "true").lower() == "true" or not os.getenv("POSTGRES_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "it_ticketing"),
            "USER": os.getenv("POSTGRES_USER", "it_ticketing"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "it_ticketing"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
