# IT Ticketing System

Internal IT ticketing and support management system.

## Purpose

The system allows employees to report IT problems and enables the IT department to receive, route, prioritise, assign, communicate about, resolve and report on support tickets.

## Approved Technology Stack

* Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui
* Backend: Django, Django REST Framework
* Database: PostgreSQL
* Real-time: Django Channels
* Background processing: Celery
* Queue/cache: Redis
* File storage: MinIO
* Deployment: Docker Compose for local development; production deployment remains environment-dependent and portable across the company server setup

## Documentation

The `docs/` directory contains the authoritative project specifications.

Implementation should follow:

`01 → 02 → 03 → ... → 14`

## Development Status

Project documentation completed.

Implementation phase: Project Foundation.

## Local Foundation Commands

For backend development directly on Windows, copy `.env.example` to `.env` and configure the local service endpoints and secrets there. Generate separate secrets locally—for example, run `python -c "import secrets; print(secrets.token_urlsafe(50))"` for each password/key—and set a unique, non-default `MINIO_ROOT_USER` if you later enable object storage. Compose requires non-empty PostgreSQL settings. Docker service ports bind to localhost only: PostgreSQL is published on host port `5433` to avoid conflicts with a PostgreSQL instance already using `5432`, and Redis is on `6379`. Services running inside Compose use their Compose service names instead.

```bash
docker compose up -d postgres redis
```

MinIO is isolated behind the `object-storage` profile and is not currently available: the configured community image cannot be pulled, and the currently documented AIStor image requires a license. Leave the profile disabled until a supported object-storage image is selected.

```bash
cd backend
python verify_postgres.py
python manage.py check --settings=config.settings.dev
python manage.py migrate --settings=config.settings.dev
python manage.py runserver 0.0.0.0:8000
```

`verify_postgres.py` confirms Django is using PostgreSQL, checks that it connected to the configured database, and fails if migrations are unapplied. It checks the database without applying migrations.

### PostgreSQL backup and restore verification

With the PostgreSQL Compose service running, run this from the repository root:

```powershell
python backend\backup_postgres.py
```

This creates a timestamped custom-format backup under `.backups/`, restores it into a uniquely named temporary database, checks that Django migration records are present, and removes only that temporary database. The live database and its volume are not modified. `.backups/` is Git-ignored because backups may contain sensitive ticket and user data. This local backup is not a production backup until it is copied to protected off-host storage and a scheduled retention policy is established.

Compose provides only PostgreSQL, Redis, and MinIO; Django and Next.js run directly on Windows. When testing background tasks, start a Celery worker in another backend terminal with `celery -A config.celery worker --loglevel=info --pool=solo`; start Celery Beat separately when testing scheduled tasks with `celery -A config.celery beat --loglevel=info`.

```bash
cd frontend
npm run dev
```
