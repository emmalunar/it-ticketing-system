# 07 — Database Design

## 1. Purpose

This document defines the database architecture for the IT Ticketing System.

The database must support:

- User accounts and roles.
- User priority levels.
- Stations.
- Agent-to-station assignments.
- Tickets.
- Configurable problem types.
- Ticket assignments.
- Ticket transfers.
- User-agent conversations.
- Internal agent communication.
- Predefined response templates.
- Notifications.
- Feedback.
- Feedback tokens.
- Escalations.
- Audit history.
- Attachments.
- Reporting.
- Future expansion.

The production database will use **PostgreSQL**.

---

# 2. Database Design Principles

The database should follow these principles:

### 2.1 Normalization

Data should be stored in logically separate entities rather than duplicated unnecessarily.

### 2.2 Referential Integrity

Foreign keys should enforce valid relationships.

### 2.3 Historical Integrity

Important historical events must not be overwritten simply because the current state changes.

### 2.4 Configuration Over Hard-Coding

Stations, problem types, response templates, and similar configurable information should be database-driven.

### 2.5 Auditability

Important business actions must leave an auditable record.

### 2.6 Soft Deactivation

Entities such as users, stations, and problem types should normally be deactivated rather than physically deleted.

### 2.7 Secure Data Access

Database records must still be protected by application-level authorization.

---

# 3. High-Level Entity Model

The core relationship can be represented as:

```text
USER
 │
 ├───────────────┐
 ↓               ↓
PRIORITY       STATION
 │               │
 └──────┐   ┌────┘
        ↓   ↓
       TICKET
         │
 ┌───────┼────────┬───────────────┐
 ↓       ↓        ↓               ↓
ASSIGNMENT TRANSFER MESSAGE    ATTACHMENT
                  │
          ┌───────┴───────┐
          ↓               ↓
       USER-FACING     INTERNAL
        MESSAGE        MESSAGE

TICKET
 │
 ├── FEEDBACK
 ├── ESCALATION
 ├── NOTIFICATION
 └── AUDIT EVENT
```

---

# 4. Database Naming Convention

Recommended conventions:

- PostgreSQL database: `it_ticketing`
- Table names: lowercase snake_case.
- Primary keys: UUID.
- Foreign keys: `<entity>_id`.
- Timestamps: UTC.
- Boolean fields: `is_*`.
- Enumeration values: uppercase in application code where appropriate.

Example:

```text
users
stations
tickets
ticket_assignments
ticket_transfers
ticket_messages
feedback
audit_logs
```

---

# 5. Primary Key Strategy

The recommended primary key for major entities is UUID.

Example:

```text
id UUID PRIMARY KEY
```

Advantages:

- Avoids exposing sequential database IDs.
- Makes distributed systems easier to support later.
- Reduces predictable record enumeration.
- Works well with Django/PostgreSQL.

The human-readable ticket number remains separate.

---

# 6. Users

## Table: `users`

Stores all authenticated system users.

Suggested fields:

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| username | VARCHAR | Login identifier |
| email | VARCHAR | User email |
| first_name | VARCHAR | First name |
| last_name | VARCHAR | Last name |
| role | VARCHAR | USER / AGENT / ADMIN |
| priority_level | VARCHAR | P1 / P2 / P3 |
| is_active | BOOLEAN | Account active state |
| is_staff | BOOLEAN | Administrative framework flag if required |
| last_login | TIMESTAMP | Last successful login |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

Django's authentication model should be used rather than creating a completely independent authentication system.

---

# 7. User Priority

Although priority can initially be represented as a field on `users`, the implementation should avoid coupling business rules too tightly to the authentication model.

Recommended MVP:

```text
users.priority_level
```

Allowed values:

```text
P1
P2
P3
```

The application derives ticket priority from the user when the ticket is created.

A historical ticket should retain its own priority value.

This is important.

If a user changes from P3 to P2 later, previously created tickets must not automatically become P2.

Therefore:

```text
users.priority_level
```

determines the default for new tickets, while:

```text
tickets.priority
```

stores the historical priority of that specific ticket.

---

# 8. Stations

## Table: `stations`

Stores support locations.

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| code | VARCHAR |
| description | TEXT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Initial records:

```text
Head Office
Babylove - Tesano
```

The database must not assume these are the only stations.

---

# 9. Agent-Station Relationship

An agent may eventually be assigned to multiple stations.

Therefore, station assignment should use a many-to-many relationship.

## Table: `agent_stations`

| Field | Type |
|---|---|
| id | UUID |
| agent_id | UUID FK → users |
| station_id | UUID FK → stations |
| is_active | BOOLEAN |
| assigned_at | TIMESTAMP |
| ended_at | TIMESTAMP NULL |

