# Development Roadmap

## 1. Purpose

This document defines the implementation sequence for the IT Ticketing System.

The purpose is to ensure that development is performed in a controlled order rather than attempting to build the entire application simultaneously.

The roadmap is designed for:

- Claude Code-assisted development
- Django backend development
- Next.js frontend development
- PostgreSQL database development
- Docker-based local development
- Automated testing
- Production deployment

The implementation must follow the previously approved project documentation.

---

# 2. Development Principles

Development must follow these principles:

1. Build the backend foundation before complex frontend features.
2. Implement the database model before dependent workflows.
3. Implement business rules centrally in Django.
4. Never make the frontend the source of business logic.
5. Build and test one major feature at a time.
6. Write tests alongside functionality.
7. Do not invent requirements that are not documented.
8. Keep the application modular.
9. Keep security requirements active throughout development.
10. Do not wait until the end to test the system.
11. Avoid premature optimisation.
12. Avoid unnecessary microservices.
13. Keep documentation synchronized with implementation.

---

# 3. Development Phases

The project should be implemented in the following broad phases:

```text
Phase 1   Project Foundation
    ↓
Phase 2   Database & Core Backend
    ↓
Phase 3   Authentication & Authorization
    ↓
Phase 4   Ticket Management
    ↓
Phase 5   Queue & Priority System
    ↓
Phase 6   Messaging & Attachments
    ↓
Phase 7   Notifications & SLA
    ↓
Phase 8   Feedback & Closure
    ↓
Phase 9   Administration
    ↓
Phase 10  Frontend
    ↓
Phase 11  Real-Time Features
    ↓
Phase 12  Reporting & Search
    ↓
Phase 13  Testing & Hardening
    ↓
Phase 14  Deployment
    ↓
Phase 15  Acceptance & Release
```

Some frontend work can occur in parallel with backend development once stable API contracts exist.

---

# 4. Phase 1 — Project Foundation

## Objectives

Create the initial development environment and repository structure.

### Tasks

- Initialise Git repository.
- Create project directories.
- Create documentation directory.
- Initialise Django backend.
- Initialise Next.js frontend.
- Configure TypeScript.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Configure Docker.
- Create Docker Compose development environment.
- Add PostgreSQL.
- Add Redis.
- Add MinIO.
- Configure environment variables.
- Create `.env.example`.
- Add `.gitignore`.
- Add initial README.
- Verify all development services start.

Expected structure:

```text
it-ticketing-system/
├── docs/
├── frontend/
├── backend/
├── infrastructure/
├── tests/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

### Acceptance Criteria

A developer can clone the repository and start the development environment without manually installing the database or Redis.

---

# 5. Phase 2 — Database and Core Backend

## Objectives

Build the Django application foundation and database models.

Create the Django applications:

```text
accounts
stations
tickets
messaging
notifications
feedback
reports
audit
```

Implement the core models defined in:

`07-database-design.md`

Initial models include:

```text
User
Station
AgentStation
ProblemCategory
ProblemType
Ticket
TicketAssignment
TicketTransfer
TicketMessage
Attachment
ResponseTemplate
Notification
Feedback
FeedbackToken
TicketEscalation
AuditLog
```

### Tasks

- Create Django models.
- Create relationships.
- Add UUID primary keys where specified.
- Add human-readable ticket numbers.
- Add database indexes.
- Add constraints.
- Add model validation.
- Create migrations.
- Run migrations.
- Create initial test data fixtures where useful.

### Acceptance Criteria

The complete core database schema can be created from an empty PostgreSQL database using Django migrations.

---

# 6. Phase 3 — Authentication and Authorization

## Objectives

Implement secure authentication and authorization.

Roles:

```text
USER
AGENT
ADMIN
```

Priority levels:

```text
P1
P2
P3
```

Roles and priority must remain separate.

### Tasks

- Implement login.
- Implement logout.
- Implement current-user endpoint.
- Implement session/token strategy.
- Implement password handling.
- Implement inactive-user protection.
- Implement consultant expiration.
- Implement role permissions.
- Implement station-based agent authorization.
- Implement object-level ticket authorization.
- Implement admin authorization.
- Implement search authorization.
- Implement WebSocket authorization foundation.

### Acceptance Criteria

A user cannot access tickets or resources outside their authorization scope, even when directly manipulating API requests.

---

# 7. Phase 4 — Ticket Management

## Objectives

Implement the core ticket lifecycle.

Ticket creation requires:

```text
Station
Problem Type
Description
```

Priority is inherited from the user.

### Implement

- Ticket creation.
- Ticket numbering.
- Station selection.
- Problem type selection.
- Priority inheritance.
- Initial status.
- Ticket retrieval.
- Ticket listing.
- Ticket details.
- Status transitions.
- Ticket assignment.
- Ticket claiming.
- Ticket reassignment.
- Ticket transfer.
- Ticket resolution.
- Ticket reopening.
- Ticket closure.

Statuses:

```text
QUEUED
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
REOPENED
```

### Important

Do not create a long-lived `ASSIGNED` status.

Assignment is represented separately from ticket status.

### Acceptance Criteria

A complete ticket can move through its valid lifecycle while invalid transitions are rejected by the backend.

---

# 8. Phase 5 — Queue and Priority System

## Objectives

Implement the station-specific queue.

### Rules

```text
P1 → Immediate handling, no normal queue

