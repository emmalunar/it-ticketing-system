# Notification and SLA Specification

## 1. Purpose

This document defines how the IT Ticketing System handles:

- In-app notifications
- Email notifications
- Real-time notifications
- Priority-based escalation
- Unattended ticket monitoring
- Service-level timing rules
- Feedback expiry
- Background notification processing
- Notification retries and failures
- Notification history
- SLA reporting and monitoring

This document works together with:

- `03-business-rules.md`
- `05-ticket-workflow.md`
- `06-queue-and-priority-system.md`
- `07-database-design.md`
- `08-system-architecture.md`
- `09-api-specification.md`
- `10-security.md`

Where a conflict exists, the business rules and security requirements take precedence.

---

# 2. Notification Architecture

The notification system consists of four main parts:

```text
Application Event
       │
       ▼
Django Application
       │
       ├──────────────► Database Notification Record
       │
       ├──────────────► Redis / Celery
       │                         │
       │                         ▼
       │                    Background Task
       │                         │
       │              ┌──────────┴──────────┐
       │              ▼                     ▼
       │          Email SMTP          Other processing
       │
       ▼
Django Channels
       │
       ▼
WebSocket
       │
       ▼
User / Agent Browser
```

The database remains the authoritative record of notification events.

Redis must not be treated as the permanent notification store.

---

# 3. Notification Channels

The system supports three primary notification channels.

## 3.1 In-App Notifications

In-app notifications appear in the user's dashboard.

Examples:

- New ticket assigned
- Ticket transferred
- New ticket message
- Ticket resolved
- Negative feedback received
- P1 ticket created
- P2 escalation
- P3 escalation

Notifications should include:

- Title
- Short message
- Notification type
- Related ticket where applicable
- Creation time
- Read/unread state

---

## 3.2 Email Notifications

Email is used for important events where immediate attention may be required.

Examples:

- P1 ticket creation
- P2 unattended escalation
- P3 unattended escalation
- Ticket assignment
- Ticket transfer
- Negative feedback
- Important system notifications

Email content should be concise and actionable.

Where appropriate, an email should contain:

- Ticket number
- Priority
- Station
- Problem type
- Short description
- Current status
- Relevant action or dashboard link

Sensitive internal information must not be exposed to unauthorised recipients.

---

## 3.3 Real-Time WebSocket Notifications

Django Channels/WebSockets should provide real-time updates when users are actively connected.

Examples:

```text
New ticket
New message
Ticket assigned
Ticket transferred
Queue changed
Notification received
Ticket status changed
```

Real-time delivery improves responsiveness but must not replace database persistence or email processing.

If a WebSocket connection is unavailable, the notification must remain available through the normal notification system.

---

# 4. Notification Recipients

Notification recipients depend on the event.

## 4.1 P1 Ticket

When a P1 ticket is created:

**Recipients:**

- All active agents assigned to the selected station.

The notification must be immediate.

P1 tickets bypass the normal queue.

---

## 4.2 P2 Escalation

When a P2 ticket remains unattended for 10 minutes:

**Recipients:**

- Active agents assigned to the ticket's current station.

The escalation should be sent only once for that unattended period.

---

## 4.3 P3 Escalation

When a P3 ticket remains unattended for 60 minutes:

**Recipients:**

- Active agents assigned to the ticket's current station.

The escalation should be sent only once for that unattended period.

---

## 4.4 Ticket Assignment

When a ticket is assigned directly to an agent:

**Recipient:**

- The assigned agent.

---

## 4.5 Ticket Transfer

When a ticket is transferred to another station or agent:

**Recipients:**

- Receiving agent, if one is specified.
- Active agents at the receiving station where station-level notification is required.

The exact notification behaviour must reflect the transfer operation.

---

## 4.6 User Notifications

Users may receive notifications when:

- Their ticket is accepted/claimed.
- An agent sends a message.
- Their ticket is resolved.
- Their ticket is reopened following negative feedback.
- Other user-facing ticket events occur.

Internal agent-to-agent messages must never generate user-visible notifications.

---

# 5. Notification Event Types

The notification system should support configurable event types.

Recommended initial types:

```text
P1_TICKET_CREATED
P2_ESCALATION
P3_ESCALATION
TICKET_ASSIGNED
TICKET_TRANSFERRED
USER_MESSAGE
AGENT_MESSAGE
TICKET_RESOLVED
NEGATIVE_FEEDBACK
TICKET_REOPENED
SYSTEM_NOTIFICATION
```