This supports:

```text
Agent A → Head Office
Agent A → Babylove - Tesano
```

without duplicating the agent account.

---

# 10. Problem Categories

Problem types should be configurable.

## Table: `problem_categories`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| sort_order | INTEGER |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Initial categories may include:

```text
Support
Laptop
Laptop Accessories
Printer
Scanner
Monitor
```

---

# 11. Problem Types

## Table: `problem_types`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| category_id | UUID FK |
| name | VARCHAR |
| description | TEXT |
| sort_order | INTEGER |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Initial examples:

```text
SAP
Microsoft Excel
Microsoft Word
HR System
Other Support
Faulty Laptop (Software)
Faulty Laptop (Hardware)
```

The exact initial catalogue can be expanded or modified by administrators.

---

# 12. Tickets

## Table: `tickets`

This is the central business entity.

Suggested fields:

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| ticket_number | VARCHAR | Human-readable unique number |
| user_id | UUID | Ticket owner |
| station_id | UUID | Current station |
| problem_type_id | UUID | Selected problem |
| priority | VARCHAR | P1/P2/P3 |
| status | VARCHAR | Current workflow status |
| current_assignee_id | UUID NULL | Current responsible agent |
| description | TEXT | User's problem description |
| resolution_notes | TEXT NULL | Resolution information |
| created_at | TIMESTAMP | Creation time |
| queued_at | TIMESTAMP NULL | Queue-entry time |
| claimed_at | TIMESTAMP NULL | First/current claim time |
| resolved_at | TIMESTAMP NULL | Resolution time |
| closed_at | TIMESTAMP NULL | Closure time |
| reopened_at | TIMESTAMP NULL | Most recent reopening |
| updated_at | TIMESTAMP | Last update |

---

# 13. Ticket Number

`ticket_number` must be unique.

Recommended format:

```text
IT-YYYY-XXXXXX
```

Example:

```text
IT-2026-000125
```

The database should enforce:

```text
UNIQUE(ticket_number)
```

The database UUID remains the actual primary key.

---

# 14. Ticket Priority

The ticket stores its own priority:

```text
tickets.priority
```

This prevents historical tickets from changing priority when the user's account changes.

Example:

```text
User priority today = P2
Old ticket priority = P3
```

The old ticket remains P3 unless an authorized administrative action explicitly changes it.

---

# 15. Ticket Status

The recommended values are:

```text
QUEUED
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
REOPENED
```

Status changes must be validated by application business logic.

The database should not allow arbitrary values.

---

# 16. Current Assignee

The ticket may contain:

```text
current_assignee_id
```

This provides efficient access to the current responsible agent.

However, this field is not sufficient for historical tracking.

The system therefore also requires an assignment history table.

---

# 17. Ticket Assignment History

## Table: `ticket_assignments`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| agent_id | UUID FK |
| assigned_by_id | UUID FK |
| assigned_at | TIMESTAMP |
| ended_at | TIMESTAMP NULL |
| assignment_type | VARCHAR |
| reason | TEXT NULL |

Possible assignment types:

```text
CLAIM
ASSIGN
REASSIGN
TRANSFER
```

This allows the system to answer:

- Who handled the ticket?
- When did they receive it?
- Who assigned it?
- How long were they responsible?

---

# 18. Ticket Transfers

## Table: `ticket_transfers`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| from_station_id | UUID FK |
| to_station_id | UUID FK |
| from_agent_id | UUID NULL |
| to_agent_id | UUID NULL |
| initiated_by_id | UUID FK |
| reason | TEXT |
| created_at | TIMESTAMP |

A transfer should never overwrite the historical station information.

The current station remains on:

```text
tickets.station_id
```

while historical transfers remain in:

```text
ticket_transfers
```

---

# 19. Ticket Messages

## Table: `ticket_messages`

Stores communication associated with a ticket.

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| sender_id | UUID FK |
| message_type | VARCHAR |
| body | TEXT |
| created_at | TIMESTAMP |
| edited_at | TIMESTAMP NULL |
| deleted_at | TIMESTAMP NULL |

Possible message types:

```text
USER_MESSAGE
AGENT_MESSAGE
INTERNAL_NOTE
SYSTEM_MESSAGE
PREDEFINED_NOTICE
```

---

# 20. Message Visibility

Message visibility should be explicit.

Recommended field:

```text
visibility
```

Values:

```text
USER_VISIBLE
INTERNAL
SYSTEM
```

This is important because internal agent communication must never accidentally appear in the user interface or API response.

---

# 21. Internal Messages

