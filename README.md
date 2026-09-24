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

`14-claude-code-instructions.md` provides the operational instructions for Claude Code.

## Development Status

Project documentation completed.

Implementation phase: Project Foundation.

## Local Foundation Commands

```bash
cd backend
python manage.py check --settings=config.settings.dev
python manage.py runserver 0.0.0.0:8000
```

```bash
cd frontend
npm run dev
```

```bash
docker compose up -d postgres redis minio
```
