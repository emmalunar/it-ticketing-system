import argparse
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

import django
from django.conf import settings
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]


def run_compose(*arguments, stdin=None):
    command = ["docker", "compose", "exec", "-T", "postgres", *arguments]
    try:
        result = subprocess.run(command, stdin=stdin, capture_output=True, check=False)
    except FileNotFoundError:
        raise SystemExit("Docker is required to run the PostgreSQL backup.") from None

    if result.returncode:
        raise SystemExit(
            f"'{arguments[0]}' failed in the PostgreSQL container "
            f"(exit code {result.returncode}). Check Docker service logs."
        )
    return result.stdout.decode("utf-8").strip()


def create_backup(output_path, database, user):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "docker",
        "compose",
        "exec",
        "-T",
        "postgres",
        "pg_dump",
        "--no-password",
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "-U",
        user,
        "-d",
        database,
    ]

    try:
        backup_file = output_path.open("xb")
    except FileExistsError:
        raise SystemExit(f"Refusing to overwrite existing backup: {output_path}") from None

    with backup_file:
        try:
            result = subprocess.run(command, stdout=backup_file, stderr=subprocess.PIPE, check=False)
        except FileNotFoundError:
            output_path.unlink()
            raise SystemExit("Docker is required to run the PostgreSQL backup.") from None

    if result.returncode:
        output_path.unlink()
        raise SystemExit(
            f"pg_dump failed in the PostgreSQL container (exit code {result.returncode}). "
            "Check Docker service logs."
        )

    with output_path.open("rb") as backup_file:
        if output_path.stat().st_size == 0 or backup_file.read(5) != b"PGDMP":
            output_path.unlink()
            raise SystemExit("pg_dump did not produce a valid custom-format backup.")


def verify_restore(backup_path, user):
    restore_database = f"restore_check_{uuid.uuid4().hex[:16]}"
    run_compose("createdb", "--no-password", "-U", user, restore_database)

    try:
        with backup_path.open("rb") as backup_file:
            run_compose(
                "pg_restore",
                "--no-password",
                "--no-owner",
                "--no-acl",
                "-U",
                user,
                "-d",
                restore_database,
                stdin=backup_file,
            )

        migration_count = run_compose(
            "psql",
            "--no-password",
            "-X",
            "-U",
            user,
            "-d",
            restore_database,
            "-Atc",
            "SELECT count(*) FROM django_migrations",
        )
        if not migration_count.isdecimal() or int(migration_count) == 0:
            raise SystemExit("Restored database is missing Django migration records.")
    finally:
        run_compose("dropdb", "--no-password", "--force", "-U", user, restore_database)


def main():
    if connection.vendor != "postgresql":
        raise SystemExit("PostgreSQL backup requires Django to be configured for PostgreSQL.")

    database_settings = settings.DATABASES["default"]
    database = str(database_settings["NAME"])
    user = database_settings["USER"]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    parser = argparse.ArgumentParser(description="Back up PostgreSQL and verify a restore.")
    parser.add_argument(
        "--output",
        type=Path,
        default=REPOSITORY_ROOT / ".backups" / f"{database}_{timestamp}.dump",
        help="Custom-format backup output path (default: .backups/<database>_<UTC timestamp>.dump)",
    )
    args = parser.parse_args()
    output_path = args.output.resolve()

    create_backup(output_path, database, user)
    verify_restore(output_path, user)

    print(f"PostgreSQL backup created and restore-verified: {output_path}")
    print(f"Backup size: {output_path.stat().st_size} bytes.")
    print("The temporary restore database was removed; the live database was not modified.")


if __name__ == "__main__":
    main()
