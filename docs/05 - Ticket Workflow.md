# 05 — Ticket Workflow

## 1. Purpose

This document defines the complete lifecycle of an IT support ticket, from initial submission through assignment, support, resolution, feedback, closure, or reopening.

The workflow must provide:

- Clear ownership of every active ticket.
- Station-based routing.
- Priority-aware queue handling.
- Controlled ticket transfers.
- Separate user-facing and internal communication.
- Automatic escalation for unattended tickets.
- A controlled resolution and feedback process.
- Complete historical and audit tracking.

The workflow must be implemented consistently across the frontend, backend, notification system, and database.

---

# 2. Ticket Lifecycle Overview

The primary ticket lifecycle is:

```text
CREATE
  ↓
QUEUED
  ↓
IN_PROGRESS
  ↓
WAITING_USER ──────┐
  ↓                │
IN_PROGRESS ←──────┘
  ↓
RESOLVED
  ↓
Feedback Submitted
  ├── Positive → CLOSED
  └── Negative → REOPENED
                       ↓
                  IN_PROGRESS / QUEUED
                       ↓
                    RESOLVED
                       ↓
                     CLOSED
```

P1 tickets follow the same overall lifecycle but **bypass the normal queue**.

---

# 3. Ticket Statuses

The recommended ticket statuses are:

| Status | Meaning |
|---|---|
| QUEUED | Ticket is active and waiting for an agent |
| IN_PROGRESS | An agent has accepted responsibility and is working on it |
| WAITING_USER | Agent requires information/action from the user |
| RESOLVED | Agent has completed the support work and is awaiting feedback |
| CLOSED | Ticket has been successfully completed and feedback accepted |
| REOPENED | User rejected the resolution and the ticket requires further support |

There is deliberately no long-lived `ASSIGNED` status.

Assignment is represented by the ticket's current assignee and assignment history.

---

# 4. Why Assignment Is Not a Separate Status

A ticket can be assigned without necessarily being actively worked on.

For example:

```text
Ticket
Status: QUEUED
Assignee: Agent A
```

This can create unnecessary ambiguity.

Instead, the system should distinguish:

### Ticket Status

What stage of the support process the ticket is in.

### Assignment

Which agent currently has responsibility.

Therefore:

```text
status = IN_PROGRESS
assignee = Agent A
```

clearly means Agent A is actively responsible for the ticket.

Assignment and transfer events should still be recorded in the ticket history.

---

# 5. Ticket Creation

A ticket is created when a user submits an IT problem.

Required information:

- User.
- Station.
- Problem type.
- Brief description.

Optional information may include:

- Attachment(s).
- Additional details.

The system automatically determines:

- Ticket number.
- Priority.
- Initial status.
- Creation timestamp.
- Initial station.
- Queue eligibility.
- Relevant escalation deadline.

---

# 6. Ticket Number

Every ticket receives a human-readable ticket number.

Recommended format:

```text
IT-YYYY-XXXXXX
```

Example:

```text
IT-2026-000125
```

The human-readable ticket number is separate from the database primary key.

The ticket number should be:

- Unique.
- Searchable.
- Stable.
- Never reused.

---

# 7. Priority Assignment

Priority is determined automatically from the user's account.

```text
P1 User → P1 Ticket
P2 User → P2 Ticket
P3 User → P3 Ticket
```

The user does not manually choose the priority.

Agents should not normally be able to change a ticket's priority.

Administrative users may change priority when authorised to correct an account or ticket classification.

Any administrative priority change must be recorded in the audit history.

---

# 8. Initial Routing

Every ticket must have a station.

The selected station determines the initial routing destination.

Example:

```text
User
 ↓
Selects Head Office
 ↓
Ticket created
 ↓
Head Office queue
 ↓
Head Office agents notified according to priority rules
```

or:

```text
User
 ↓
Selects Babylove - Tesano
 ↓
Ticket created
 ↓
Babylove - Tesano queue
 ↓
Relevant agents notified according to priority rules
```

---

# 9. P1 Ticket Workflow

P1 tickets bypass the normal queue.

When a P1 ticket is created:

1. Ticket is created.
2. Priority is set to P1.
3. Station is recorded.
4. Ticket becomes immediately available to authorised agents at that station.
5. Relevant agents receive immediate notification.
6. The ticket does not receive a normal queue position.
7. The ticket can be claimed immediately.
8. Once claimed, the agent becomes responsible for the ticket.

Conceptually:

```text
P1 Ticket Created
       ↓
Immediate Station Notification
       ↓
Agent Claims
       ↓
IN_PROGRESS
```

P1 tickets must not wait behind P2 or P3 tickets.

---

# 10. P2 Ticket Workflow

P2 tickets enter the normal station queue.

When created:

```text
P2 Ticket
   ↓
Station Queue
   ↓
Queue Position Calculated
   ↓
Await Agent
```

If the ticket remains unattended for 10 minutes:

```text
10 minutes unattended
        ↓
Escalation notification
        ↓
Station agents notified
```

Once an agent claims or is assigned responsibility:

```text
QUEUED
  ↓
Agent claims
  ↓
IN_PROGRESS
```

The unattended escalation must not continue after ownership has been established.

---

# 11. P3 Ticket Workflow

P3 tickets follow the standard queue.

When created:

```text
P3 Ticket
   ↓
Station Queue
   ↓
Queue Position Calculated
   ↓
Await Agent
```

If the ticket remains unattended for 60 minutes:

```text
60 minutes unattended
        ↓
Escalation notification
        ↓
Station agents notified
```

Once claimed:

```text
QUEUED
  ↓
Agent claims
  ↓
IN_PROGRESS
```

---

# 12. Definition of "Unattended"

A ticket is considered **unattended** when:

- It is active.
- It has not been successfully claimed by an agent.
- It has not been assigned to an agent with responsibility.
- It has not otherwise entered active agent handling.

A ticket is no longer unattended when an authorised agent accepts/claims responsibility.

The system must not send unattended escalation merely because a ticket has remained unresolved.

For example:

```text
Ticket created
↓
No agent claims
↓
Unattended = YES
↓
Escalation timer continues
```

But:

```text
Ticket created
↓
Agent claims ticket
↓
Unattended = NO
↓
Escalation timer stops
```

The ticket may remain unresolved for hours without triggering the same unattended escalation again, because it is already being handled.

---

# 13. Queue Position

Queue position applies to P2 and P3 tickets.

P1 tickets do not participate in the normal queue.

The queue is station-specific.

For example:

```text
Head Office Queue

1. IT-2026-000121
2. IT-2026-000123
3. IT-2026-000125
```

The position is dynamic.

When a ticket is:

- Resolved.
- Closed.
- Removed from active processing.

the queue is recalculated.

When a ticket is reopened, it returns to the active workflow according to the applicable queue rules.

---

# 14. Queue Visibility to Users

P2 and P3 users may see:

```text
There are 3 applicable tickets ahead of you.
```

The system should calculate this based on active tickets relevant to the same station and applicable priority/queue rules.

P1 users should not see a normal queue position because their ticket bypasses the queue.

The exact ranking algorithm should be implemented according to the queue rules defined in the separate queue specification.

---

# 15. Agent Claiming

An authorised agent can claim an eligible ticket.

The claim operation must be atomic.

The system must prevent two agents from successfully claiming the same ticket simultaneously.

When successfully claimed:

- Current assignee is recorded.
- Assignment timestamp is recorded.
- Ticket status changes to `IN_PROGRESS`.
- Unattended status becomes false.
- Applicable unattended escalation is stopped.
- Assignment event is recorded in history.

Example:

```text
Ticket: IT-2026-000125
Agent: Agent A
Status: IN_PROGRESS
Assigned At: 09:35
```

---

# 16. Agent Assignment

Administrators may assign a ticket to an agent.

An agent may also assign/transfer a ticket according to their permissions.

Assignment must always respect station access rules.

The system should verify that the receiving agent is authorised to work on the ticket's current station unless the operation is a valid transfer.

Assignment events must be recorded.

---

# 17. User Communication