Internal agent communication should remain associated with the ticket where appropriate.

Example:

```text
ticket_id = IT-2026-000125
sender = Agent A
visibility = INTERNAL
```

Only authorised agents/admins should be able to retrieve it.

---

# 22. Attachments

## Table: `attachments`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| message_id | UUID NULL |
| uploaded_by_id | UUID FK |
| file_name | VARCHAR |
| storage_key | VARCHAR |
| content_type | VARCHAR |
| file_size | BIGINT |
| visibility | VARCHAR |
| created_at | TIMESTAMP |

The actual file should not normally be stored directly inside PostgreSQL.

The database stores metadata while the file is stored in object storage such as MinIO.

---

# 23. Attachment Visibility

Attachments must inherit or explicitly define their visibility.

Possible values:

```text
USER_VISIBLE
INTERNAL
```

An internal attachment must never be accessible through a public URL.

The application must authorize every attachment download.

---

# 24. Predefined Response Templates

## Table: `response_templates`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| message | TEXT |
| category | VARCHAR |
| is_active | BOOLEAN |
| created_by_id | UUID |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Initial examples:

```text
I am coming.

Please bring your PC.
```

Administrators can modify these without changing application code.

---

# 25. Notifications

## Table: `notifications`

Stores in-app notification records.

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| recipient_id | UUID FK |
| ticket_id | UUID NULL |
| notification_type | VARCHAR |
| title | VARCHAR |
| message | TEXT |
| is_read | BOOLEAN |
| created_at | TIMESTAMP |
| read_at | TIMESTAMP NULL |

Examples:

```text
P1_TICKET_CREATED
P2_ESCALATION
P3_ESCALATION
TICKET_ASSIGNED
TICKET_TRANSFERRED
USER_MESSAGE
TICKET_RESOLVED
NEGATIVE_FEEDBACK
```

---

# 26. Email Notifications

Email delivery should not depend solely on the `notifications` table.

The application should have a notification service capable of:

```text
In-app notification
Email notification
Real-time notification
```

The system should record email delivery attempts separately if detailed delivery tracking is required.

---

# 27. Notification Delivery

For reliable background processing, the recommended architecture is:

```text
Django
   ↓
Celery
   ↓
Redis
   ↓
Email / Notification Service
```

This prevents slow email operations from blocking ticket requests.

---

# 28. Feedback

## Table: `feedback`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| user_id | UUID FK |
| rating | VARCHAR |
| comment | TEXT NULL |
| submitted_at | TIMESTAMP |
| token_id | UUID |
| created_at | TIMESTAMP |

Rating could initially use:

```text
POSITIVE
NEGATIVE
```

The schema can later be extended to a numerical rating system if required.

---

# 29. Feedback Tokens

Feedback access should use a dedicated token entity.

## Table: `feedback_tokens`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| token_hash | VARCHAR |
| expires_at | TIMESTAMP |
| used_at | TIMESTAMP NULL |
| created_at | TIMESTAMP |
| revoked_at | TIMESTAMP NULL |

The system should preferably store a secure hash of the token rather than the raw token.

---

# 30. Feedback Token Rules

A token is valid only when:

```text
ticket is eligible for feedback
AND
token has not expired
AND
token has not been used
AND
token has not been revoked
```

After successful submission:

```text
used_at = current timestamp
```

The same token must not be accepted again.

---

# 31. Feedback Expiration

The expiration timestamp is stored directly:

```text
feedback_tokens.expires_at
```

This makes the actual deadline auditable.

For example:

```text
Ticket resolved:
2026-09-14 15:30 GMT

Feedback expiry:
2026-09-14 17:00 GMT
```

If resolved after 17:00:

```text
Ticket resolved:
2026-09-14 18:00 GMT

Feedback expiry:
Next applicable working day 17:00 GMT
```

The application should calculate this rather than hard-code a fixed number of hours.

---

# 32. Escalation Records

## Table: `ticket_escalations`

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| ticket_id | UUID FK |
| escalation_type | VARCHAR |
| threshold_minutes | INTEGER |
| triggered_at | TIMESTAMP |
| notification_sent_at | TIMESTAMP NULL |
| created_at | TIMESTAMP |

Possible escalation types:

```text
P2_UNATTENDED
P3_UNATTENDED
```

This prevents the system from losing the history of why an escalation occurred.

---

# 33. Preventing Duplicate Escalations

The application/background worker must be idempotent.

A suitable database constraint can ensure that the same ticket does not receive the same escalation event multiple times for the same applicable workflow period.

For example, the system should prevent duplicate:

```text
P2_UNATTENDED
```

records caused by multiple Celery workers processing the same ticket.

