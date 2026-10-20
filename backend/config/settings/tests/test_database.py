import pytest
from django.core.exceptions import ImproperlyConfigured

from config.settings.base import _database_config_from_url, get_database_config


def test_supabase_database_url_decodes_credentials_and_requires_tls():
    config = _database_config_from_url(
        "postgresql://app%40user:p%40ss%3Aword@db.example.supabase.co:6543/postgres"
    )

    assert config == {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "postgres",
        "USER": "app@user",
        "PASSWORD": "p@ss:word",
        "HOST": "db.example.supabase.co",
        "PORT": 6543,
        "OPTIONS": {"sslmode": "require"},
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }


def test_supabase_database_url_honors_secure_sslmode():
    config = _database_config_from_url(
        "postgres://app:secret@db.example.supabase.co/postgres?sslmode=verify-full"
    )

    assert config["OPTIONS"] == {"sslmode": "verify-full"}
    assert config["PORT"] == 5432


@pytest.mark.parametrize(
    "database_url",
    [
        "https://app:secret@db.example.supabase.co/postgres",
        "postgres://app:secret@/postgres",
        "postgres://app@db.example.supabase.co/postgres",
        "postgres://app:secret@db.example.supabase.co/postgres?sslmode=disable",
        "postgres://app:secret@db.example.supabase.co:bad-port/postgres",
    ],
)
def test_invalid_supabase_database_urls_are_rejected(database_url):
    with pytest.raises(ImproperlyConfigured):
        _database_config_from_url(database_url)


def test_supabase_url_takes_precedence_over_sqlite(monkeypatch):
    monkeypatch.setenv(
        "SUPABASE_DB_URL",
        "postgres://app:secret@db.example.supabase.co/postgres",
    )
    monkeypatch.setenv("USE_SQLITE", "true")

    assert get_database_config()["ENGINE"] == "django.db.backends.postgresql"


def test_production_requires_database_credentials_without_supabase_url(monkeypatch):
    monkeypatch.delenv("SUPABASE_DB_URL", raising=False)
    monkeypatch.delenv("POSTGRES_DB", raising=False)
    monkeypatch.delenv("POSTGRES_USER", raising=False)
    monkeypatch.delenv("POSTGRES_PASSWORD", raising=False)

    with pytest.raises(ImproperlyConfigured, match="SUPABASE_DB_URL"):
        get_database_config(default_sqlite=False)
