# Business Rules — IT Ticketing System

**Document:** `business-rules.md`  
**Version:** 1.0  
**Status:** Draft / Initial Specification  
**System:** Internal IT Ticketing and Support Management System  
**Timezone:** GMT (UTC+0)

---

## 1. Purpose

This document defines the business rules governing the internal IT Ticketing System.

The rules establish how users submit problems, how tickets are routed and prioritised, how agents respond, how tickets move through the support lifecycle, how escalation works, and how feedback is collected.

This document should be treated as the primary source of truth for business behaviour during development.

---

# 2. Core Principles

### RULE-CORE-001 — Every problem must become a ticket

Every support request submitted through the system must create a unique ticket.

Each ticket must have a unique human-readable ticket number, for example:

`IT-2026-000001`

The database may use a separate internal numeric or UUID primary key.

---

### RULE-CORE-002 — Every ticket must belong to a station

A user must select the office/station where the problem originates when submitting a ticket.

A ticket cannot be submitted without a station.

The selected station determines the initial group of agents responsible for the ticket.

---

### RULE-CORE-003 — Station determines initial ticket visibility

When a ticket is created, it is initially visible to active agents assigned to the selected station.

Agents belonging to other stations must not normally see the ticket.

This restriction must be enforced by the backend, not merely by hiding tickets in the frontend.

---

### RULE-CORE-004 — Tickets may be transferred between stations

An authorised agent may transfer a ticket to an agent belonging to another station when necessary.

A transfer must record:

- original agent
- receiving agent
- original station
- receiving station
- person who performed the transfer
- date and time
- reason for transfer

The transfer must also appear in the ticket history/audit trail.

---

# 3. User Roles

The system has three primary system roles:

1. User
2. Agent
3. Administrator

Priority status is separate from system role.

---

## 3.1 Normal User

### RULE-USER-001

A normal user may:

- submit tickets
- select a station
- select a problem type
- provide a problem description
- view their own tickets
- communicate with assigned IT agents
- receive notifications
- view their queue position where applicable
- receive resolution notifications
- provide feedback

A normal user must not access:

- another user's tickets
- internal agent conversations
- administrative functions
- system configuration
- audit records belonging to other users

---

# 4. Priority Users

Priority status determines how a user's ticket is treated.

There are three priority levels:

| Level | User Type | Treatment |
|---|---|---|
| P1 | CEO / Executive | Immediate attention; bypasses queue |
| P2 | Manager / Consultant | Priority queue treatment |
| P3 | Normal User | Standard queue |

---

## 4.1 Priority 1

### RULE-PRI-001

Priority 1 users are designated CEO/executive users.

### RULE-PRI-002

P1 tickets must receive immediate attention.

### RULE-PRI-003

A P1 ticket must not participate in the normal ticket queue.

### RULE-PRI-004

A P1 ticket must trigger an immediate notification to the active agents responsible for the selected station.

### RULE-PRI-005

P1 tickets must appear in a dedicated/high-visibility section of the agent dashboard.

### RULE-PRI-006

P1 tickets must not display a normal queue position to the user.

---

# 5. Priority 2

Priority 2 users are managers and consultants.

### RULE-PRI2-001

P2 users receive priority treatment but remain within the queue system.

### RULE-PRI2-002

A P2 ticket that remains unattended for **10 minutes** must trigger an escalation email to the active agents responsible for the selected station.

### RULE-PRI2-003

The 10-minute escalation timer begins when the ticket is successfully submitted.

### RULE-PRI2-004

If an agent accepts/claims the ticket before the 10-minute threshold, the unattended escalation must not be sent.

---

# 6. Normal Users / Priority 3

### RULE-PRI3-001

Normal users are treated as standard-priority users.

### RULE-PRI3-002

A normal ticket that remains unattended for **60 minutes** must trigger an escalation email to active agents responsible for the selected station.

### RULE-PRI3-003

The 60-minute escalation timer begins when the ticket is successfully submitted.

### RULE-PRI3-004

If an agent accepts/claims the ticket before the 60-minute threshold, the unattended escalation must not be sent.

---

# 7. Definition of an Unattended Ticket

### RULE-SLA-001

For escalation purposes, a ticket is considered **unattended** when no agent has accepted/claimed or been assigned responsibility for the ticket.

### RULE-SLA-002

A ticket that is already assigned to an agent is considered attended even if the problem has not yet been resolved.

### RULE-SLA-003

The system must verify the current ticket state immediately before sending an escalation notification.

This prevents escalation emails from being sent for tickets that have already been accepted.

---

# 8. Ticket Queue

The normal queue applies to P2 and normal/P3 tickets.

### RULE-QUEUE-001

P1 tickets bypass the normal queue.

### RULE-QUEUE-002

P2 and P3 tickets participate in the queue.

### RULE-QUEUE-003