Additional event types may be introduced later.

---

# 6. Priority Notification Rules

## 6.1 P1

P1 is the highest priority.

When a P1 ticket is created:

1. Ticket is created.
2. Station is identified.
3. Active agents assigned to that station are identified.
4. In-app notifications are created.
5. Real-time notifications are sent to connected agents.
6. Email notifications are queued for delivery.
7. Ticket remains outside the normal queue.

There must be no 10-minute or 60-minute waiting period for P1.

---

## 6.2 P2

P2 enters the station queue.

The escalation timer begins when the ticket becomes eligible for agent handling.

If the ticket remains unattended for **10 minutes**, the escalation is triggered.

Once an agent claims, accepts, or is assigned the ticket:

```text
Unattended timer → STOP
```

The timer must not continue simply because the ticket has not yet been resolved.

---

## 6.3 P3

P3 enters the station queue.

If the ticket remains unattended for **60 minutes**, the escalation is triggered.

Once the ticket is claimed, accepted, or assigned:

```text
Unattended timer → STOP
```

---

# 7. Definition of Unattended

For escalation purposes, a ticket is considered **unattended** when:

- It is eligible for agent handling;
- It has not been claimed;
- It has not been assigned to an agent; and
- It remains in an active waiting state.

A ticket is no longer unattended once an agent has taken responsibility.

The following do **not** necessarily mean a ticket is unattended:

- The ticket has not been resolved.
- The user is waiting for a solution.
- The ticket is in `IN_PROGRESS`.
- The ticket is in `WAITING_USER`.

Therefore:

```text
Unattended ≠ Unresolved
```

This distinction is critical to correct SLA calculations.

---

# 8. Escalation Timing

## 8.1 P2

```text
Ticket created
      ↓
Station queue
      ↓
Unattended
      ↓
10 minutes
      ↓
P2 escalation
```

## 8.2 P3

```text
Ticket created
      ↓
Station queue
      ↓
Unattended
      ↓
60 minutes
      ↓
P3 escalation
```

Timing should be calculated using server-side timestamps.

The client/browser must never determine whether an SLA has been breached.

---

# 9. Celery and Redis

Celery is responsible for background processing.

Redis is used as the task broker and supporting infrastructure.

Typical background tasks include:

```text
check_unattended_tickets
send_notification_email
send_escalation_notification
process_notification_retry
expire_feedback_tokens
generate_scheduled_reports
```

Celery Beat may be used for recurring checks.

For example:

```text
Every minute
      ↓
Check eligible unattended tickets
      ↓
Determine whether threshold has been reached
      ↓
Create escalation
      ↓
Create notifications
      ↓
Queue emails
```

The exact interval may be adjusted during implementation.

---

# 10. Escalation Idempotency

Escalation processing must be idempotent.

The system must never send multiple P2 or P3 escalation notifications simply because a background task runs more than once.

For example:

```text
P2 ticket reaches 10 minutes
        ↓
Escalation created
        ↓
Notification sent
```

If the monitoring task runs again:

```text
Existing escalation found
        ↓
Do not create another escalation
        ↓
Do not send another escalation
```

The database should enforce uniqueness where appropriate.

For example, the combination of:

```text
ticket + escalation_type
```

should prevent duplicate escalation records for the same escalation event.

---

# 11. Notification Delivery and Retries

Notification generation and notification delivery should be treated separately.

Example:

```text
Ticket event
    ↓
Notification record created
    ↓
Email task queued
    ↓
SMTP delivery attempted
```

If email delivery fails:

```text
Retry
   ↓
Retry
   ↓
Retry
   ↓
Mark delivery as failed
```

The exact retry count and delay should be configurable.

A temporary SMTP failure must not cause the underlying ticket operation to fail.

For example, failure to send an escalation email must not roll back the creation of the ticket or escalation record.

---

# 12. Notification Failure Handling

The system should distinguish between:

- Notification created
- Notification queued
- Notification delivered
- Notification failed

Where email delivery tracking is implemented, the system should record appropriate delivery metadata.

The system should log:

- Notification ID
- Recipient
- Notification type
- Attempt time
- Success/failure
- Failure reason where available
- Retry count

Sensitive email content should not unnecessarily be written to logs.

---

# 13. Feedback Notification and Expiry

When an agent resolves a ticket:

```text
RESOLVED
   ↓
Generate secure feedback token
   ↓
Send feedback notification/link
```