P2 → Queue + 10-minute unattended escalation

P3 → Queue + 60-minute unattended escalation
```

Queue ordering:

```text
P2 FIFO
   ↓
P3 FIFO
```

P1 is excluded.

### Tasks

- Implement queue query.
- Implement queue position.
- Implement queue summary.
- Implement station filtering.
- Implement priority ordering.
- Exclude inactive tickets.
- Exclude claimed/assigned tickets from waiting queue.
- Handle reopened tickets.
- Handle transferred tickets.
- Prevent unauthorized queue access.

### Important

Queue position must be calculated dynamically.

Do not permanently store:

```text
queue_position
```

as authoritative ticket state.

### Acceptance Criteria

Agents see only the appropriate station queue, and users see their applicable position without exposing information about unauthorized tickets.

---

# 9. Phase 6 — Messaging and Attachments

## Objectives

Implement communication between users and agents.

There are two distinct communication channels:

### User-facing

```text
USER_MESSAGE
AGENT_MESSAGE
PREDEFINED_NOTICE
SYSTEM_MESSAGE
```

### Internal

```text
INTERNAL_NOTE
```

Internal communication must never be exposed to users.

### Tasks

- Ticket message API.
- Internal message API.
- Message authorization.
- Message timestamps.
- Predefined notices.
- Response templates.
- Attachment uploads.
- Attachment metadata.
- MinIO integration.
- Secure attachment retrieval.

Initial predefined notices:

```text
I am coming.

Please bring your PC.
```

### Acceptance Criteria

Users can communicate with agents through their tickets while agents can communicate privately without exposing internal information.

---

# 10. Phase 7 — Notifications and SLA

## Objectives

Implement the notification and escalation system.

### P1

Immediate notification to active agents at the selected station.

### P2

Escalate after:

```text
10 minutes unattended
```

### P3

Escalate after:

```text
60 minutes unattended
```

### Tasks

- Notification model.
- Notification creation service.
- In-app notifications.
- Email notifications.
- Celery workers.
- Celery Beat.
- Redis task broker.
- Escalation processing.
- Notification retries.
- Idempotency.
- Notification history.
- SLA timestamps.

### Acceptance Criteria

Background processing correctly identifies unattended tickets without escalating tickets that have already been claimed or assigned.

---

# 11. Phase 8 — Feedback and Closure

## Objectives

Implement post-resolution feedback.

When a ticket is resolved:

```text
RESOLVED
   ↓
Generate feedback token
   ↓