A user's queue position represents the number of active tickets ahead of their ticket.

### RULE-QUEUE-004

Queue position should be calculated dynamically rather than permanently stored as a fixed number.

### RULE-QUEUE-005

Tickets that are no longer active must not count towards another user's queue position.

### RULE-QUEUE-006

Resolved and closed tickets must be removed from the active queue.

### RULE-QUEUE-007

A reopened ticket must re-enter the appropriate active queue.

### RULE-QUEUE-008

P1 tickets must not affect the normal queue position.

### RULE-QUEUE-009

A user should see the number of tickets ahead of their ticket where queue treatment applies.

Example:

> **There are 3 tickets ahead of you.**

### RULE-QUEUE-010

Queue position must be calculated within the relevant station rather than across the entire organisation.

---

# 9. Ticket Creation

### RULE-TICKET-001

A ticket submission must contain:

- station
- problem type
- brief description

### RULE-TICKET-002

The system must automatically record:

- ticket number
- submitting user
- user's priority level
- station
- problem type
- description
- creation date/time
- initial status

### RULE-TICKET-003

The ticket's priority must be determined from the user's current priority classification.

Users must not be able to manually promote their own priority.

### RULE-TICKET-004

A confirmation should be displayed to the user after successful submission.

The confirmation should include the ticket number.

---

# 10. Problem Types

Problem types must be selectable from a controlled list.

Initial categories include:

### Support

- SAP
- Microsoft Excel
- Microsoft Word
- HR System
- Other Support

### Laptop

- Faulty Laptop — Software
- Faulty Laptop — Hardware

### Accessories

- Laptop Accessories

### Office Equipment

- Printer
- Scanner
- Monitor

The system should allow administrators to add, deactivate, or modify problem types without changing application code.

---

# 11. Ticket Status

The system should support a controlled ticket lifecycle.

Recommended statuses:

```text
QUEUED
ASSIGNED
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
REOPENED
```

### RULE-STATUS-001

A newly submitted standard ticket enters `QUEUED`.

### RULE-STATUS-002

When an agent accepts or is assigned the ticket, it becomes `ASSIGNED` or `IN_PROGRESS` according to the implementation workflow.

### RULE-STATUS-003

A ticket may enter `WAITING_USER` when the agent requires information, action, or equipment from the user.

### RULE-STATUS-004

An agent may mark a successfully addressed problem as `RESOLVED`.

### RULE-STATUS-005

A resolved ticket must go through the feedback process before final closure, unless an explicitly defined administrative exception exists.

### RULE-STATUS-006

A ticket confirmed as successfully resolved should become `CLOSED`.

### RULE-STATUS-007

If the user reports that the problem persists through the feedback process, the ticket becomes `REOPENED`.

### RULE-STATUS-008

A reopened ticket must return to active support handling.

---

# 12. Agent Assignment

### RULE-ASSIGN-001

Agents may see tickets belonging to stations to which they are assigned.

### RULE-ASSIGN-002

An eligible agent may claim an unassigned ticket.

### RULE-ASSIGN-003

Claiming a ticket makes the agent responsible for handling it.

### RULE-ASSIGN-004

The system must record the assignment event.

### RULE-ASSIGN-005

The original ticket history must remain available after reassignment or transfer.

---

# 13. Ticket Transfer

### RULE-TRANSFER-001

An agent may transfer a ticket to another authorised agent when necessary.

### RULE-TRANSFER-002

A transfer may occur within the same station or to another station.

### RULE-TRANSFER-003

The receiving agent must have permission to handle tickets at the receiving station.

### RULE-TRANSFER-004

A transfer must not delete or overwrite the previous assignment history.

### RULE-TRANSFER-005

The ticket history must clearly show every transfer.

### RULE-TRANSFER-006

An agent transferring a ticket to another station should provide a reason.

---

# 14. User-Agent Communication

### RULE-COMMS-001

Users and assigned agents must be able to communicate through the ticket.

### RULE-COMMS-002

Messages must remain associated with the relevant ticket.

### RULE-COMMS-003

Users may only access conversations belonging to their own tickets.

### RULE-COMMS-004

Agents may access conversations for tickets they are authorised to handle.

---

# 15. Agent-to-Agent Communication

### RULE-INTERNAL-001

Agents must be able to communicate internally through the platform.

### RULE-INTERNAL-002

Internal agent communication must be separate from the user-facing conversation.

### RULE-INTERNAL-003

Internal messages must never be visible to the ticket's user.

### RULE-INTERNAL-004

Internal messages should be associated with the relevant ticket when the discussion concerns a specific ticket.

### RULE-INTERNAL-005

Administrators may access internal ticket discussions where required for support management, auditing, or investigation.

---

# 16. Predefined Agent Notices

The system should provide quick-response notices to reduce repetitive typing.

