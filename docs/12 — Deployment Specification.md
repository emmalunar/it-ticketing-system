# Deployment Specification

## 1. Purpose

This document defines the deployment environment, infrastructure, networking, configuration, security, backup, monitoring, and operational procedures for the IT Ticketing System.

The deployment is designed primarily for an internal company intranet.

The production architecture should be simple enough for the IT team to maintain while providing sufficient reliability, security, backup, and scalability.

---

# 2. Production Architecture

The recommended production environment is:

```text
                    Company Intranet
                          │
                          ▼
                    ┌──────────┐
                    │  Nginx   │
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        ┌───────────┐        ┌──────────────┐
        │  Next.js  │        │    Django    │
        │ Frontend  │        │  REST/API    │
        └───────────┘        └──────┬───────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
          PostgreSQL             Redis              MinIO
          Database            Queue/Cache        File Storage
                                    │
                                    ▼
                                  Celery
                                    │
                                    ▼
                               SMTP Server
```

Django Channels/WebSockets operate through the application infrastructure and Nginx.

---

# 3. Production Technology Stack

| Component | Technology |
|---|---|
| Server OS | Ubuntu Server LTS |
| Containerisation | Docker |
| Orchestration | Docker Compose |
| Reverse Proxy | Nginx |
| Frontend | Next.js |
| Backend | Django + Django REST Framework |
| Database | PostgreSQL |
| Background Jobs | Celery |
| Queue/Broker | Redis |
| Real-Time | Django Channels + WebSockets |
| File Storage | MinIO |
| Email | Company SMTP |
| Source Control | Git |
| TLS | HTTPS |
| Backup | Automated PostgreSQL + MinIO backups |

---

# 4. Deployment Model

The MVP should use a **single-server modular deployment** unless the organisation already provides suitable infrastructure for separating services.

The server hosts the application containers:

```text
nginx
frontend
backend
celery
celery-beat
postgres
redis
minio
```

This keeps deployment and maintenance manageable.

The architecture should nevertheless keep the services logically separated so that they can be moved to separate servers later if required.

---

# 5. Server Requirements

The initial production server should have sufficient resources for the expected internal user population.

A reasonable starting configuration is:

- 4+ CPU cores
- 8+ GB RAM
- 100+ GB SSD storage
- Reliable network connection
- Static internal IP address
- Reliable power
- Regular backup destination

Actual sizing should be adjusted after observing production usage.

Storage requirements should account for:

- PostgreSQL database
- Application logs
- Uploaded ticket attachments
- MinIO storage
- Backup files

---

# 6. Operating System

Production should use an actively supported **Ubuntu Server LTS** release.

The server should be:

- Dedicated to approved application workloads where possible.
- Updated regularly.
- Protected by a firewall.
- Accessible only through approved administrative channels.
- Configured with appropriate system users and permissions.
- Time-synchronised.

The production server should not be used as a general-purpose workstation.

---

# 7. Docker Deployment

Docker Compose should be used to define the production services.

A conceptual structure is:

```text
it-ticketing-system/
│
├── docker-compose.yml
├── .env
│
├── frontend/
├── backend/
├── infrastructure/
│   ├── nginx/
│   ├── postgres/
│   ├── redis/
│   └── minio/
│
└── backups/
```

The exact directory structure may evolve during implementation.

---

# 8. Docker Services

The production Compose file should define at least:

```text
nginx
frontend
backend
celery
celery-beat
postgres
redis
minio
```

Where practical, health checks should be defined for services.

Application services should depend on the availability of their required infrastructure.

However, `depends_on` must not be treated as a complete readiness mechanism.

Applications should gracefully retry connections when dependent services are temporarily unavailable.

---

# 9. Network Architecture

Internal Docker services should communicate over private Docker networks.

Example:

```text
             Nginx
              │
       ┌──────┴──────┐
       │             │
   Frontend       Backend
                     │
          ┌──────────┼──────────┐
          │          │          │
       Postgres    Redis      MinIO
                     │
                   Celery
```