Once an agent is handling a ticket, the agent can communicate with the user.

Examples:

- Request additional information.
- Provide instructions.
- Explain troubleshooting steps.
- Provide progress updates.
- Explain the resolution.

The user can reply through the ticket conversation.

All user-agent messages belong to the ticket conversation and remain part of the ticket history.

---

# 18. Predefined Agent Notices

Agents should be able to send predefined notices.

Initial notices:

```text
"I am coming."

"Please bring your PC."
```

The notice is sent as a user-facing message.

Administrators should be able to create, edit, activate, or deactivate predefined notices without modifying application code.

---

# 19. Waiting for User

An agent may change the ticket to:

```text
WAITING_USER
```

when further action or information is required from the user.

Examples:

- User has been asked to provide information.
- User needs to bring a computer to the IT office.
- User needs to perform a requested action.
- Agent cannot continue until the user responds.

The user should be notified when the ticket enters this state.

When the user responds or performs the required action:

```text
WAITING_USER
      ↓
IN_PROGRESS
```

The agent may then continue working on the ticket.

---

# 20. Internal Agent Notes

Agents can create internal messages or notes.

These are visible only to authorised agents and administrators.

Examples:

```text
"Suspect network switch port issue."

"User has already attempted the standard troubleshooting procedure."

"Transferred to Babylove - Tesano because the required equipment is available there."
```

Internal notes must never appear in the user's ticket conversation.

---

# 21. Ticket Transfer

An agent may transfer a ticket when another station or agent is better positioned to resolve it.

Example:

```text
Head Office
     ↓
Transfer
     ↓
Babylove - Tesano
```

The transfer must record:

- Ticket.
- Previous station.
- New station.
- Previous assignee.
- New assignee, if applicable.
- Initiating agent.
- Timestamp.
- Transfer reason, where required.

After transfer, the receiving station becomes the active station.

---

# 22. Transfer and Queue Behaviour

If a queued ticket is transferred:

```text
Old Station Queue
      ↓
Transfer
      ↓
New Station Queue
```

The ticket is removed from the previous station's active queue and enters the applicable queue for the receiving station.

If an already assigned/in-progress ticket is transferred:

```text
Agent A
   ↓
Transfer
   ↓
Receiving Station / Agent B
```

The system should establish the new responsible agent where applicable.

The full transfer history remains available.

---

# 23. Resolution

An agent can resolve a ticket when the support work has been completed.

Before resolution, the system should require resolution information.

Example:

```text
Problem:
User unable to access SAP.

Resolution:
SAP client credentials were reset and connectivity was verified.
```

When resolved:

```text
IN_PROGRESS
      ↓
RESOLVED
```

The ticket leaves the active queue.

---

# 24. Resolution Notification

When a ticket is resolved:

1. The user is notified.
2. The system generates a secure feedback token.
3. The feedback link is sent to the user.
4. The feedback expiration time is calculated.

The resolution notification should clearly explain that the user can provide feedback on the support received.

---

# 25. Feedback Expiration

Feedback is governed by a fixed work-closing time of:

```text
5:00 PM GMT
```

It is not a nine-hour countdown from the time of resolution.

### Resolution before 5:00 PM GMT

The feedback token expires at:

```text
5:00 PM GMT
```

on the applicable working day.

### Resolution after 5:00 PM GMT

The feedback token expires at:

```text
5:00 PM GMT
```

on the next applicable working day.

Initially, working days are Monday-Friday.

The system should be designed so company holidays/non-working days can be configured later.

---

# 26. Feedback Submission

The feedback process is:

```text
RESOLVED
   ↓
Feedback Link
   ↓
User submits feedback
   ↓
Token immediately invalidated
   ↓
Positive or Negative
```

The feedback token must be one-time use.

After successful submission:

```text
is_used = TRUE
submitted_at = timestamp
```

Any subsequent attempt to use the same token must be rejected.

---

# 27. Positive Feedback

If the user submits positive feedback:

```text
RESOLVED
   ↓
Positive Feedback
   ↓
CLOSED
```

The ticket is permanently removed from the active support queue.

The closure event must be recorded in the ticket history.