Initial notices should include:

### "I am coming"

The agent can notify the user that they are travelling to the user's location.

### "Please bring your PC"

The agent can instruct the user to bring their computer to the IT office.

Additional templates may include:

- Additional information required
- Issue is being investigated
- Please restart your computer
- Issue has been resolved

Administrators should be able to manage these templates.

---

# 17. Resolution

### RULE-RESOLVE-001

Only an authorised agent or administrator may resolve a ticket.

### RULE-RESOLVE-002

Resolving a ticket must record the agent responsible and the resolution date/time.

### RULE-RESOLVE-003

Resolution should trigger the feedback process.

### RULE-RESOLVE-004

The user should be notified that the ticket has been marked as resolved.

---

# 18. Feedback

### RULE-FEEDBACK-001

When a ticket is resolved, the system must generate a unique feedback token.

### RULE-FEEDBACK-002

The feedback token must be securely generated and associated with exactly one ticket.

### RULE-FEEDBACK-003

The feedback link must expire at **17:00 GMT** on the applicable working day.

### RULE-FEEDBACK-004

If a ticket is resolved after 17:00 GMT, its feedback link should expire at **17:00 GMT on the next applicable working day**.

### RULE-FEEDBACK-005

A feedback token may only be successfully submitted once.

### RULE-FEEDBACK-006

The feedback token becomes invalid immediately after successful feedback submission.

### RULE-FEEDBACK-007

A user attempting to reuse a submitted feedback link must be informed that the feedback has already been submitted.

### RULE-FEEDBACK-008

An expired feedback link must not accept feedback.

### RULE-FEEDBACK-009

A positive response confirms that the problem has been resolved.

### RULE-FEEDBACK-010

A positive response should result in the ticket being marked `CLOSED`.

### RULE-FEEDBACK-011

A negative response indicates that the problem persists.

### RULE-FEEDBACK-012

A negative response should reopen the ticket for further support.

### RULE-FEEDBACK-013

A reopened ticket must retain its previous ticket history and feedback record.

---

# 19. Working Day

### RULE-WORK-001

The standard working-day closing time for feedback is **17:00 GMT**.

### RULE-WORK-002

The system must use GMT/UTC+0 as the authoritative timezone for ticket timing and feedback expiry.

### RULE-WORK-003

The definition of a working day should be configurable rather than permanently hard-coded.

### RULE-WORK-004

The initial working week should be Monday to Friday unless the organisation specifies otherwise.

### RULE-WORK-005

Public holidays and organisation-specific non-working days should eventually be configurable by an administrator.

---

# 20. Email Escalation

### RULE-EMAIL-001

P1 tickets trigger immediate email notifications.

### RULE-EMAIL-002

P2 tickets trigger escalation after 10 minutes if unattended.

### RULE-EMAIL-003

P3/normal tickets trigger escalation after 60 minutes if unattended.

### RULE-EMAIL-004

Escalation emails should be sent to active agents responsible for the ticket's station.

### RULE-EMAIL-005

The system must verify that the ticket remains unattended immediately before sending an escalation email.

### RULE-EMAIL-006

Email escalation events must be recorded for auditing and troubleshooting.

### RULE-EMAIL-007

An email failure must not change the ticket's status or otherwise prevent the ticket from being handled.

---

# 21. Notifications

The system should support both in-application notifications and email notifications where appropriate.

### RULE-NOTIFY-001

A P1 ticket should immediately generate an agent notification.

### RULE-NOTIFY-002

An escalation event should generate an appropriate agent notification.

### RULE-NOTIFY-003

Users should receive notifications when significant changes occur to their tickets.

Examples include:

- ticket created
- ticket accepted
- agent assigned
- agent message received
- ticket resolved
- ticket reopened
- ticket closed

### RULE-NOTIFY-004

Notifications must respect the user's permissions and must not expose confidential information.

---

# 22. Temporary Consultant Accounts

Consultants are temporary users.

### RULE-CONSULT-001

A consultant account must have an explicit account expiration date/time.

### RULE-CONSULT-002

A consultant account must automatically become inactive after its expiration time.

### RULE-CONSULT-003

An expired consultant must no longer be able to authenticate.

### RULE-CONSULT-004

Historical tickets and messages created by a consultant must remain associated with their account after the account expires.

### RULE-CONSULT-005

Deactivating a consultant account must not delete historical records.

---

# 23. User Account Management

### RULE-ACCOUNT-001

Administrators may create, activate, deactivate, and manage user accounts.

### RULE-ACCOUNT-002

Deactivating a user must not delete their historical tickets.

### RULE-ACCOUNT-003

An inactive user must not be able to create new tickets or access protected system functions.

### RULE-ACCOUNT-004

Historical records must retain the identity of the user who performed the original action.

---

# 24. Audit Trail

