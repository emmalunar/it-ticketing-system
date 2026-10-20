import os
import sys

import django
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import DatabaseError, connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()


def main():
    if connection.vendor != "postgresql":
        raise SystemExit(
            f"Expected PostgreSQL, but Django is configured for {connection.vendor}."
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT current_database(), inet_server_port(), current_setting('server_version')"
            )
            database_name, server_port, server_version = cursor.fetchone()
    except DatabaseError:
        raise SystemExit(
            "Could not connect to PostgreSQL with the configured database settings. "
            "Check SUPABASE_DB_URL or the POSTGRES_* settings in .env."
        ) from None

    configured_database = settings.DATABASES["default"]["NAME"]
    if database_name != configured_database:
        raise SystemExit(
            f"Connected to database '{database_name}', but Django is configured "
            f"for '{configured_database}'."
        )

    try:
        call_command("migrate", check=True, interactive=False, verbosity=0)
    except CommandError as error:
        raise SystemExit(f"Database migrations are not up to date: {error}") from None

    print(
        f"PostgreSQL connection OK: database={database_name}, "
        f"host={settings.DATABASES['default']['HOST']}, "
        f"configured_port={settings.DATABASES['default']['PORT']}, "
        f"server_port={server_port}, server_version={server_version}."
    )
    print("Database migrations are up to date.")


if __name__ == "__main__":
    try:
        main()
    except DatabaseError:
        sys.exit(
            "PostgreSQL verification failed while checking the database. "
            "Check that the database is available and SUPABASE_DB_URL or the "
            "POSTGRES_* settings are correct."
        )