---

# 34. Audit Logs

## Table: `audit_logs`

This table records important system actions.

Suggested fields:

| Field | Type |
|---|---|
| id | UUID |
| actor_id | UUID NULL |
| action | VARCHAR |
| entity_type | VARCHAR |
| entity_id | UUID |
| ticket_id | UUID NULL |
| old_values | JSONB NULL |
| new_values | JSONB NULL |
| metadata | JSONB NULL |
| created_at | TIMESTAMP |

Examples:

```text
TICKET_CREATED
TICKET_CLAIMED
TICKET_ASSIGNED
TICKET_TRANSFERRED
STATUS_CHANGED
PRIORITY_CHANGED
TICKET_RESOLVED
FEEDBACK_SUBMITTED
TICKET_REOPENED
TICKET_CLOSED
USER_DEACTIVATED
STATION_CHANGED
```

---

# 35. Audit Log Immutability

Normal application users must not be able to edit audit records.

The system should treat audit logs as append-only.

Administrative access may allow viewing but should not normally allow modification.

---

# 36. Account Expiration

Consultant accounts require an expiration date.

This can be stored in:

```text
users.expires_at
```

or, if temporary account history becomes more complex:

```text
user_account_periods
```

For the MVP, `expires_at` on the user account is sufficient.

The authentication layer must reject expired accounts.

---

# 37. Working Days

Because feedback expiration depends on the next applicable working day, the system should eventually support a configurable working calendar.

A future table could be:

```text
working_calendar
```

with fields such as:

```text
date
is_working_day
description
```

For MVP:

```text
Monday-Friday
```

can be treated as working days.

The architecture should avoid making this assumption impossible to change later.

---

# 38. Recommended Core Relationships

The main relationships are:

```text
User
 ├── has many Tickets
 ├── has many Notifications
 ├── has many Messages
 ├── has many Assignments
 └── may belong to many Stations

Station
 ├── has many Tickets
 └── has many Agents

Ticket
 ├── belongs to User
 ├── belongs to Station
 ├── belongs to Problem Type
 ├── has many Messages
 ├── has many Assignments
 ├── has many Transfers
 ├── has many Attachments
 ├── has many Escalations
 ├── has many Notifications
 ├── has many Audit Logs
 └── may have Feedback
```

---

# 39. Database Constraints

The database should enforce important integrity rules.

Examples:

### Unique Ticket Number

```text
UNIQUE(ticket_number)
```

### Unique Station Code

```text
UNIQUE(code)
```

### Unique Active Agent-Station Relationship

An agent should not have duplicate active relationships with the same station.

### Feedback Token

A token should uniquely identify its feedback workflow.

### Feedback

A ticket should not have multiple successful feedback submissions for the same resolution event.

### Foreign Keys

Records referencing users, tickets, stations, etc. should use appropriate foreign-key constraints.

---

# 40. Soft Deactivation

The following entities should generally use an active flag:

```text
users
stations
problem_categories
problem_types
response_templates
agent_stations
```

Example:

```text
is_active = false
```

This preserves historical records.

Physical deletion should be restricted and used only where there is a clear data-retention policy.

---

# 41. Deletion Policy

Tickets should not normally be physically deleted.

Historical ticket information is operationally important.

Instead:

```text
ACTIVE
INACTIVE
CLOSED
ARCHIVED
```

or equivalent retention mechanisms may be used later.

Any eventual data-retention/deletion process must be separately defined.

---

# 42. Database Indexing

Indexes will be important because the system frequently queries tickets by:

- Station.
- Status.
- Priority.
- Assignee.
- User.
- Creation time.
- Queue eligibility.

Recommended indexes include combinations around:

```text
tickets(station_id, status, priority)
tickets(station_id, status, priority, queued_at)
tickets(current_assignee_id, status)
tickets(user_id, created_at)
tickets(ticket_number)
ticket_messages(ticket_id, created_at)
notifications(recipient_id, is_read)
audit_logs(ticket_id, created_at)
ticket_escalations(ticket_id, escalation_type)
```

The exact indexes should be confirmed using actual query patterns and PostgreSQL query analysis.

---

# 43. Queue Query Considerations

The queue is a frequently accessed operation.

The database must be able to efficiently retrieve:

```text
active P2/P3 tickets
+
current station
+
queue eligibility
+
queue ordering
```

The implementation should avoid calculating queue positions by loading all tickets into Python.

The database should perform filtering and ordering wherever practical.

---

# 44. Transaction Requirements

Certain operations must be transactional.

Examples:

### Claim

```text
Check ticket
+
Confirm available
+
Assign agent
+
Change status
+
Record assignment
+
Record audit event
```