The system must maintain an audit trail for important actions.

### RULE-AUDIT-001

The system should record significant changes to tickets.

Examples include:

- ticket creation
- assignment
- reassignment
- transfer
- priority changes
- status changes
- resolution
- reopening
- closure
- feedback submission

### RULE-AUDIT-002

Administrative actions affecting users, stations, problem types, permissions, and system configuration should also be logged.

### RULE-AUDIT-003

Audit records should contain, where applicable:

- actor
- action
- affected object
- previous value
- new value
- timestamp
- relevant metadata

### RULE-AUDIT-004

Normal users must not have access to system audit logs.

---

# 25. Data Integrity

### RULE-DATA-001

Tickets must not be physically deleted during normal operations.

### RULE-DATA-002

Users, agents, and consultants should normally be deactivated rather than deleted where historical records depend on them.

### RULE-DATA-003

Ticket history must remain intact throughout the ticket lifecycle.

### RULE-DATA-004

Changes to important ticket information should be auditable.

---

# 26. Security and Access Control

### RULE-SEC-001

All protected functionality requires authentication.

### RULE-SEC-002

Access to tickets must be controlled according to user role and ticket visibility rules.

### RULE-SEC-003

Station-based access restrictions must be enforced by the backend.

### RULE-SEC-004

Internal agent communications must never be exposed through user-facing APIs.

### RULE-SEC-005

Users must not be able to modify their own priority level.

### RULE-SEC-006

Users must not be able to assign tickets to themselves or other agents.

### RULE-SEC-007

Sensitive administrative operations must be restricted to authorised administrators.

### RULE-SEC-008

File attachments must be validated before being stored.

---

# 27. Queue and Closure Interaction

### RULE-QUEUE-CLOSE-001

Only active tickets count towards queue position.

### RULE-QUEUE-CLOSE-002

Resolved tickets should no longer count towards the active queue.

### RULE-QUEUE-CLOSE-003

Closed tickets must not count towards the active queue.

### RULE-QUEUE-CLOSE-004

If a resolved ticket is reopened following negative feedback, it must return to active queue processing according to its priority.

### RULE-QUEUE-CLOSE-005

A reopened P1 ticket must receive P1 treatment and must not be placed in the normal queue.

---

# 28. Administrative Configuration

Where practical, business values should be configurable.

Administrators should eventually be able to configure:

- stations
- agents
- agent-station assignments
- problem types
- response templates
- working days
- working hours
- escalation thresholds
- notification settings

However, changing configuration must not bypass security or create invalid system states.

---

# 29. Reporting Requirements

The system should eventually provide reports including:

- total tickets
- active tickets
- closed tickets
- tickets by station
- tickets by problem type
- tickets by priority
- tickets by agent
- average response time
- average resolution time
- unattended tickets
- SLA/escalation events
- reopened tickets
- feedback results

Reports should respect user permissions.

---

# 30. Business Rule Precedence

When two rules appear to conflict, the system should apply the more specific rule.

Priority treatment takes precedence over normal queue treatment.

For example:

```text
P1
↓
Immediate handling
↓
No normal queue
```

while:

```text
P2
↓
Priority queue treatment
↓
10-minute unattended escalation
```

and:

```text
P3
↓
Normal queue
↓
60-minute unattended escalation
```

---

# 31. Initial Ticket Lifecycle

The standard lifecycle is:

```text
USER SUBMITS PROBLEM
        ↓
TICKET CREATED
        ↓
PRIORITY DETERMINED
        ↓
STATION DETERMINED
        ↓
QUEUE / IMMEDIATE HANDLING
        ↓
AGENT ACCEPTS
        ↓
USER ↔ AGENT COMMUNICATION
        ↓
        ├── WAITING FOR USER ──┐
        │                      │
        └──────────────────────┘
        ↓
PROBLEM RESOLVED
        ↓
FEEDBACK LINK SENT
        ↓
      ┌───────────────┐
      │               │
     YES              NO
      │               │
      ↓               ↓
   CLOSED          REOPENED
                      ↓
                 FURTHER SUPPORT
```

---

# 32. Rule Change Management

Business rules must not be silently changed during implementation.

Any change to a rule should:

1. Be documented.
2. Receive a new document version.
3. Identify the affected rules.
4. Identify affected system behaviour.
5. Be reflected in the implementation.

Claude Code should not invent business rules when the requirements are ambiguous.

When a requirement is unclear, it should flag the ambiguity for review rather than making a permanent business decision itself.

---

# 33. Implementation Principle

The business rules in this document describe **what the system must do**.

They do not dictate exactly **how the code must implement it**.

Technical implementation decisions belong in:

- `architecture.md`
- `database-design.md`
- `api-specification.md`
- `security.md`
- `deployment.md`

The application must satisfy the business rules regardless of the implementation approach.