# Claude Code Instructions

## 1. Purpose

You are working on the development of an internal IT Ticketing System.

Your responsibility is to implement the system according to the project's approved documentation.

The objective is to produce a:

- Secure
- Maintainable
- Tested
- Well-structured
- Production-ready
- Modular

IT support platform for internal company use.

Do not treat this project as a quick prototype unless explicitly instructed to do so.

---

# 2. Source of Truth

Before making implementation decisions, read the relevant documents in:

```text
docs/
```

The project documentation is the primary source of truth.

The documents are:

```text
01-business-context.md
02-product-requirements.md
03-business-rules.md
04-user-roles-and-permissions.md
05-ticket-workflow.md
06-queue-and-priority-system.md
07-database-design.md
08-system-architecture.md
09-api-specification.md
10-security.md
11-notification-and-sla.md
12-deployment.md
13-development-roadmap.md
14-claude-code-instructions.md
```

Do not rely on assumptions when the documentation already defines the behaviour.

---

# 3. Document Authority

Use the documents according to their purpose.

| Document | Authority |
|---|---|
| Business Context | Organizational context |
| Product Requirements | Product functionality |
| Business Rules | Business behaviour |
| User Roles & Permissions | Authorization model |
| Ticket Workflow | Ticket lifecycle |
| Queue & Priority | Queue/SLA queue behaviour |
| Database Design | Data model |
| System Architecture | Technical architecture |
| API Specification | API contract |
| Security | Security requirements |
| Notification & SLA | Notifications and escalation |
| Deployment | Production infrastructure |
| Development Roadmap | Implementation order |
| Claude Code Instructions | Development behaviour |

If two documents appear to conflict, do not silently choose one.

Identify the conflict and ask for clarification unless the higher-level requirement is clearly established elsewhere.

---

# 4. Core Technology Stack

The approved stack is:

```text
Frontend:
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Backend:
Django
Django REST Framework

Database:
PostgreSQL

Real-Time:
Django Channels
WebSockets

Background Processing:
Celery
Redis

File Storage:
MinIO

Reverse Proxy:
Nginx

Deployment:
Docker Compose
Ubuntu Server LTS

Email:
Company SMTP

Testing:
Django/Pytest
Playwright

Source Control:
Git
```

Do not replace these technologies without explicit approval.

---

# 5. Architecture Principle

The system is a **modular monolith**.

Do not introduce microservices unless explicitly instructed.

The primary architecture is:

```text
Next.js
    ↓
Nginx
    ↓
Django / DRF
    ↓
PostgreSQL
    ↓
Redis / Celery
    ↓
MinIO
    ↓
Company SMTP
```

Django is the primary application and business-logic layer.

Next.js is the presentation layer.

PostgreSQL is the authoritative persistent data store.

Redis is infrastructure for queues, background processing, and real-time support.

---

# 6. Backend Is the Source of Truth

Business rules must be enforced by Django.

Never rely on the frontend to enforce:

- Permissions
- Priority
- Queue position
- Ticket ownership
- Station access
- Status transitions
- Feedback validity
- Escalation
- Assignment
- Transfer
- Administrative privileges

Frontend restrictions are for user experience only.

The backend must independently validate every sensitive operation.

---

# 7. Never Invent Business Rules

Do not invent:

- New priority levels
- New ticket statuses
- New escalation thresholds
- New roles
- New permissions
- New workflow states
- New queue rules
- New feedback behaviour
- New notification recipients
- New mandatory fields

If something is not defined and cannot reasonably be derived from the documentation:

```text
STOP
↓
Identify the ambiguity
↓
Explain the affected feature
↓
Propose reasonable options if useful
↓
Ask for a decision
```

Do not silently make the decision yourself.

---

# 8. User Roles

The system has three primary roles:

```text
USER
AGENT
ADMIN
```

Do not create a separate `CONSULTANT` role unless explicitly required.

Consultants are temporary users whose accounts have an expiration date.

Priority is independent of role:

```text
P1
P2
P3
```

Do not use priority as an authorization mechanism.

---

# 9. Priority Rules

The approved priorities are:

### P1

- Immediate handling.
- Immediate notification.
- Bypasses normal queue.
- No queue position.

### P2

- Station queue.
- 10-minute unattended escalation.

### P3

- Station queue.
- 60-minute unattended escalation.

Never allow users to submit their own priority.

The ticket priority must be derived from the user's priority at ticket creation.

Historical ticket priority should remain unchanged if the user's priority later changes.