### Transfer

```text
Update station
+
Update assignment
+
Create transfer record
+
Record audit event
```

### Resolution

```text
Update status
+
Record resolution
+
Generate feedback token
+
Record audit event
```

### Feedback

```text
Validate token
+
Record feedback
+
Invalidate token
+
Change ticket status
+
Record audit event
```

These operations should succeed completely or roll back appropriately.

---

# 45. Optimistic/Database Concurrency Control

The system must protect against race conditions.

Example:

Two agents click **Claim** at almost the same time.

Only one operation should succeed.

The database/application should use appropriate transaction locking or conditional updates.

The frontend must not be responsible for preventing the race.

---

# 46. Historical vs Current Data

The database deliberately stores both current state and historical events.

For example:

```text
tickets.current_assignee_id
```

provides fast access to the current assignee.

While:

```text
ticket_assignments
```

provides the historical record.

Similarly:

```text
tickets.station_id
```

stores the current station.

While:

```text
ticket_transfers
```

stores the station history.

This combination provides both performance and auditability.

---

# 47. Suggested Entity List

The initial PostgreSQL schema should contain approximately:

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

Additional Django/system tables will also exist for:

```text
sessions
migrations
administrative framework data
```

and any other infrastructure required by the selected Django authentication and task-processing implementation.

---

# 48. Entity Relationship Summary

```text
                         ┌──────────────┐
                         │    USERS     │
                         └──────┬───────┘
                                │
             ┌──────────────────┼─────────────────┐
             ↓                  ↓                 ↓
      AGENT_STATIONS        TICKETS          MESSAGES
             │                  │                 │
             ↓                  │                 │
         STATIONS               │                 │
                                │                 │
          ┌─────────────────────┼─────────────────┐
          ↓          ↓          ↓         ↓       ↓
    ASSIGNMENTS  TRANSFERS  FEEDBACK  ESCALATION ATTACHMENTS
          │                     │
          │                     ↓
          │              FEEDBACK TOKENS
          │
          └───────────────┐
                          ↓
                     AUDIT LOGS

PROBLEM CATEGORIES
        ↓
PROBLEM TYPES
        ↓
      TICKETS
```

---

# 49. Django Model Strategy

The database should be represented through Django models.

The project should not manually maintain SQL schema definitions separately from Django migrations unless there is a specific infrastructure requirement.

Recommended process:

```text
Django Models
      ↓
makemigrations
      ↓
Migration Files
      ↓
PostgreSQL
```

Migrations must be committed to Git.

---

# 50. Model Design Principle

Django models should represent business entities, not merely reproduce database tables mechanically.

For example, ticket workflow operations should live in appropriate service/domain logic rather than allowing arbitrary direct manipulation of:

```text
ticket.status
ticket.current_assignee
ticket.station
```

from unrelated parts of the application.

---

# 51. Service Layer

Complex operations should use dedicated service functions/classes.

Examples:

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

This centralizes business rules and prevents inconsistent behaviour.

---

# 52. Database and API Security

The database itself must not be considered the authorization boundary.

The architecture is:

```text
Frontend
   ↓
API
   ↓
Authorization
   ↓
Business Logic
   ↓
Django ORM
   ↓
PostgreSQL
```

Every sensitive operation must pass through authorization and business validation before modifying the database.

---

# 53. Future Extensions

The schema should be capable of supporting future entities such as:

```text
assets
knowledge_articles
departments
sla_policies
working_calendars
holidays
external_integrations
ldap_accounts
sso_accounts
```

These should not be added to the MVP merely for the sake of future-proofing.

The MVP schema should remain understandable and maintainable.

---

# 54. MVP Database Scope

The MVP database must support:

- Authentication.
- Roles.
- Priority.
- Stations.
- Agent-station assignments.
- Problem catalogue.
- Tickets.
- Ticket assignment.
- Ticket transfer.
- Ticket messaging.
- Internal notes.
- Attachments.
- Response templates.
- Notifications.
- Escalations.
- Feedback.
- Feedback tokens.
- Audit logs.

---

# 55. Final Database Design Principle

The database should distinguish clearly between:

```text
CURRENT STATE
```

and:

```text
HISTORICAL EVENTS
```

For example:

```text
tickets.current_assignee_id
```

answers:

> Who is responsible now?

while:

```text
ticket_assignments
```

answers:

> Who has been responsible for this ticket and when?

Similarly:

```text
tickets.station_id
```

answers:

> Which station currently owns this ticket?

while:

```text
ticket_transfers
```

answers:

> How did the ticket move between stations?

This distinction is fundamental to maintaining a reliable, auditable IT support system.