Send feedback link
```

### Expiry

Before 5 PM GMT:

```text
Expiry = 5 PM GMT same applicable working day
```

After 5 PM GMT:

```text
Expiry = 5 PM GMT next applicable working day
```

### Feedback outcomes

```text
Positive → CLOSED

Negative → REOPENED
```

### Tasks

- Secure token generation.
- Token hashing.
- Expiration calculation.
- Feedback endpoint.
- One-time token usage.
- Positive feedback handling.
- Negative feedback handling.
- Reopening logic.
- Feedback notification.
- Feedback audit trail.

### Acceptance Criteria

A valid feedback token can be used once only and produces the correct ticket state transition.

---

# 12. Phase 9 — Administration

## Objectives

Implement the administrative interface.

Administrators should manage:

- Users.
- Roles.
- Priority levels where authorised.
- Consultant expiration.
- Stations.
- Agent-station assignments.
- Problem categories.
- Problem types.
- Response templates.
- Notification templates.
- Working-day configuration when implemented.
- Audit logs.

### Problem Catalogue

The initial configuration should include:

```text
Support
├── SAP
├── Microsoft Excel
├── Microsoft Word
├── HR System
└── Other Support

Laptop
├── Faulty Laptop (Software)
└── Faulty Laptop (Hardware)

Laptop Accessories
Printer
Scanner
Monitor
```

The catalogue must remain database-driven.

### Acceptance Criteria

Administrators can modify supported configuration without modifying application source code.

---

# 13. Phase 10 — Frontend

## Objectives

Build the user and agent interfaces using Next.js.

The frontend must consume the documented APIs rather than implementing business rules independently.

---

## 13.1 Login

Provide:

- Login form.
- Error handling.
- Session handling.
- Logout.

---

## 13.2 User Dashboard

Display:

- Active tickets.
- Ticket status.
- Ticket number.
- Priority.
- Station.
- Recent messages.
- Notifications.

---

## 13.3 Ticket Creation

The user should be able to:

1. Select station.
2. Select problem category/type.
3. Enter brief description.
4. Submit.

Priority should be displayed where useful but must not be editable by the user.

---

## 13.4 User Ticket View

Display:

- Ticket number.
- Status.
- Priority.
- Station.
- Problem type.
- Description.
- User-agent conversation.
- Attachments.
- Resolution information.
- Feedback option when applicable.

Internal messages must never appear.

---

## 13.5 Agent Dashboard

Display:

- Station queues.
- P1 alerts.
- P2 tickets.
- P3 tickets.
- Assigned tickets.
- Notifications.
- Escalations.

Agents assigned to multiple stations should be able to switch between authorised station views.

---

## 13.6 Agent Ticket View

Provide:

- Ticket details.
- Claim button.
- Assign/reassign.
- Transfer.
- Messaging.
- Internal notes.
- Predefined notices.
- Attachments.
- Status controls.
- Resolution controls.

---

## 13.7 Admin Dashboard

Provide:

- System overview.
- Ticket statistics.
- User management.
- Station management.
- Problem catalogue management.
- Template management.
- Reports.
- Audit logs.

---

# 14. Phase 11 — Real-Time Features

## Objectives

Implement Django Channels and WebSockets.

Required channels:

```text
/ws/notifications/
/ws/tickets/{id}/
/ws/queue/
```

### Real-Time Events

Examples:

```text
NEW_NOTIFICATION
TICKET_MESSAGE
TICKET_STATUS_CHANGED
TICKET_ASSIGNED
TICKET_TRANSFERRED
QUEUE_UPDATED
TICKET_ESCALATED
```

### Security

Every WebSocket connection must verify:

- Authentication.
- User identity.
- Ticket authorization.
- Station authorization where applicable.

### Acceptance Criteria

Unauthorized users cannot subscribe to another user's ticket or station information.

---

# 15. Phase 12 — Search and Reporting

## Objectives

Implement system-wide authorized search and reporting.

### Search

Users should only receive results they are authorized to see.

Search may support:

- Ticket number.
- Problem type.
- Status.
- Priority.
- Station.
- Date.
- User.
- Agent.

### Reports

Implement:

```text
Ticket summary
Agent performance
Station performance
Problem-type analysis
Priority analysis
Escalation analysis
Feedback analysis
```

Reports should use server-side queries and pagination where necessary.

---

# 16. Phase 13 — Testing and Hardening

Testing must occur throughout development, but this phase performs final comprehensive validation.

---

## 16.1 Backend Tests

Test:

- Models.
- Services.
- API endpoints.
- Permissions.
- Ticket workflow.
- Queue calculations.
- Assignment.
- Transfer.
- Notifications.
- Escalation.
- Feedback.
- Audit logging.

---

## 16.2 Security Tests

Test:

- Authentication.
- Authorization.
- IDOR prevention.
- Station access.
- Role escalation.
- Internal-message protection.
- WebSocket authorization.
- CSRF.
- XSS.
- File-upload security.
- Feedback-token security.
- Rate limiting.
- Input validation.

---

## 16.3 Concurrency Tests

Important operations require concurrency testing.

Examples:

```text
Two agents claim same ticket
Two agents transfer same ticket
Two feedback requests submitted simultaneously
Escalation occurs while ticket is being claimed
```

The expected result must be deterministic and safe.

---

## 16.4 Frontend Tests

Use Playwright for critical user journeys.

Examples:

```text
Login
Create ticket
View ticket
Send message
Agent claims ticket
Agent resolves ticket
User submits feedback
Negative feedback reopens ticket
```

---

## 16.5 Integration Tests

Verify communication between:

```text
Next.js
Django
PostgreSQL
Redis
Celery
MinIO
SMTP
WebSockets
```

---

# 17. Phase 14 — Deployment

Once the application passes development and staging tests:

### Prepare

- Ubuntu Server LTS.
- Docker.
- Docker Compose.
- Firewall.
- DNS.
- TLS.
- Production environment variables.

### Deploy

```text
PostgreSQL
Redis
MinIO
Django
Celery
Celery Beat
Next.js
Nginx
```

### Verify

- Health endpoints.
- Login.
- Ticket creation.
- Ticket workflow.
- Notifications.
- WebSockets.
- Attachments.
- Email.
- Backups.

---

# 18. Phase 15 — User Acceptance Testing

Before official launch, selected employees and IT agents should test the application.

Test groups should include:

- Standard users.
- P2 users.
- P1 users.
- IT agents.
- Administrators.

Test real-world scenarios.

---

# 19. Critical Acceptance Scenarios

The following scenarios must pass before production release.

### Scenario 1 — Standard Ticket

```text
P3 user
   ↓