The feedback link has a fixed expiry rule.

## Before 5:00 PM GMT

If the ticket is resolved before 5:00 PM GMT:

```text
Expiry = 5:00 PM GMT on the applicable working day
```

## After 5:00 PM GMT

If the ticket is resolved after 5:00 PM GMT:

```text
Expiry = 5:00 PM GMT on the next applicable working day
```

The system must not implement this as:

```text
resolution time + 9 hours
```

The expiry must be calculated against the defined working-day boundary.

---

# 14. Feedback Token Security

Feedback tokens must:

- Be cryptographically secure.
- Be sufficiently unpredictable.
- Be stored securely.
- Be associated with exactly one ticket.
- Have a defined expiration timestamp.
- Be invalidated after successful submission.
- Reject reuse.

After successful feedback:

```text
used_at = current timestamp
```

Any subsequent attempt using the same token must fail.

A successful feedback submission must therefore immediately invalidate the token.

---

# 15. Feedback Outcome Notifications

## Positive Feedback

```text
User submits positive feedback
          ↓
Ticket → CLOSED
          ↓
Relevant notification/event recorded
```

## Negative Feedback

```text
User submits negative feedback
          ↓
Ticket → REOPENED
          ↓
Return to active handling
          ↓
Notify appropriate agents
```

The reopened ticket returns to the appropriate station handling flow.

P2/P3 reopened tickets return to their applicable active queue.

P1 reopened tickets retain P1 handling behaviour and do not enter the normal queue.

---

# 16. Working-Day Logic

The initial working-day definition is:

```text
Monday – Friday
```

The system should be designed so that holidays and other non-working days can be configured in the future.

The working-day calculation should therefore be implemented as a reusable service rather than hard-coded directly into the feedback view.

Example conceptual service:

```text
get_next_applicable_working_day()
calculate_feedback_expiry()
```

This will allow future holiday calendars to be introduced without redesigning the feedback system.

---

# 17. Notification Templates

Notification messages should use templates rather than hard-coded text throughout the application.

Templates may contain variables such as:

```text
{{ ticket_number }}
{{ priority }}
{{ station }}
{{ problem_type }}
{{ user_name }}
{{ agent_name }}
{{ ticket_url }}
```

Templates should be safely rendered by the backend.

User-controlled values must be escaped appropriately.

Where practical, administrators should be able to manage notification templates through the administration interface.

---

# 18. User and Agent Notification Differences

The notification system must respect the audience.

### User-facing notification

May contain:

- Ticket number
- Ticket status
- Agent response
- Resolution information
- Feedback link

### Agent-facing notification

May contain:

- Ticket number
- Priority
- Station
- Problem type
- Description
- Assignment information
- Escalation information

### Internal agent notification

May contain operational information intended only for authorised agents.

Internal messages must never be exposed through user-facing notification channels.

---

# 19. Predefined Agent Notices

The system supports predefined notices such as:

```text
I am coming.
```

and:

```text
Please bring your PC.
```

When an agent sends a predefined notice:

1. The message is recorded against the ticket.
2. The message is visible to the user.
3. The appropriate user notification is generated.
4. Real-time delivery occurs if the user is connected.

Administrators should be able to add, modify, deactivate, or remove predefined templates.

---

# 20. Queue Change Notifications

Queue changes may occur when:

- A ticket is created.
- A ticket is claimed.
- A ticket is assigned.
- A ticket is transferred.
- A ticket is resolved.
- A ticket is closed.
- A ticket is reopened.

Connected agents may receive real-time queue updates through:

```text
/ws/queue/
```

The frontend should refresh or update queue information based on server events.

Queue calculations remain server-side.

---

# 21. Notification History

Notification records should remain available for auditing and user experience.

Each notification should contain at least:

```text
id
recipient
ticket
notification_type
title
message
is_read
created_at
read_at
```

Notifications should not normally be physically deleted as part of ordinary user operations.

Read/unread state may be updated.

---

# 22. Notification Preferences

Notification preferences should be kept simple for the MVP.

The system should not allow users to disable mandatory operational notifications such as:

- P1 alerts to agents
- P2 escalation alerts
- P3 escalation alerts
- Important ticket assignment notifications

Optional notification preferences may be introduced later.

Any preference system must never override mandatory business or security notifications.

---

# 23. SLA Terminology

The system should distinguish between:

### Ticket Age