---

# 10. Station Rules

Current stations include:

```text
Head Office
Babylove - Tesano
```

The application must not hard-code these stations into business logic.

Stations are database entities.

Agents are associated with stations through a many-to-many relationship.

An agent may eventually belong to multiple stations.

A ticket initially belongs to the station selected during creation.

Agents should only see tickets for stations they are authorized to handle.

Transfers can move tickets between stations.

---

# 11. Problem Catalogue

The initial problem catalogue is:

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

Do not hard-code these values throughout the frontend or backend.

Problem categories and problem types must be database-driven.

Administrators must be able to manage them.

---

# 12. Ticket Statuses

The approved statuses are:

```text
QUEUED
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
REOPENED
```

Do not introduce a long-lived `ASSIGNED` status.

Assignment is represented separately from ticket status.

`IN_PROGRESS` indicates that an agent has taken responsibility for the ticket.

Validate every status transition server-side.

---

# 13. Ticket Lifecycle

The primary lifecycle is:

```text
CREATE
   ↓
QUEUED
   ↓
IN_PROGRESS
   ↓
WAITING_USER ↔ IN_PROGRESS
   ↓
RESOLVED
   ↓
CLOSED
```

Negative feedback:

```text
RESOLVED
   ↓
REOPENED
   ↓
IN_PROGRESS
```

P1 bypasses the normal queue but follows the same general ticket lifecycle.

---

# 14. Claiming Tickets

Ticket claiming must be concurrency-safe.

If two agents attempt to claim the same ticket simultaneously:

```text
One succeeds.
The other receives a controlled conflict response.
```

Do not allow two agents to become the current responsible agent through a race condition.

Use appropriate PostgreSQL transactions and locking/conditional updates.

---

# 15. Queue Rules

The queue is station-specific.

For normal queues:

```text
P2
  ↓
P3
```

Within the same priority:

```text
FIFO
```

P1 tickets are never included in the normal queue.

Do not permanently store queue position as authoritative state.

Calculate queue position from current database state.

Do not load an entire queue into Python when a database query can perform the operation efficiently.

---

# 16. Unattended Definition

A ticket is unattended when:

- It is eligible for agent handling.
- It has not been claimed.
- It has not been assigned.
- It remains in an active waiting state.

Once an agent takes responsibility:

```text
Unattended timer → STOP
```

Do not interpret:

```text
Unresolved = Unattended
```

They are different concepts.

---

# 17. Escalation Rules

P2:

```text
10 minutes unattended
```

P3:

```text
60 minutes unattended
```

P1:

```text
Immediate notification
```

Escalation processing must re-check the current ticket state immediately before escalation.

If the ticket has already been claimed or assigned:

```text
Do not escalate.
```

Escalation must be idempotent.

Repeated Celery execution must not create duplicate escalations or duplicate escalation notifications.

---

# 18. Feedback Rules

When a ticket is resolved:

```text
Generate secure feedback token.
```

Feedback expiry is based on the working-day boundary.

Before 5 PM GMT:

```text
Expiry = 5 PM GMT on applicable working day.
```

After 5 PM GMT:

```text
Expiry = 5 PM GMT on next applicable working day.
```

Do not implement:

```text
resolution time + 9 hours
```

Feedback tokens must be:

- Secure
- Unpredictable
- Expirable
- One-time use

After successful feedback submission:

```text
Token → INVALID
```

Positive feedback:

```text
RESOLVED → CLOSED
```

Negative feedback:

```text
RESOLVED → REOPENED
```

---

# 19. Communication Rules

There are two separate communication contexts.

## User-Agent Communication

Visible to:

- User
- Relevant agents

## Internal Agent Communication

Visible only to authorized agents.

Internal communication must never appear:

- In the user interface
- In user API responses
- In user WebSockets
- In user email notifications
- In feedback pages

Check visibility at the backend serialization/query level.

Do not rely only on frontend filtering.

---

# 20. Predefined Notices

The initial predefined notices include:

```text
I am coming.

Please bring your PC.
```

These should be represented as configurable response templates.

When an agent sends a predefined notice:

1. Store it as a ticket message.
2. Mark it as user-visible.
3. Notify the user.
4. Deliver it through WebSocket where applicable.

---

# 21. Attachments

Attachments must be stored in MinIO.

PostgreSQL stores metadata.

Do not store large uploaded files directly in PostgreSQL.

Attachment access must be authorized through the application.

Validate:

- File type
- File size
- Ticket relationship
- User permissions

Never trust the original filename as a storage path.

---

# 22. Authentication

Authentication must be implemented securely.

Protect:

- Login
- Sessions/tokens
- Passwords
- Logout
- Inactive accounts
- Expired consultant accounts

Production authentication must use secure transport.

Do not create authentication shortcuts for convenience.

---

# 23. Authorization

Use deny-by-default authorization.

Every sensitive API operation must verify:

```text
Who is the user?
What role do they have?
What station(s) can they access?
What ticket can they access?
What operation are they attempting?
```

Authorization must exist at the backend.

Object-level authorization is mandatory.

---

# 24. Search Authorization

Search is not an authorization bypass.

A user searching for:

```text
IT-2026-000125
```

must not receive the ticket simply because they know its identifier.

Search results must apply the same access rules as normal ticket retrieval.

---

# 25. WebSocket Security

WebSocket endpoints require authentication and authorization.

Examples:

```text
/ws/notifications/
/ws/tickets/{id}/
/ws/queue/
```

Before subscribing a client to a ticket:

```text
Verify authentication.
Verify ticket authorization.
```

Before sending station queue information:

```text
Verify station authorization.
```

Never assume that WebSocket connections are trusted because they originate from the internal network.

---

# 26. API Design

The API base path is:

```text
/api/v1/
```

Follow the API specification in:

```text
09-api-specification.md
```

Do not rename endpoints unnecessarily.

Use structured error responses.

Validate input on the backend.

Use pagination for collection endpoints.

---

# 27. Service Layer

Important business operations should be implemented through clear service functions/classes rather than placing all logic inside views.

Recommended services include:

```text
create_ticket()
claim_ticket()
assign_ticket()
transfer_ticket()
send_ticket_message()
resolve_ticket()
generate_feedback_token()
submit_feedback()
reopen_ticket()
close_ticket()
```

Services should:

- Validate business rules.
- Enforce transactional boundaries.
- Create appropriate audit records.
- Trigger required events.

---

# 28. Database Rules

Use PostgreSQL.

Use Django models and migrations as the schema source of truth.

Important entities include:

```text
users
stations
agent_stations
problem_categories
problem_types
tickets
ticket_assignments
ticket_transfers
ticket_messages
attachments
response_templates
notifications
feedback
feedback_tokens
ticket_escalations
audit_logs
```

Use appropriate:

- Foreign keys
- Constraints
- Indexes
- Unique constraints
- Timestamps

---

# 29. Current State vs History

Do not attempt to reconstruct all current state only from historical records.

Store current state where necessary.

Also maintain historical records for important events.

Examples:

```text
Ticket.current_assignee
TicketAssignment history

Ticket.current_station
TicketTransfer history

Ticket.status
Audit history
```

This allows efficient current-state queries while preserving accountability.

---

# 30. Audit Logging

Important state-changing operations should create audit records.

Examples:

- Ticket creation.
- Claim.
- Assignment.
- Reassignment.
- Transfer.
- Status changes.
- Resolution.
- Reopening.
- Closure.
- Feedback.
- Administrative changes.
- Permission-sensitive changes.

Audit logs should be append-oriented.

Do not provide ordinary users with the ability to modify or delete audit records.

---

# 31. Notifications

Notifications must be persisted in PostgreSQL.

Use:

```text
PostgreSQL → notification history
Redis/Celery → background processing
WebSockets → real-time delivery
SMTP → email
```

Do not treat Redis as permanent notification storage.

---

# 32. Celery

Use Celery for background tasks such as:

- P2 escalation.
- P3 escalation.
- Email delivery.
- Notification retries.
- Scheduled maintenance.
- Feedback expiry processing.
- Other approved background operations.

Celery tasks must be safe to retry.

Do not make background tasks responsible for permanent state that exists only in Redis.

---

# 33. Idempotency

Critical operations must be idempotent where applicable.

Particularly:

```text
Escalation
Notifications
Feedback submission
Background processing
```

Repeated task execution must not corrupt data or create unintended duplicates.

---

# 34. Transactions

Use database transactions for critical state transitions.

Examples:

```text
Claim ticket
Transfer ticket
Resolve ticket
Submit feedback
Close ticket
```

Where concurrent access is possible, use appropriate PostgreSQL locking or conditional updates.

---

# 35. Frontend Rules

The Next.js frontend should:

- Display information.
- Collect input.
- Call APIs.
- Display errors.
- Provide navigation.
- Provide user interaction.
- Display real-time updates.