Creates ticket
   ↓
Ticket enters station queue
   ↓
Agent claims ticket
   ↓
Unattended timer stops
   ↓
Agent resolves
   ↓
User provides positive feedback
   ↓
Ticket closes
```

---

### Scenario 2 — P2 Escalation

```text
P2 user
   ↓
Creates ticket
   ↓
No agent claims
   ↓
10 minutes
   ↓
Agents notified
```

---

### Scenario 3 — P3 Escalation

```text
P3 user
   ↓
Creates ticket
   ↓
No agent claims
   ↓
60 minutes
   ↓
Agents notified
```

---

### Scenario 4 — P1

```text
P1 user
   ↓
Creates ticket
   ↓
Immediate agent notification
   ↓
No normal queue
```

---

### Scenario 5 — Transfer

```text
Agent A
   ↓
Transfers ticket
   ↓
Station B
   ↓
Station B agents receive ticket
   ↓
Agent B handles ticket
```

---

### Scenario 6 — Negative Feedback

```text
Ticket resolved
   ↓
User submits negative feedback
   ↓
Ticket reopens
   ↓
Appropriate agents notified
   ↓
Ticket returns to active handling
```

---

### Scenario 7 — Feedback Expiry

```text
Ticket resolved after 5 PM GMT
   ↓
Feedback expiry calculated
   ↓