---

# 28. Negative Feedback

If the user submits negative feedback:

```text
RESOLVED
   ↓
Negative Feedback
   ↓
REOPENED
```

The ticket becomes active again.

The relevant agents should be notified that further support is required.

The ticket must not simply return to its previous resolved state.

Instead:

```text
REOPENED
    ↓
Agent takes responsibility
    ↓
IN_PROGRESS
```

The subsequent resolution creates a new resolution event.

---

# 29. Reopened Ticket Queue Behaviour

A reopened ticket must return to the active support workflow.

For P2/P3 tickets, the system should determine its queue placement using the current queue rules.

For P1 tickets, it continues to receive P1 handling and does not enter the normal queue.

The original ticket number remains unchanged.

Example:

```text
IT-2026-000125

RESOLVED
   ↓
Negative Feedback
   ↓
REOPENED
   ↓
IN_PROGRESS
   ↓
RESOLVED
   ↓
Positive Feedback
   ↓
CLOSED
```

---

# 30. Closing a Ticket

Normal ticket closure is feedback-driven.

The recommended process is:

```text
Agent resolves
      ↓
User receives feedback request
      ↓
User submits positive feedback
      ↓
Ticket closes
```

An administrator may close a ticket as an administrative intervention where necessary.

Administrative closure must be recorded with:

- Administrator.
- Timestamp.
- Reason.
- Previous status.
- New status.

---

# 31. Ticket History

The system must maintain a chronological history of significant ticket events.

Examples:

```text
09:10 Ticket created
09:10 Routed to Head Office
09:20 Agent A claimed ticket
09:22 Agent sent "I am coming."
09:40 Agent added internal note
10:05 Ticket transferred
10:15 Agent B claimed ticket
10:30 Ticket resolved
10:30 Feedback link generated
11:10 Positive feedback received
11:10 Ticket closed
```

History should be append-oriented and should not be silently overwritten.

---

# 32. Status Transition Rules

The following transitions are permitted:

| Current Status | Allowed Next Status |
|---|---|
| QUEUED | IN_PROGRESS |
| QUEUED | REOPENED |
| IN_PROGRESS | WAITING_USER |
| IN_PROGRESS | RESOLVED |
| WAITING_USER | IN_PROGRESS |
| WAITING_USER | RESOLVED |
| RESOLVED | CLOSED |
| RESOLVED | REOPENED |
| REOPENED | IN_PROGRESS |
| REOPENED | QUEUED* |
| CLOSED | — |

`*` Use of `REOPENED → QUEUED` should depend on the final reassignment/queue design.

---

# 33. Invalid Status Transitions

The backend must reject invalid transitions.

Examples:

```text
QUEUED → CLOSED
QUEUED → RESOLVED
CLOSED → IN_PROGRESS
CLOSED → REOPENED
```

unless an explicit administrative workflow is defined.

The frontend must not be relied upon to prevent invalid transitions.

---

# 34. Closed Ticket Immutability

Once a ticket is closed:

- Normal users cannot modify it.
- Normal agents cannot continue working on it.
- New user messages should not silently reopen it.
- New support work requires an explicit reopening mechanism.

The historical record must remain available for reporting and audit.

---

# 35. Ticket Ownership

The system should distinguish:

### Ticket Owner

The employee who originally submitted the ticket.

### Current Assignee

The agent currently responsible for handling the ticket.

### Station

The current station responsible for the ticket.

These are separate fields/concepts.

Example:

```text
Ticket Owner:
John Doe

Current Assignee:
Agent A

Current Station:
Head Office
```

A transfer changes the responsible station and potentially the assignee, but does not change the original ticket owner.

---

# 36. Notification Triggers

The workflow should generate notifications for important events.

Examples include:

### Ticket Created

Notify appropriate agents according to priority rules.

### P1 Created

Immediate notification to authorised agents at the selected station.

### P2 Unattended

Notification after 10 minutes.

### P3 Unattended

Notification after 60 minutes.

### Ticket Claimed

Relevant real-time update.

### Ticket Transferred

Notify receiving station/agent as appropriate.