It must not become the authoritative business-logic layer.

Do not duplicate complex queue, SLA, authorization, or workflow logic in the frontend.

---

# 36. UI Development

Use:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

Prefer reusable components.

Avoid unnecessarily duplicating UI logic.

Use clear states for:

- Loading
- Empty
- Error
- Success
- Unauthorized
- Offline/reconnecting
- Submitting

---

# 37. Error Handling

Errors should be:

- Controlled
- Informative
- Safe
- Consistent

Do not expose:

- Stack traces
- Database errors
- SQL queries
- Internal file paths
- Secrets
- Internal infrastructure information

to ordinary users.

Detailed technical information belongs in controlled server logs.

---

# 38. Rate Limiting

Rate limiting should protect sensitive operations including:

- Login
- Feedback submission
- Search
- File uploads
- Sensitive administrative operations

Do not implement rate limiting in a way that makes normal internal use unnecessarily difficult.

---

# 39. Secrets

Never hard-code:

- Passwords
- API keys
- SMTP credentials
- Database credentials
- Django secret keys
- MinIO credentials
- Private keys

Use environment variables or an approved secret-management mechanism.

Never commit `.env` containing real secrets.

---

# 40. Environment Separation

Maintain separate environments:

```text
Development
Staging
Production
```

Never assume that development configuration is safe for production.

Production must have:

```text
DEBUG=False
```

Production secrets and data must remain separate from development.

---

# 41. Docker

The application should run through Docker Compose.

Required services include:

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

Use persistent volumes for stateful services.

Do not unnecessarily expose internal service ports.

---

# 42. Production

The production environment should use:

```text
Ubuntu Server LTS
Docker Compose
Nginx
HTTPS
PostgreSQL
Redis
Celery
MinIO
Company SMTP
```

Do not use Django's development server in production.

---

# 43. Database Backups

Implement automated PostgreSQL backups.

Backups must be stored separately from the production database/server where possible.

Backups should be tested through restoration.

Do not claim that a backup strategy is complete merely because a backup file exists.

---

# 44. File Backups

MinIO attachment data must also be included in the backup/recovery strategy.

Database restoration without attachment restoration is not a complete system recovery.

---

# 45. Testing Philosophy

A feature is not complete merely because it works manually.

A feature should include appropriate:

```text
Unit tests
Integration tests
API tests
Authorization tests
Workflow tests
Concurrency tests
Frontend tests
```

where applicable.

---

# 46. Required Test Scenarios

At minimum test:

### Authentication

- Valid login.
- Invalid login.
- Inactive user.
- Expired consultant.

### Authorization

- User accessing own ticket.
- User accessing another user's ticket.
- Agent accessing authorized station.
- Agent accessing unauthorized station.
- Admin access.

### Ticket

- Creation.
- Claim.
- Assignment.
- Transfer.
- Status changes.
- Resolution.
- Reopening.
- Closure.

### Queue

- P1 exclusion.
- P2 before P3.
- FIFO.
- Station isolation.
- Claimed-ticket removal.
- Reopened-ticket return.

### Escalation

- P2 at 10 minutes.
- P3 at 60 minutes.
- No escalation after claim.
- Duplicate task prevention.

### Feedback

- Valid token.
- Expired token.
- Used token.
- Positive feedback.
- Negative feedback.
- Correct 5 PM GMT expiry.

### Security

- IDOR prevention.
- Internal-message protection.
- File authorization.
- WebSocket authorization.
- Input validation.

---

# 47. Test-Driven Feature Completion

For significant backend functionality, use this workflow:

```text
Define expected behaviour
        ↓
Write tests
        ↓
Implement
        ↓
Run tests
        ↓
Fix failures
        ↓
Run broader suite
```

Do not simply disable or weaken tests to make the build pass.

---

# 48. Working with Existing Code

Before modifying an existing module:

1. Read the module.
2. Understand its responsibilities.
3. Identify dependencies.
4. Check existing tests.
5. Determine whether the requested change belongs there.
6. Make the smallest appropriate change.

Do not rewrite functioning modules unnecessarily.

---

# 49. Avoid Unnecessary Refactoring

Do not perform broad refactoring while implementing an unrelated feature.

For example:

```text
Task:
Implement ticket claiming.

Do not:
Rewrite the entire ticket application architecture.
```

If a refactor is genuinely necessary:

- Explain why.
- Keep its scope controlled.
- Test affected functionality.

---