Next applicable working day
   ↓
5 PM GMT
   ↓
Token expires
```

---

# 20. Development Order Within Each Feature

Claude Code should generally implement features in this order:

```text
1. Model
2. Migration
3. Service/business logic
4. Authorization
5. API
6. Backend tests
7. Frontend API integration
8. Frontend UI
9. Frontend tests
10. Integration testing
```

This prevents UI development from becoming detached from backend rules.

---

# 21. Git Workflow

Development should use small, understandable commits.

Examples:

```text
feat: add station models
feat: implement ticket creation
feat: implement ticket claiming
feat: add station queue
feat: add p2 escalation
fix: prevent duplicate escalation
test: add feedback token tests
```

Avoid large commits containing unrelated features.

---

# 22. Feature Completion Rule

A feature is not considered complete merely because it works in the browser.

A feature is complete only when:

```text
Implementation
+
Authorization
+
Validation
+
Error handling
+
Tests
+
Documentation
```

are addressed.

---

# 23. Claude Code Working Method

Claude Code should work incrementally.

For each development task:

### Step 1

Read the relevant documentation.

### Step 2

Identify existing implementation.

### Step 3

Determine dependencies.

### Step 4

Implement the smallest complete change.

### Step 5

Run relevant tests.

### Step 6

Inspect failures.

### Step 7

Fix the implementation.

### Step 8

Run the broader test suite.

### Step 9

Update documentation if required.

### Step 10

Report what was changed.

Claude Code should not begin implementing a large feature without first understanding its documented dependencies.

---

# 24. Claude Code Must Ask Before Changing Requirements

If implementation reveals an ambiguity that cannot be resolved from the project documents, Claude Code should flag it rather than silently choosing a business rule.

For example:

```text
AMBIGUITY:
The documentation does not define whether X should happen when Y occurs.

PROPOSED OPTIONS:
A.
B.

RECOMMENDATION:
...

WAITING FOR DECISION.
```

It must not present an invented behaviour as an approved requirement.

---

# 25. Preventing Scope Creep

The MVP should focus on:

```text
Authentication
Users
Stations
Problem catalogue
Tickets
Priority
Queues
Assignment
Transfers
Messaging
Attachments
Notifications
Escalation
Feedback
Administration
Audit
Search
Reports
Security
Deployment
```

The following remain future enhancements:

```text
Active Directory / LDAP
SSO
AI assistance
Knowledge base
Asset management
Mobile application
Advanced analytics
External enterprise integrations
```

Future features should not unnecessarily delay the MVP.

---

# 26. Performance Principles

The implementation should:

- Use database filtering.
- Use pagination.
- Use indexes.
- Avoid unnecessary queries.
- Avoid loading entire queues into Python.
- Use background jobs for expensive work.
- Avoid blocking HTTP requests with email delivery.
- Use WebSockets only where useful.
- Avoid unnecessary frontend polling.

Performance optimisation should be based on actual bottlenecks rather than speculation.

---

# 27. Documentation Maintenance

When implementation changes an approved technical decision, update the appropriate document.

For example:

```text
Database change
    → 07-database-design.md

Architecture change
    → 08-system-architecture.md

API change
    → 09-api-specification.md

Security change
    → 10-security.md

Notification/SLA change
    → 11-notification-and-sla.md
```

Documentation and code must remain consistent.

---

# 28. MVP Definition of Done

The MVP is complete when an employee can:

```text
Login
  ↓
Select station
  ↓
Select problem type
  ↓
Describe problem
  ↓
Submit ticket
  ↓
Track ticket
  ↓
Communicate with IT
  ↓
Receive updates
  ↓
Receive resolution
  ↓
Submit feedback
```

And an agent can:

```text
Login
  ↓
See authorised station queue
  ↓
Receive priority notifications
  ↓
Claim/accept ticket
  ↓
Communicate with user
  ↓
Use predefined notices
  ↓
Add internal notes
  ↓
Transfer if necessary
  ↓