### User Message

Notify responsible agent.

### Agent Message

Notify user.

### Ticket Resolved

Notify user and provide feedback link.

### Negative Feedback

Notify relevant agent(s).

### Positive Feedback

Record closure and notify relevant parties if configured.

---

# 37. Queue Removal Rules

A ticket must be removed from the active queue when it reaches:

```text
RESOLVED
CLOSED
```

A ticket returns to the active workflow when it becomes:

```text
REOPENED
```

P1 tickets are never part of the normal P2/P3 queue.

---

# 38. Concurrency and Race Conditions

The ticket workflow must account for simultaneous operations.

Examples:

- Two agents attempt to claim the same ticket.
- An agent resolves a ticket while the user submits a message.
- A ticket is transferred while another agent attempts to claim it.
- A feedback token is submitted twice simultaneously.

The backend/database must use appropriate transaction handling and constraints to ensure only valid operations succeed.

The system must never create two simultaneous owners for a ticket where the business rules allow only one current assignee.

---

# 39. Audit Events

The following should generate audit/history events at minimum:

- Ticket creation.
- Priority assignment.
- Station routing.
- Ticket claim.
- Assignment.
- Reassignment.
- Transfer.
- Status change.
- User message.
- Internal message.
- Predefined notice.
- Attachment.
- Resolution.
- Feedback token generation.
- Feedback submission.
- Ticket reopening.
- Ticket closure.
- Administrative intervention.

---

# 40. Workflow Summary

The normal P2/P3 process is:

```text
User submits ticket
       ↓
Priority determined automatically
       ↓
Station selected
       ↓
Ticket enters station queue
       ↓
Queue position calculated
       ↓
Agent claims ticket
       ↓
IN_PROGRESS
       ↓
Communication / troubleshooting
       ↓
       ├── Need user action
       │       ↓
       │   WAITING_USER
       │       ↓
       │   User responds
       │       ↓
       │   IN_PROGRESS
       │
       └── Issue resolved
               ↓
           RESOLVED
               ↓
        Feedback requested
               ↓
        ┌──────┴──────┐
        ↓             ↓
     Positive      Negative
        ↓             ↓
      CLOSED       REOPENED
                      ↓
                 Further support
                      ↓
                  IN_PROGRESS
```

P1 follows:

```text
User submits P1 ticket
       ↓
Immediate station notification
       ↓
Agent claims
       ↓
IN_PROGRESS
       ↓
Support
       ↓
RESOLVED
       ↓
Feedback
       ↓
CLOSED / REOPENED
```

---

# 41. Implementation Principles

Claude Code must implement the workflow as explicit business logic.

The application must not allow arbitrary status changes simply because a user has access to a ticket.

Each transition should validate:

- Current status.
- Actor.
- Role.
- Station access.
- Assignment.
- Priority.
- Ticket ownership.
- Required fields.
- Relevant business rules.

The workflow should be implemented centrally so that the same rules apply to:

- REST API.
- WebSocket actions.
- Administrative interface.
- Background tasks.
- Automated processes.

No frontend-only workflow enforcement is acceptable.

---

# 42. Future Extensibility

The workflow should be designed to support future additions such as:

- SLA timers.
- Working-hour calendars.
- Public holidays.
- Automatic reassignment.
- Multi-level escalation.
- Asset management.
- Knowledge-base suggestions.
- External service integrations.
- Approval workflows.
- Department-based routing.

These features should not be implemented in the MVP unless separately approved.

---

# 43. Final MVP Workflow

The MVP therefore uses the following core states:

```text
QUEUED
   ↓
IN_PROGRESS
   ↓
WAITING_USER
   ↓
IN_PROGRESS
   ↓
RESOLVED
   ↓
CLOSED
```

with:

```text
RESOLVED → REOPENED → IN_PROGRESS
```

for negative feedback.

P1 tickets bypass `QUEUED` while P2/P3 tickets enter the station-specific queue.

Assignment is represented separately from status, ensuring the system can clearly distinguish **ticket stage**, **current responsible agent**, **ticket owner**, and **responsible station**.