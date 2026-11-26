import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BASE_DIR = PROJECT_ROOT / "backend"
load_dotenv(PROJECT_ROOT / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "channels",
    "apps.accounts",
    "apps.stations",
    "apps.tickets",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_HANDLERS = [
    "apps.tickets.upload_handlers.AttachmentSizeLimitUploadHandler",
    "django.core.files.uploadhandler.MemoryFileUploadHandler",
    "django.core.files.uploadhandler.TemporaryFileUploadHandler",
]
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


def _database_config_from_url(database_url):
    try:
        parsed_url = urlsplit(database_url.strip())
        port = parsed_url.port
    except ValueError as error:
        raise ImproperlyConfigured(
            "SUPABASE_DB_URL must be a valid PostgreSQL connection URI."
        ) from error

    if (
        parsed_url.scheme not in {"postgres", "postgresql"}
        or not parsed_url.hostname
        or not parsed_url.path.strip("/")
        or not parsed_url.username
        or parsed_url.password is None
    ):
        raise ImproperlyConfigured(
            "SUPABASE_DB_URL must include a PostgreSQL host, database, username, and password."
        )

    sslmode = parse_qs(parsed_url.query).get("sslmode", ["require"])[0]
    if sslmode not in {"require", "verify-ca", "verify-full"}:
        raise ImproperlyConfigured(
            "SUPABASE_DB_URL must use sslmode=require, verify-ca, or verify-full."
        )

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed_url.path.strip("/")),
        "USER": unquote(parsed_url.username),
        "PASSWORD": unquote(parsed_url.password),
        "HOST": parsed_url.hostname,
        "PORT": port or 5432,
        "OPTIONS": {"sslmode": sslmode},
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "CONN_HEALTH_CHECKS": True,
    }


def get_database_config(default_sqlite=True):
    supabase_database_url = os.getenv("SUPABASE_DB_URL")
    if supabase_database_url:
        return _database_config_from_url(supabase_database_url)

    if default_sqlite and os.getenv("USE_SQLITE", "true").lower() == "true":
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }

    if not default_sqlite:
        required_settings = ("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD")
        if any(not os.getenv(setting) for setting in required_settings):
            raise ImproperlyConfigured(
                "Set SUPABASE_DB_URL or provide POSTGRES_DB, POSTGRES_USER, and "
                "POSTGRES_PASSWORD for production."
            )

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "it_ticketing"),
        "USER": os.getenv("POSTGRES_USER", "it_ticketing"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "it_ticketing"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "300")),
        "CONN_HEALTH_CHECKS": False,
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

AUTH_USER_MODEL = "accounts.User"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

DATABASES = {"default": get_database_config()}

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = DEBUG
CELERY_BEAT_SCHEDULE = {
    "process-due-ticket-escalations": {
        "task": "apps.tickets.tasks.process_due_escalations",
        "schedule": 60.0,
    },
}