Resolve ticket
```

And an administrator can:

```text
Manage users
Manage stations
Manage problem types
Manage agents
Manage templates
Review tickets
Review audit records
View reports
```

---

# 29. Final Technical Validation

Before production release, verify:

```text
✓ Database migrations
✓ Authentication
✓ Authorization
✓ Ticket lifecycle
✓ Priority handling
✓ Queue calculations
✓ P1 notification
✓ P2 escalation
✓ P3 escalation
✓ Assignment
✓ Transfer
✓ Messaging
✓ Internal notes
✓ Attachments
✓ Feedback
✓ Feedback expiry
✓ Notification retries
✓ WebSockets
✓ Search
✓ Reports
✓ Audit logging
✓ Security controls
✓ Backups
✓ Restoration
✓ Docker deployment
✓ HTTPS
✓ Health checks
✓ Production logging
```

---

# 30. Release Checklist

Before going live:

### Code

- [ ] All code committed.
- [ ] Tests passing.
- [ ] No debugging code.
- [ ] No development credentials.
- [ ] No secrets committed.

### Database

- [ ] Migrations tested.
- [ ] Production backup created.
- [ ] Database indexes verified.
- [ ] Restoration tested.

### Security

- [ ] HTTPS configured.
- [ ] Firewall configured.
- [ ] Production `DEBUG=False`.
- [ ] Secrets secured.
- [ ] Authorization tested.
- [ ] File upload controls tested.
- [ ] WebSocket authorization tested.

### Infrastructure

- [ ] Docker services healthy.
- [ ] Nginx configured.
- [ ] PostgreSQL persistent.
- [ ] Redis functioning.
- [ ] Celery functioning.
- [ ] MinIO functioning.
- [ ] SMTP functioning.

### Application

- [ ] Login works.
- [ ] Ticket creation works.
- [ ] Queue works.
- [ ] P1 works.
- [ ] P2 escalation works.
- [ ] P3 escalation works.
- [ ] Messaging works.
- [ ] Resolution works.
- [ ] Feedback works.
- [ ] Administration works.

### Recovery

- [ ] Database backup verified.
- [ ] Attachment backup verified.
- [ ] Restoration procedure documented.

---

# 31. Recommended Implementation Sequence

The actual coding sequence should be:

```text
01. Repository setup
        ↓
02. Docker development environment
        ↓
03. Django configuration
        ↓
04. PostgreSQL configuration
        ↓
05. Core models
        ↓
06. Migrations
        ↓
07. Authentication
        ↓
08. Authorization
        ↓
09. Stations and agent assignments
        ↓
10. Problem catalogue
        ↓
11. Ticket creation
        ↓
12. Ticket lifecycle
        ↓
13. Assignment and transfer
        ↓
14. Queue
        ↓
15. Messaging
        ↓
16. Attachments
        ↓
17. Notifications
        ↓
18. Celery escalation
        ↓
19. Feedback
        ↓
20. Administration
        ↓
21. Frontend
        ↓
22. WebSockets
        ↓
23. Search
        ↓
24. Reports
        ↓
25. Security hardening
        ↓
26. Full testing
        ↓
27. Staging
        ↓
28. Production deployment
        ↓
29. User acceptance testing
        ↓
30. Production release
```

---

# 32. Final Instruction to Claude Code

The project documentation is the source of truth.

Claude Code must not treat implementation convenience as permission to change business behaviour.

Before implementing any major feature:

```text
Read
  ↓
Understand
  ↓
Plan
  ↓
Implement
  ↓
Test
  ↓
Verify
  ↓
Document
```

The application should be developed as a secure, maintainable modular monolith using:

```text
Next.js
+
Django
+
Django REST Framework
+
PostgreSQL
+
Redis
+
Celery
+
Django Channels
+
MinIO
+
Nginx
+
Docker Compose
```

The objective is not merely to produce a functioning prototype.

The objective is to produce a maintainable internal IT service platform that can safely evolve as the organisation grows.