Time since ticket creation.

```text
Current time - created_at
```

### Unattended Time

Time during which an eligible ticket remains without agent responsibility.

This is the timing used for P2/P3 escalation.

### Response Time

Time between ticket creation and the point at which an agent takes responsibility.

### Resolution Time

Time between ticket creation and resolution.

### Closure Time

Time between ticket creation and final closure.

These metrics should not be treated as interchangeable.

---

# 24. SLA Metrics

The reporting system should eventually support:

- Number of P1 tickets
- Number of P2 tickets
- Number of P3 tickets
- Average response time
- Average resolution time
- Average closure time
- P2 escalation count
- P3 escalation count
- Tickets resolved without escalation
- Tickets resolved after escalation
- Reopened tickets
- Negative feedback rate
- Positive feedback rate
- Tickets by station
- Tickets by problem type
- Tickets by agent
- Tickets by period

---

# 25. SLA Monitoring

Administrators should be able to identify:

- Tickets approaching escalation.
- Tickets that have already escalated.
- Tickets currently unattended.
- Tickets by priority.
- Tickets by station.
- Tickets with repeated reopening.
- Tickets with negative feedback.

The system should avoid requiring administrators to inspect individual tickets manually to determine SLA performance.

---

# 26. Timezone Standard

The backend should use a consistent timezone strategy.

The system's business rules use:

```text
GMT / UTC
```

particularly for the 5:00 PM feedback expiry rule.

All important timestamps should be stored in a consistent timezone-aware format.

The frontend may display timestamps in a user-friendly local format, but business calculations must use server-side timezone-aware timestamps.

---

# 27. Notification Security

Notifications must follow the same authorization rules as tickets.

A user must not receive information about a ticket they cannot access.

An agent must not receive station-restricted ticket information unless they are authorised to access that station.

Internal messages must never be included in user notifications.

WebSocket notification channels must enforce authentication and authorization.

Email recipients must be determined by the backend rather than supplied by an untrusted client.

---

# 28. Background Job Security

Celery tasks must not blindly trust task arguments.

For important operations, the task should re-check relevant database state.

For example:

```text
Celery checks P2 ticket
        ↓
Re-read current ticket state
        ↓
Is it still unattended?
        ↓
Yes → escalate
No  → stop
```

This prevents escalation of a ticket that was claimed immediately before the background task executed.

---

# 29. Race Conditions

The notification/SLA system must account for concurrent actions.

Example:

```text
10-minute escalation task
          +
Agent claims ticket
          ↓
Potential race condition
```

The implementation must ensure that a ticket that has already been claimed does not incorrectly receive an unattended escalation.

Transactions and appropriate database locking/conditional updates should be used where necessary.

---

# 30. Notification Processing Flow

A typical P2 escalation should follow:

```text
Ticket created
      ↓
Ticket enters station queue
      ↓
Celery monitors ticket
      ↓
10-minute threshold reached
      ↓
Re-check ticket state
      ↓
Still unattended?
      │
   ┌──┴──┐
   │     │
  YES    NO
   │     │
   ▼     ▼
Create   Stop
escalation
   │
   ▼
Create in-app notifications
   │
   ▼
Push WebSocket events
   │
   ▼
Queue email notifications
   │
   ▼
SMTP delivery
   │
   ▼
Record result
```

---

# 31. Failure Recovery

If Redis or Celery becomes temporarily unavailable:

- Existing ticket data must remain safe in PostgreSQL.
- Ticket creation must not corrupt.
- Notification processing should resume when background services recover.
- The system should identify missed or pending escalation work.
- Duplicate notifications must be prevented through idempotent processing.

Background processing must therefore be designed for recovery rather than assuming continuous availability.

---

# 32. Audit Requirements

The following notification/SLA events should be auditable where appropriate:

- P1 notification generated.
- P2 escalation generated.
- P3 escalation generated.
- Ticket assignment notification.
- Ticket transfer notification.
- Resolution notification.
- Feedback notification.
- Feedback submission.
- Notification failure.
- Administrative notification-template changes.

Audit records should identify:

```text
actor
action
entity
ticket
timestamp
relevant old/new values
metadata
```

---

# 33. Administrative Configuration

Administrators should eventually be able to configure:

- Notification templates.
- Response templates.
- Working days.
- Holiday dates.
- Escalation thresholds where business policy permits.
- Active/inactive notification templates.

However, configuration must not silently override core business rules without proper administrative authorization and audit logging.