PostgreSQL, Redis, and MinIO should not be directly exposed to ordinary employees.

Only required application entry points should be exposed.

---

# 10. Intranet Access

The application should be accessible through an internal hostname such as:

```text
https://it-support.company.internal
```

The actual hostname will depend on the organisation's internal DNS configuration.

Employees should not need to access:

```text
http://server-ip:8000
http://server-ip:3000
http://server-ip:5432
```

Instead:

```text
Employee Browser
       ↓
Internal DNS
       ↓
Nginx
       ↓
Application
```

---

# 11. DNS

The IT department should create an internal DNS record for the application.

Example:

```text
it-support.company.internal
        ↓
Internal server IP
```

The actual domain must follow the organisation's existing DNS conventions.

The application should not depend on users memorising an IP address.

---

# 12. Nginx

Nginx acts as the public-facing application gateway.

Responsibilities include:

- HTTPS termination.
- Routing frontend requests.
- Routing API requests.
- Routing WebSocket connections.
- Request size limits.
- Security headers.
- Access logging.
- Reverse proxying.
- Optional rate limiting.
- Serving static assets where appropriate.

Conceptually:

```text
/                  → Next.js
/api/              → Django
/ws/               → Django Channels
/media/            → controlled application/file access
```

Actual routing must follow the final frontend/backend implementation.

---

# 13. HTTPS/TLS

Production must use HTTPS.

Even though the system is internal, employee credentials, ticket information, messages, and attachments should not be transmitted over plain HTTP.

TLS certificates may be issued through the organisation's internal certificate authority or another approved certificate mechanism.

HTTP should redirect to HTTPS where appropriate.

---

# 14. Security Headers

Nginx and/or Django should provide appropriate security headers.

The final implementation should consider:

- Content Security Policy
- X-Content-Type-Options
- Referrer-Policy
- Strict-Transport-Security
- Frame protection
- Secure cookie configuration

Headers should be tested against the actual application's requirements to avoid breaking legitimate functionality.

---

# 15. Environment Variables

Secrets and environment-specific configuration must not be committed to Git.

Examples:

```text
DJANGO_SECRET_KEY
DJANGO_DEBUG
DATABASE_URL
POSTGRES_PASSWORD
REDIS_URL
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
SMTP_HOST
SMTP_USERNAME
SMTP_PASSWORD
ALLOWED_HOSTS
CSRF_TRUSTED_ORIGINS
```

Production secrets must be supplied through a secure environment/configuration mechanism.

---

# 16. `.env.example`

The repository should contain:

```text
.env.example
```

It should contain variable names and safe example values, but no real credentials.

Example:

```text
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=False
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SMTP_HOST=smtp.example.com
SMTP_USERNAME=...
SMTP_PASSWORD=...
```

The actual production `.env` must not be committed.

---

# 17. Django Production Configuration

Production Django configuration must include appropriate security settings.

At minimum:

```text
DEBUG = False
```

The application should define:

- Allowed hosts.
- Trusted origins.
- Secure cookies.
- HTTP-only cookies where applicable.
- CSRF protection.
- Secure session configuration.
- Appropriate static/media configuration.
- Production logging.

Django's development server must not be used as the production application server.

---

# 18. Application Server

Django should run behind an appropriate production application server.

The deployment should support:

```text
Nginx
   ↓
Gunicorn / ASGI-compatible application server
   ↓
Django
```

Because the system uses Django Channels/WebSockets, the final ASGI deployment must support both normal HTTP requests and WebSocket connections.

The selected ASGI server configuration should therefore be validated against the Channels deployment.

---

# 19. Celery Workers

Celery workers handle background tasks such as:

- Email notifications.
- Escalation processing.
- Scheduled tasks.
- Feedback token expiry checks.
- Other non-blocking operations.

The number of workers should be configurable.

For an initial deployment, a small number of workers should be sufficient.

The system should not create excessive worker processes without evidence that they are required.

---

# 20. Celery Beat

Celery Beat handles recurring scheduled tasks.

Examples:

```text
Every minute:
    Check unattended tickets

Periodically:
    Process notification retries

Periodically:
    Check expired feedback tokens

Daily:
    Perform scheduled maintenance tasks
```

Scheduled jobs must be idempotent.

---

# 21. Redis

Redis is used for:

- Celery task brokering.
- Celery result handling where required.
- Django Channels channel layers.
- Limited caching.

Redis must not be used as the authoritative store for:

- Tickets.
- Messages.
- Feedback.
- Audit records.
- Permanent notifications.

PostgreSQL remains authoritative.

---

# 22. PostgreSQL

PostgreSQL is the primary persistent database.

The database should:

- Use persistent storage.
- Have restricted network access.
- Require authentication.
- Use a dedicated database user.
- Have automated backups.
- Have tested restoration procedures.
- Be monitored for storage growth.

The application should use Django migrations to manage schema changes.

Manual production schema modifications should be avoided unless properly documented and approved.

---

# 23. Database Migrations

Database changes must be introduced through Django migrations.

Typical deployment:

```text
Pull new application version
        ↓
Run tests
        ↓
Run Django migrations
        ↓
Restart/reload services
        ↓
Run health checks
```

Migration files must be committed to Git.

Production database changes must not be made directly through undocumented SQL.

---

# 24. MinIO

MinIO stores ticket attachments.

PostgreSQL stores attachment metadata such as:

```text
file name
content type
file size
storage key
ticket
message
uploader
visibility
timestamp
```

The actual file is stored in MinIO.

MinIO should not be directly exposed to employees.

File access should pass through the application's authorization layer.

---

# 25. File Storage Security

Uploaded files must:

- Have controlled size limits.
- Have validated file types.
- Use generated storage keys.
- Avoid trusting client-provided paths.
- Be associated with authorised tickets/messages.
- Be inaccessible to unauthorised users.

Future deployments may introduce malware scanning.

---

# 26. SMTP

The system should use the organisation's approved SMTP service.

Django/Celery should use SMTP for:

- P1 alerts.
- P2 escalation emails.
- P3 escalation emails.
- Assignment notifications.
- Ticket updates.
- Feedback links.
- Other approved notifications.

SMTP credentials must be stored securely.

---

# 27. Email Failure Behaviour

Email failure must not cause critical ticket operations to fail.

For example:

```text
Agent resolves ticket
       ↓
Ticket becomes RESOLVED
       ↓
Feedback token generated
       ↓
Email queued
       ↓
SMTP unavailable
```

The ticket should remain resolved.

The email task should retry according to the notification policy.

---

# 28. Logging

The deployment should provide structured application logging.

Important logs include:

- Application errors.
- Authentication events.
- Authorization failures.
- Background task failures.
- Email failures.
- Database connection errors.
- WebSocket errors.
- Nginx errors.
- System/service failures.

Logs must not contain:

- Passwords.
- API secrets.
- Database passwords.
- Raw feedback tokens.
- Unnecessary sensitive ticket content.

---

# 29. Log Rotation

Logs must be rotated to prevent the server filesystem from becoming full.

Retention should be determined by organisational requirements.

The system should monitor available disk space.

Low disk space should generate an administrative warning where monitoring is available.

---

# 30. Health Checks

The deployment should provide health checks for major services.

Examples:

```text
/backend/health/
/backend/ready/
```

The health system should distinguish between:

### Liveness

Is the application process running?

### Readiness

Can the application communicate with required dependencies?

A database connection failure, for example, may make the application not ready even though the process itself is alive.

---

# 31. Service Startup Order

A conceptual startup process:

```text
PostgreSQL
Redis
MinIO
     ↓
Backend
     ↓
Celery / Celery Beat
     ↓
Frontend
     ↓
Nginx
```

The implementation must still handle services becoming ready at different times.

Applications should retry dependency connections rather than assuming that startup order guarantees readiness.

---

# 32. Deployment Process

The recommended deployment process is:

```text
1. Prepare release
        ↓
2. Run automated tests
        ↓
3. Back up production
        ↓
4. Pull approved version
        ↓
5. Build containers
        ↓
6. Apply migrations
        ↓
7. Restart/reload services
        ↓
8. Run health checks
        ↓
9. Verify application
        ↓
10. Monitor logs
```

Production deployments should be performed by authorised personnel.

---

# 33. Git and Version Control

Git is the source-control system.

The repository should contain:

```text
Application source
Documentation
Docker configuration
Migration files
Tests
Configuration templates
```

The repository must not contain:

```text
Production passwords
SMTP credentials
Database credentials
Private keys
Production .env
User data
Database dumps
Uploaded attachments
```

---

# 34. Release Versioning

Production releases should have identifiable versions.

For example:

```text
v1.0.0
v1.0.1
v1.1.0
```

The exact versioning strategy may follow the team's preferred convention.

Each production release should be traceable to a Git commit.

---

# 35. Backup Strategy

Backups are mandatory.

At minimum, the system should back up:

### PostgreSQL

- Database contents.
- Schema.
- Relevant configuration.

### MinIO

- Ticket attachment data.

### Configuration

- Approved deployment configuration required for recovery.

Backups should be stored separately from the production server.

---

# 36. Database Backup

Automated PostgreSQL backups should be scheduled.

A conceptual approach:

```text
Production PostgreSQL
        ↓
Automated backup
        ↓
Separate backup storage
```

Backups should be timestamped and retained according to organisational policy.

---

# 37. Backup Verification

A backup is not considered reliable simply because the backup command completed successfully.

The IT team should periodically perform restoration tests:

```text
Backup
  ↓
Restore to test environment
  ↓
Verify database integrity
  ↓
Verify application compatibility
```

Restoration testing should be documented.

---

# 38. Disaster Recovery

If the production server fails:

```text
New/Recovery Server
        ↓
Install Docker
        ↓
Deploy application
        ↓
Restore PostgreSQL
        ↓
Restore MinIO
        ↓
Restore configuration
        ↓
Start services
        ↓
Verify health
        ↓
Restore internal access
```

The organisation should establish formal recovery targets later.

---

# 39. Recovery Objectives

The system should eventually define:

### RPO

Maximum acceptable amount of data that could be lost.

### RTO

Maximum acceptable time required to restore service.

These values depend on organisational requirements and should be formally approved rather than invented by the application.

---

# 40. Firewall

The production server should use a firewall.

Only required ports should be accessible.

Typical external/internal application access may include:

```text
443  HTTPS
```

SSH access should be restricted to authorised administrators and, where possible, trusted management networks.

Database, Redis, and MinIO ports should not be exposed to ordinary employee networks.

---

# 41. Administrative Access

Server administration should use dedicated administrative accounts.

Where supported:

- Disable unnecessary default accounts.
- Use SSH keys.
- Restrict administrative access.
- Avoid sharing administrator credentials.
- Record important administrative actions.

Application administrator accounts are separate from operating-system administrator accounts.

---

# 42. Updates and Patching

The server and application dependencies should be updated regularly.

This includes:

- Ubuntu security updates.
- Docker updates.
- Python dependencies.
- Node.js dependencies.
- PostgreSQL security updates.
- Redis updates.
- Nginx updates.

Updates should be tested before deployment where practical.

---

# 43. Monitoring

The MVP should provide basic operational monitoring.

At minimum, administrators should be able to determine:

- Is the application running?
- Is PostgreSQL available?
- Is Redis available?
- Is Celery processing tasks?
- Is MinIO available?
- Are emails failing?
- Is disk space sufficient?
- Are error rates increasing?

More advanced monitoring can be added later.

---

# 44. Resource Monitoring

Monitor:

```text
CPU
RAM
Disk usage
Disk I/O
Network usage
Database size
Attachment storage
Celery queue
Application errors
```

Particular attention should be given to storage because attachments can grow significantly over time.

---

# 45. Application Shutdown

The application should support graceful shutdown.

When services are restarted:

- Existing requests should be allowed to complete where practical.
- Celery tasks should not be unnecessarily duplicated.
- Database transactions should complete or roll back safely.
- WebSocket clients should reconnect.
- Notifications should remain persisted.