# 50. Dependency Management

Do not add a package simply because it is convenient.

Before adding a dependency:

1. Determine whether existing tools can solve the problem.
2. Consider maintenance and security.
3. Consider compatibility with the approved architecture.
4. Add only when justified.

Document significant new dependencies.

---

# 51. Database Performance

Use:

- Appropriate indexes.
- Efficient queries.
- `select_related`.
- `prefetch_related`.
- Pagination.
- Database filtering.

Avoid:

```text
Load thousands of records
        ↓
Filter in Python
```

when PostgreSQL can perform the filtering.

Watch for N+1 query problems.

---

# 52. Queue Performance

Queue position calculations should be performed efficiently at the database level.

Do not create a permanent queue position field unless the architecture is explicitly changed.

Queue position is dynamic because tickets can:

- Be claimed.
- Be assigned.
- Be transferred.
- Be resolved.
- Be reopened.

---

# 53. Time Handling

Use timezone-aware timestamps.

Business calculations involving feedback expiry must use GMT/UTC.

Do not rely on the browser's local clock for SLA decisions.

The server/database must determine:

- Escalation timing.
- Feedback expiry.
- Ticket timestamps.
- Notification timing.

---

# 54. Logging

Use structured logging where practical.

Log useful operational information without exposing sensitive data.

Never log:

- Passwords.
- Secret keys.
- Raw feedback tokens.
- SMTP passwords.
- Database passwords.

---

# 55. Real-Time Failure Behaviour

WebSockets are an enhancement to normal application behaviour.

If WebSockets fail:

```text
The application must still function.
```

Persisted notifications and API requests remain authoritative.

Frontend clients should handle WebSocket disconnection and reconnection gracefully.

---

# 56. Email Failure Behaviour

Email delivery failure must not roll back a successful business operation.

Example:

```text
Resolve ticket
      ↓
Ticket successfully resolved
      ↓
Feedback token generated
      ↓
Email delivery fails
```

The ticket must remain resolved.

Email processing should retry separately.

---

# 57. Administration

Admin functionality must be protected by backend permissions.

Administrative configuration includes:

- Users.
- Stations.
- Agent-station relationships.
- Problem categories.
- Problem types.
- Response templates.
- Notification templates.
- Reports.
- Audit logs.

Do not expose administrative APIs to ordinary users.

---

# 58. Consultant Accounts

Consultant accounts are temporary.

The account should contain an expiration date.

At expiration:

```text
Account → Inactive
```

Historical records must remain.

The system must not delete historical tickets merely because a consultant account expires.

---

# 59. Data Deletion

Tickets should not normally be physically deleted.

Prefer:

```text
Inactive
Deactivated
Archived
```

where appropriate.

Historical and audit information should remain available according to organisational retention requirements.

---

# 60. Accessibility and Usability

The frontend should provide:

- Clear labels.
- Keyboard-friendly controls.
- Readable text.
- Appropriate form validation.
- Clear status indicators.
- Accessible interactive elements.
- Responsive layouts.

Do not sacrifice accessibility for visual complexity.

---

# 61. Documentation

When a technical or business decision changes, update the appropriate documentation.

Do not leave the code and documentation contradicting one another.

At the end of a significant task, report:

```text
What changed
Files changed
Tests added/updated
Tests run
Known limitations
Any documentation changes
```

---

# 62. Git Discipline

Use meaningful commits.

Examples:

```text
feat: implement ticket claiming
feat: add station-based queue
feat: add p2 escalation
fix: prevent duplicate escalation
test: add feedback token tests
refactor: extract ticket service
```

Avoid vague commits such as:

```text
update
changes
stuff
fixes
```

---

# 63. Implementation Workflow

For each task:

```text
1. Read relevant documentation.
2. Inspect current repository state.
3. Identify affected modules.
4. Explain implementation plan.
5. Implement.
6. Run targeted tests.
7. Fix failures.
8. Run broader tests.
9. Review security implications.
10. Review documentation impact.
11. Report completion.
```

For small, unambiguous changes, the planning explanation may be brief.

---

# 64. Large Features

For a large feature, divide implementation into smaller units.

Example:

```text
Notifications
    ↓
Notification model
    ↓
Notification service
    ↓
API
    ↓
Email task
    ↓
WebSocket delivery
    ↓
Frontend
    ↓
Tests
```

Do not implement an entire subsystem as one uncontrolled change.

---

# 65. Before Coding

Before beginning a major implementation task, inspect:

```text
Repository structure
Relevant documentation
Existing models
Existing services
Existing API endpoints
Existing tests
Environment configuration
```

Do not assume that a file or class exists simply because the specification mentions it.

---

# 66. After Coding

After implementation:

```text
Run formatter
Run linting
Run type checks
Run relevant tests
Run full tests where appropriate
Inspect migrations
Review API behaviour
Review authorization
Review logs/errors
```

Do not declare a feature complete without validation.

---

# 67. Migration Safety

Before applying a production migration:

1. Review migration SQL/operations.
2. Determine whether it is destructive.
3. Back up the database.
4. Test the migration in staging.
5. Apply it in production.
6. Verify application health.

Do not casually delete or rename production data.

---

# 68. API Backward Compatibility

Avoid breaking existing API consumers unnecessarily.

If a breaking API change is required:

- Identify affected endpoints.
- Update frontend consumers.
- Update tests.
- Update API documentation.
- Explain the migration.

Do not silently change response structures.

---

# 69. Security Review Before Completion

Before marking any feature complete, ask:

```text
Can another user access this?
Can an unauthorized agent access this?
Can the client manipulate this value?
Can this operation race?
Can this input cause injection?
Can this reveal internal information?
Can this leak through WebSockets?
Can this leak through email?
Can this attachment be accessed directly?
Can this action bypass audit logging?
```

Fix security problems before completion.

---

# 70. Do Not Trust the Client

Never trust client-supplied:

```text
priority
user_id
role
station authorization
assignee
ticket ownership
feedback validity
notification recipient
audit actor
```

Derive or verify these values on the server.

---

# 71. Internal Network Is Not a Security Boundary

The application runs primarily on an intranet.

However:

```text
Internal network ≠ automatically trusted
```

Authentication, authorization, encryption, input validation, and secure handling remain mandatory.

---

# 72. Production Readiness

Before declaring the application production-ready, verify:

```text
Authentication
Authorization
Ticket workflow
Queue
Priority
Assignment
Transfer
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
Testing
Backups
Restoration
Docker
Nginx
HTTPS
Health checks
Logging
```

---

# 73. No Silent Scope Expansion

Do not add future features during MVP development merely because they seem useful.

Future features include:

```text
Active Directory / LDAP
SSO
Knowledge base
Asset management
AI assistance
Mobile application
Advanced analytics
Enterprise integrations
```

These require separate approval.

---

# 74. Handling Ambiguity

When requirements are unclear, use this format:

```text
## Implementation Ambiguity

### Issue
[Describe the ambiguity.]

### Affected Area
[Feature/module.]

### Existing Documentation
[Relevant document/rule.]

### Options
1. [Option A]
2. [Option B]

### Recommended Option
[Recommendation and reason.]

### Decision Required
[What needs to be decided.]
```

Do not hide ambiguity inside implementation choices.

---

# 75. Handling Conflicting Requirements

If two requirements conflict:

```text
1. Identify both requirements.
2. Quote or reference their meaning accurately.
3. Explain the conflict.
4. Determine whether one clearly has higher authority.
5. If not, request a decision.
```

Do not silently reconcile contradictory requirements.

---

# 76. Code Quality

Code should favour:

- Clear naming.
- Small functions.
- Appropriate separation of concerns.
- Reusable services.
- Explicit validation.
- Predictable error handling.
- Type safety where applicable.
- Testability.

Avoid unnecessary abstraction.

Do not create complex frameworks inside the application to solve simple problems.

---

# 77. Final Rule

When uncertain, prioritize:

```text
Documented Requirement
        ↓
Business Rule
        ↓
Security
        ↓
Data Integrity
        ↓
Maintainability
        ↓
Performance
        ↓
Convenience
```

Convenience must never override a documented business rule or security requirement.

---

# 78. Final Claude Code Directive

You are not designing a new system from scratch every time you receive a task.

You are contributing to an existing, documented system.

Therefore:

```text
READ
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
TEST
  ↓
SECURE
  ↓
VERIFY
  ↓
DOCUMENT
```

Do not invent requirements.

Do not bypass security.

Do not move business logic into the frontend.

Do not expose internal information.

Do not introduce unnecessary architecture.

Do not silently change approved behaviour.

Do not declare functionality complete without testing.

The goal is a reliable internal IT Ticketing System that the organisation can actually operate, maintain, secure, and extend.

The documentation in `docs/` defines what the system should do.

Your job is to turn that specification into clean, tested, production-quality software.