For the MVP, the official thresholds remain:

```text
P1 → Immediate
P2 → 10 minutes unattended
P3 → 60 minutes unattended
Feedback → 5:00 PM GMT applicable working day
```

---

# 34. Testing Requirements

The implementation must include tests for:

### P1

- Immediate notification.
- Correct station recipients.
- No normal queue position.
- No delayed escalation.

### P2

- Enters station queue.
- Escalates after 10 minutes unattended.
- Does not escalate after being claimed.
- Does not generate duplicate escalation notifications.

### P3

- Enters station queue.
- Escalates after 60 minutes unattended.
- Does not escalate after being claimed.
- Does not generate duplicate escalation notifications.

### Feedback

- Correct expiry before 5 PM.
- Correct next-working-day expiry after 5 PM.
- Expired token rejected.
- Used token rejected.
- Positive feedback closes ticket.
- Negative feedback reopens ticket.

### Security

- Unauthorized users cannot receive notifications.
- Internal messages never appear in user notifications.
- WebSocket authorization is enforced.
- Email recipients cannot be manipulated by clients.

### Reliability

- SMTP failure does not corrupt ticket state.
- Failed notification delivery can retry.
- Duplicate Celery execution does not duplicate escalation.
- Background processing recovers correctly.

---

# 35. Claude Code Implementation Instructions

Claude Code must follow these rules when implementing the notification and SLA system:

1. Treat this document and the business-rules document as authoritative.
2. Do not invent new SLA thresholds.
3. Do not interpret unattended as unresolved.
4. Do not implement feedback expiry as a fixed duration after resolution.
5. Use timezone-aware timestamps.
6. Keep GMT/UTC as the authoritative business calculation timezone.
7. Use PostgreSQL as the source of truth.
8. Use Redis/Celery for background processing, not permanent ticket state.
9. Make escalation processing idempotent.
10. Prevent duplicate escalation records and notifications.
11. Re-check ticket state before escalating.
12. Use transactions for critical state changes.
13. Enforce authorization on notification retrieval and WebSocket delivery.
14. Never expose internal agent messages to users.
15. Never trust priority values supplied by the frontend.
16. Never trust notification recipients supplied by the frontend.
17. Keep notification templates separate from business logic.
18. Make working-day calculations reusable.
19. Write automated tests before considering the feature complete.
20. Do not modify unrelated modules without justification.
21. Do not introduce microservices for this feature.
22. Follow the architecture defined in `08-system-architecture.md`.
23. Follow the database structure defined in `07-database-design.md`.
24. Follow the API conventions defined in `09-api-specification.md`.
25. Follow all security requirements in `10-security.md`.

---

# 36. Acceptance Criteria

The notification and SLA implementation is considered complete when:

- P1 tickets immediately notify authorised station agents.
- P1 tickets bypass the normal queue.
- P2 tickets escalate after 10 minutes of being unattended.
- P3 tickets escalate after 60 minutes of being unattended.
- Claiming/assignment stops unattended escalation.
- Duplicate escalations cannot occur.
- Notifications are persisted.
- Real-time notifications work for connected clients.
- Email notifications are processed asynchronously.
- Email failures do not corrupt ticket state.
- Notification processing can retry safely.
- Feedback expiry follows the 5 PM GMT working-day rule.
- Feedback tokens become invalid immediately after successful submission.
- Positive feedback closes tickets.
- Negative feedback reopens tickets.
- Internal notifications/messages cannot leak to users.
- Notification access follows ticket authorization.
- SLA metrics can be generated from reliable timestamps.
- Automated tests cover the major notification, escalation, feedback, concurrency, and security scenarios.

---

# 37. Summary

The notification and SLA system is responsible for making the ticketing system responsive without allowing background processing to become the source of truth.

The core rules are:

```text
P1 → Immediate notification
P2 → 10-minute unattended escalation
P3 → 60-minute unattended escalation

Claim/assignment → unattended timer stops

Resolution → feedback link generated

Before 5 PM GMT → feedback expires 5 PM same applicable working day
After 5 PM GMT → feedback expires 5 PM next applicable working day

Positive feedback → CLOSED
Negative feedback → REOPENED

Redis/Celery → background processing
PostgreSQL → authoritative state
WebSockets → real-time delivery
SMTP → email delivery
```

All notification and SLA behaviour must remain secure, auditable, idempotent, and consistent with the ticket workflow.