---

# 46. Scaling Strategy

The initial deployment is a modular monolith.

If usage increases, components can be scaled independently.

For example:

```text
                    Load Balancer
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          Django #1             Django #2
              │                     │
              └──────────┬──────────┘
                         ▼
                    PostgreSQL
```

Celery workers can similarly be increased.

MinIO and PostgreSQL can eventually move to dedicated infrastructure.

The application should not be prematurely converted into microservices.

---

# 47. Development Environment

Developers should be able to run the system locally using Docker Desktop.

A local environment may include:

```text
Next.js
Django
PostgreSQL
Redis
Celery
MinIO
```

Development should use separate credentials and configuration from production.

Production data must not be copied into development environments unless properly authorised and protected.

---

# 48. Staging Environment

A staging environment is recommended before major production changes.

The deployment flow becomes:

```text
Development
    ↓
Automated Tests
    ↓
Staging
    ↓
Verification
    ↓
Production
```

Staging should resemble production as closely as practical.

---

# 49. Production Data Protection

Production data includes:

- Employee information.
- Ticket descriptions.
- Internal communications.
- Attachments.
- Audit records.
- Feedback.

Production data must not be casually copied, exported, or shared.

Access should follow the security and authorization rules defined in `10-security.md`.

---

# 50. Deployment Acceptance Criteria

The deployment is considered production-ready when:

- Ubuntu Server LTS is configured.
- Docker and Docker Compose are installed.
- All required services start correctly.
- Nginx routes traffic correctly.
- HTTPS works.
- Django runs through a production ASGI configuration.
- Next.js runs correctly.
- PostgreSQL is persistent and backed up.
- Redis is functioning.
- Celery workers process background tasks.
- Celery Beat executes scheduled tasks.
- Django Channels/WebSockets work through Nginx.
- MinIO stores and retrieves authorised attachments.
- SMTP notifications work.
- Health checks work.
- Logs are available and rotated.
- Firewall rules are configured.
- Production secrets are externalised.
- Database restoration has been tested.
- MinIO/attachment restoration has been tested.
- Unauthorized users cannot access internal services.
- Production configuration is separate from development configuration.

---

# 51. Claude Code Deployment Instructions

Claude Code must:

1. Follow this deployment specification.
2. Follow `08-system-architecture.md`.
3. Follow `10-security.md`.
4. Never commit production secrets.
5. Never hard-code credentials.
6. Never expose PostgreSQL, Redis, or MinIO unnecessarily.
7. Keep development and production configuration separate.
8. Use Docker Compose for the initial deployment.
9. Provide health checks where practical.
10. Ensure migrations are version controlled.
11. Ensure the application can restart safely.
12. Ensure background tasks are idempotent.
13. Ensure WebSockets work correctly behind Nginx.
14. Ensure uploaded files are stored in MinIO rather than PostgreSQL.
15. Ensure production Django uses `DEBUG=False`.
16. Ensure security-related settings are configurable through environment variables.
17. Never use Django's development server for production.
18. Provide documented deployment commands.
19. Provide documented backup and restoration commands.
20. Do not redesign the architecture into microservices without explicit approval.
21. Do not modify production infrastructure assumptions without documenting the change.
22. Flag any deployment dependency that has not been defined by the project documentation.
23. Test the deployment locally before declaring it complete.
24. Document any manual infrastructure configuration that cannot be automated.

---

# 52. Final Deployment Principle

The deployment should favour:

```text
Simplicity
   +
Security
   +
Recoverability
   +
Maintainability
   +
Controlled scalability
```

The system is an internal business application, so the deployment should not introduce unnecessary infrastructure complexity.

The preferred initial production model is therefore:

```text
Ubuntu Server
      ↓
Docker Compose
      ↓
Nginx
      ↓
Next.js + Django
      ↓
PostgreSQL + Redis + MinIO
      ↓
Celery / Celery Beat
      ↓
Company SMTP
```

This provides a practical foundation for the current organisation while leaving room for future growth.