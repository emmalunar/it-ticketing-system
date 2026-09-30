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

For backend development directly on Windows, copy `.env.example` to `.env` and configure the local service endpoints there. Docker PostgreSQL is published on host port `5433` to avoid conflicts with a PostgreSQL instance already using `5432`; Redis is on `6379`. Services running inside Compose use their Compose service names instead.

```bash
docker compose up -d postgres redis
```

```bash
cd backend
python manage.py check --settings=config.settings.dev
python manage.py migrate --settings=config.settings.dev
python manage.py runserver 0.0.0.0:8000
```

```bash
cd frontend
npm run dev
```

```bash
docker compose up -d postgres redis
```
