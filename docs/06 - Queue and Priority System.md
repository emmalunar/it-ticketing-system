# 06 — Queue and Priority System

## 1. Purpose

This document defines how IT tickets are prioritised, ordered, displayed, escalated, and removed from the active support queue.

The queue system must ensure that:

- P1 tickets receive immediate attention.
- P2 tickets receive higher priority than normal P3 tickets.
- P3 tickets are handled through the standard queue.
- Queues are station-specific.
- Only active tickets participate in the queue.
- Queue positions are dynamic.
- An assigned/claimed ticket is no longer considered unattended.
- Escalation is based on the time a ticket remains unattended.
- Reopened tickets return to the appropriate active workflow.
- Users can see applicable queue information without exposing other users' private information.

---

# 2. Priority Levels

The system has three ticket priority levels.

| Priority | User Category | Queue | Unattended Escalation |
|---|---|---|---|
| P1 | CEO / Executive | Bypasses queue | Immediate notification |
| P2 | Manager / Consultant | Yes | 10 minutes |
| P3 | Standard employee | Yes | 60 minutes |

Priority is automatically inherited from the ticket owner's account.

Users must not manually select their ticket priority.

---

# 3. P1 — Critical Priority

P1 tickets belong to CEOs and executives.

A P1 ticket:

- Does not enter the normal queue.
- Does not receive a normal queue position.
- Is immediately routed to the selected station.
- Immediately notifies relevant agents at that station.
- Can be claimed immediately.
- Receives priority handling over P2/P3 tickets.

Conceptually:

```text id="m0z91x"
P1 Ticket Created
       ↓
Selected Station
       ↓
Immediate Notification
       ↓
Agent Handles Ticket
```

P1 must remain logically separate from the normal queue.

---

# 4. P2 — High Priority

P2 tickets belong to managers and consultants.

P2 tickets enter the station queue.

Within a station, P2 tickets take precedence over P3 tickets.

Example:

```text id="q5sh7c"
Head Office

P2 Ticket A
P2 Ticket B
P3 Ticket C
P3 Ticket D
```

The presence of P2 tickets means newly created P3 tickets should normally remain behind applicable P2 tickets.

A P2 ticket that remains unattended for 10 minutes triggers an escalation notification.

---

# 5. P3 — Normal Priority

P3 tickets belong to standard users.

P3 tickets enter the station queue.

They are processed after applicable P2 tickets under the normal priority ordering.

A P3 ticket that remains unattended for 60 minutes triggers an escalation notification.

---

# 6. Station-Specific Queues

There is not one global queue.

Each station has its own active queue.

For the current system:

```text id="r8g5f2"
Head Office Queue

P2 tickets
P3 tickets
```

and:

```text id="f8s1z7"
Babylove - Tesano Queue

P2 tickets
P3 tickets
```

A ticket at Head Office must not affect the queue position of a ticket at Babylove - Tesano.

---

# 7. Queue Eligibility

A ticket participates in the normal queue only when all applicable conditions are satisfied.

A ticket must:

- Be P2 or P3.
- Belong to the relevant station.
- Be active.
- Not be closed.
- Not be resolved and awaiting feedback.
- Not otherwise be excluded by the workflow.

The following statuses are normally queue-eligible:

```text id="5w1a7k"
QUEUED
```

A ticket in `IN_PROGRESS` is not waiting in the queue.

A ticket in `WAITING_USER` is not waiting for an agent and should not occupy the waiting queue.

A `RESOLVED` ticket is not in the active queue.

A `CLOSED` ticket is not in the active queue.

---

# 8. Queue Ordering

The default queue ordering should be:

1. P2 before P3.
2. Within the same priority, older tickets before newer tickets.

Therefore:

```text id="x8e0v2"
P2 — 09:00
P2 — 09:20
P3 — 08:30
P3 — 09:10
```

would be ordered:

```text id="n6qk9a"
1. P2 — 09:00
2. P2 — 09:20
3. P3 — 08:30
4. P3 — 09:10
```

This provides predictable priority handling while maintaining first-in-first-out ordering within each priority level.

---

# 9. P1 Exclusion

P1 tickets must never be included when calculating:

- P2 queue position.
- P3 queue position.
- Number of tickets ahead.
- Normal queue length.

For example:

```text id="7q9x8c"
P1
P2
P2
P3
```

The P2/P3 queue is treated as:

```text id="4u0p6d"
P2
P2
P3
```

The P1 ticket is handled separately.

---

# 10. Meaning of "Tickets Ahead"

For a P2 or P3 ticket, "tickets ahead" means active queue-eligible tickets at the same station that currently have a higher effective queue position.

A ticket must not count itself.

The system should calculate this dynamically rather than permanently storing a queue position number.

Example:

```text id="l3u2oa"
Queue:

P2 Ticket A
P2 Ticket B
P3 Ticket C
P3 Ticket D
```

For Ticket D:

```text id="q5x3cn"
Tickets ahead = 3
```

For Ticket C:

```text id="2d6v5r"
Tickets ahead = 2
```

---

# 11. Dynamic Queue Position

Queue position must not be treated as a permanent ticket property.

Suppose:

```text id="p3x1f8"
Ticket A
Ticket B
Ticket C
```

Ticket C initially has:

```text id="u7m4w1"
2 tickets ahead
```

If Ticket A is resolved:

```text id="3j8x1n"
Ticket B
Ticket C
```

Ticket C now has:

```text id="w2n6f4"
1 ticket ahead
```

The system should calculate this from the current state of the queue.

---

# 12. Claimed Tickets and Queue Position

Once an agent claims a ticket:

```text id="3v8b0p"
QUEUED
   ↓
IN_PROGRESS
```

it is removed from the waiting queue.

It should therefore no longer count as a ticket ahead of another waiting ticket.

This means queue position can change immediately when an agent claims a ticket.

---

# 13. Waiting-for-User Tickets

A ticket in:

```text id="n2y7k9"
WAITING_USER
```

does not count as a waiting ticket in the normal agent queue.

The agent has already taken responsibility for it.

However, the ticket remains active.

Example:

```text id="a6w9x3"
Ticket A → WAITING_USER
Ticket B → QUEUED
Ticket C → QUEUED
```

Tickets B and C should not count Ticket A as an available ticket ahead of them.

---

# 14. Resolved Tickets

A resolved ticket is removed from the active queue.

It remains in:

```text id="5r8y3c"
RESOLVED
```

while awaiting feedback.

It must not occupy a queue position.

If the user submits positive feedback:

```text id="6k2w9a"
RESOLVED → CLOSED
```

If the user submits negative feedback:

```text id="4s7p2d"
RESOLVED → REOPENED
```

---

# 15. Reopened Tickets

A reopened ticket becomes active again.

It must return to the appropriate workflow based on its priority.

### P1

The ticket returns to immediate P1 handling and does not enter the normal queue.

### P2/P3

The ticket returns to the applicable station queue.

The system should treat reopening as a new active queue event rather than restoring the ticket's old queue position.

Recommended behaviour:

```text id="v4y9q2"
Negative Feedback
       ↓
REOPENED
       ↓
Return to station queue
       ↓
Queue position recalculated
```

The original ticket creation timestamp and complete history remain unchanged.

A separate `reopened_at` event/time should be recorded.

---

# 16. Reopened Ticket Priority

A reopened ticket retains the priority determined by its owner unless an authorised administrator changes it.

For example:

```text id="8x2r6m"
P2 User
   ↓
Ticket P2
   ↓
Resolved
   ↓
Negative Feedback
   ↓
Reopened
   ↓
Still P2
```

The ticket does not automatically become P1 merely because it was reopened.

---

# 17. Transfer Between Stations

When a P2/P3 ticket is transferred:

```text id="q7s1r4"
Station A
   ↓
Transfer
   ↓
Station B
```

the ticket leaves Station A's active queue.

It enters Station B's applicable queue if it is still waiting for agent handling.

Queue position is recalculated based on Station B's queue.

The ticket's original creation timestamp remains unchanged, but the transfer event and new station timestamp should be recorded.

---

# 18. Transfer of an In-Progress Ticket

If an in-progress ticket is transferred:

```text id="c6m4z8"
IN_PROGRESS
   ↓
Transfer
   ↓
Receiving Agent / Station
```

it should not automatically become an unattended ticket simply because responsibility changed.

The receiving agent/station becomes responsible according to the transfer operation.

If no receiving agent is assigned, the system may place the ticket back into the receiving station's active queue.

This behaviour must be explicit in the transfer operation.

---

# 19. Unattended Escalation

Escalation is based on **unattended time**, not total ticket age.

### P2

```text id="5p9h2c"
Created
   ↓
Unattended for 10 minutes
   ↓
Escalation
```

### P3

```text id="n7k3x1"
Created
   ↓
Unattended for 60 minutes
   ↓
Escalation
```

The timer must stop once an agent claims or is assigned responsibility.

---

# 20. Escalation Must Not Depend on Unresolved Status Alone

The system must not implement:

```text id="j5z7n3"
"If unresolved for X minutes → escalate"
```

as the sole condition.

Instead:

```text id="r2q8m6"
IF
ticket is active
AND
ticket is unattended
AND
ticket has exceeded its escalation threshold
THEN
send escalation
```

This distinction is important.

An in-progress ticket can remain unresolved without triggering the unattended escalation.

---

# 21. Escalation Notification Recipients

### P1

Immediate notification goes to relevant agents at the selected station.

### P2

After 10 unattended minutes:

- Relevant agents at the current station receive escalation notification.

### P3

After 60 unattended minutes:

- Relevant agents at the current station receive escalation notification.

The system should not repeatedly send the same unattended escalation unless a separate escalation policy is introduced.

---

# 22. Escalation After Transfer

The escalation timer must respect the ticket's current ownership state.

If an unattended P2 ticket is transferred to another station:

```text id="w5s2a9"
Station A
   ↓
Transfer
   ↓
Station B
```

the receiving station becomes responsible for the ticket.

The system must avoid generating duplicate escalation notifications based on stale Station A state.

The implementation should record the transfer event and recalculate the applicable escalation state.

---

# 23. Escalation State

Each escalation event should be traceable.

Conceptually, the system should be able to determine:

```text id="z3q8v5"
Escalation Required?
Escalation Sent?
Escalation Sent At?
Escalation Type?
```

For example:

```text id="a8d3k7"
Ticket: IT-2026-000125
Priority: P2
Created: 09:00
Claimed: 09:17
Escalation Threshold: 10 minutes
Escalation Sent: No
Reason: Ticket was claimed before escalation deadline
```

---

# 24. Exact Timing

The system should use a consistent server-side timezone policy.

The business rule is based on:

```text id="m8v4q1"
GMT / UTC
```

The application should store timestamps in UTC and convert them for display where necessary.

For escalation:

```text id="h2k6s9"
created_at
+
10 minutes → P2 escalation deadline

created_at
+
60 minutes → P3 escalation deadline
```

However, the timer is valid only while the ticket remains unattended.

---

# 25. P1 Notification vs Escalation

P1 immediate notification is different from P2/P3 unattended escalation.

### P1

```text id="e8r2n6"
Ticket created
→ Immediate notification
```

### P2

```text id="p4m7x1"
Ticket created
→ Wait 10 minutes if unattended
→ Escalation
```

### P3

```text id="c9v5k3"
Ticket created
→ Wait 60 minutes if unattended
→ Escalation
```

The system should represent these as separate notification/event types.

---

# 26. Queue and Agent Availability

The queue should represent waiting work; it should not assume that every agent is always available.

An agent may be:

- Active.
- Inactive.
- Unavailable.
- Assigned to multiple stations.

The current MVP does not need a sophisticated presence/availability system.

However, the architecture should allow this to be added later.

---

# 27. Multiple Station Assignments

An agent may eventually be assigned to multiple stations.

Example:

```text id="s7n4q2"
Agent A
 ├── Head Office
 └── Babylove - Tesano
```

The agent may therefore receive authorised ticket visibility from both stations.

This must not create duplicate tickets in the system.

A ticket belongs to one current station at a time.

---

# 28. Multiple Agents at One Station

A station may have multiple agents.

Example:

```text id="w3f8m2"
Head Office
 ├── Agent A
 └── Agent B
```

Both authorised agents may see eligible unassigned tickets.

Once one agent claims a ticket, the system must prevent the other agent from simultaneously claiming it.

---

# 29. Queue Ordering Example

Suppose Head Office has:

```text id="r6y2k8"
P2-A — 08:00
P3-A — 08:05
P2-B — 08:10
P3-B — 08:15
P3-C — 08:20
```

The effective queue becomes:

```text id="q4n8z1"
1. P2-A — 08:00
2. P2-B — 08:10
3. P3-A — 08:05
4. P3-B — 08:15
5. P3-C — 08:20
```

This illustrates that priority takes precedence over creation time between different priority classes.

---

# 30. What Happens When a New P2 Arrives?

Suppose the current queue is:

```text id="u6p3d8"
P2-A
P3-A
P3-B
```

A new P2 ticket arrives:

```text id="j4k9s2"
P2-B
```

The queue becomes:

```text id="f8q5v1"
P2-A
P2-B
P3-A
P3-B
```

The new P2 ticket therefore moves ahead of existing P3 tickets.

This is intentional and reflects the priority model.

---

# 31. Fairness Within Priority

Within the same priority level, the system should use first-in-first-out ordering.

For example:

```text id="s2k8m5"
P2-A — 09:00
P2-B — 09:05
P2-C — 09:10
```

The order remains:

```text id="b5x1n9"
P2-A
P2-B
P2-C
```

unless a valid workflow event changes their queue eligibility.

---

# 32. No Manual Queue Manipulation

Normal agents should not be able to arbitrarily move tickets up or down the queue.

Queue position should be determined by:

- Priority.
- Queue eligibility.
- Station.
- Queue entry/re-entry time according to the defined rules.

Administrators may intervene when necessary, but such intervention must be recorded.

---

# 33. Administrative Queue Intervention

An administrator may need to:

- Reassign a ticket.
- Transfer a ticket.
- Correct a priority classification.
- Resolve an operational exception.

Administrative actions must:

- Follow authorization rules.
- Record the reason where appropriate.
- Create an audit event.
- Preserve previous values.

The system should avoid allowing administrators to silently alter historical queue information.

---

# 34. Queue Metrics

The system should maintain enough information to calculate:

- Number of active tickets.
- Number of P1 tickets.
- Number of P2 tickets.
- Number of P3 tickets.
- Number of unattended tickets.
- Number of escalated tickets.
- Average waiting time.
- Average handling time.
- Resolution time.
- Reopened ticket count.
- Tickets by station.

These metrics will support future reporting and dashboard functionality.

---

# 35. Recommended Data Needed for Queue Logic

The ticket model should contain or provide access to information such as:

```text id="x7m2p9"
ticket_number
priority
status
current_station
current_assignee
created_at
queued_at
claimed_at
resolved_at
closed_at
reopened_at
```

Assignment and transfer history should be stored separately where appropriate.

Escalation events should also be stored separately rather than relying entirely on a single boolean field.

---

# 36. Queue Algorithm

The conceptual algorithm is:

```text id="k9r4s7"
1. Select active tickets.
2. Exclude P1 from the normal queue.
3. Filter by station.
4. Exclude tickets not waiting for agent handling.
5. Group by priority.
6. Order P2 by queue-entry time.
7. Order P3 by queue-entry time.
8. Combine P2 before P3.
9. Calculate position dynamically.
```

The final implementation must use database queries efficiently rather than loading every ticket into application memory for every queue request.

---

# 37. Queue Position Calculation

For a P2/P3 ticket:

```text id="w4n7c2"
position =
number of eligible tickets ahead
+
1
```

The exact query should account for:

- Current station.
- Current status.
- Priority.
- Queue-entry time.
- Reopening.
- Transfers.

The position should be calculated against the current database state.

---

# 38. Queue Integrity

The system must prevent:

- P1 appearing in the normal queue.
- Closed tickets appearing in the queue.
- Resolved tickets appearing in the queue.
- Tickets from another station affecting local queue position.
- Unauthorised users viewing queue information.
- Two agents claiming the same ticket.
- Duplicate escalation events caused by repeated background-task execution.

---

# 39. Background Processing

Queue escalation should be handled by the backend/background task system.

The recommended infrastructure is:

```text id="r8q3v6"
Django
   ↓
Celery
   ↓
Redis
```

Celery workers can periodically identify tickets that:

- Remain unattended.
- Have reached their escalation threshold.
- Have not already received the relevant escalation.

The system should use database-level safeguards/idempotency so repeated task execution cannot produce duplicate escalation notifications.

---

# 40. Queue Rules Summary

The final MVP rules are:

```text id="z5m1x8"
P1
→ No queue
→ Immediate notification
→ Immediate handling

P2
→ Station queue
→ Ahead of P3
→ FIFO within P2
→ Escalate after 10 unattended minutes

P3
→ Station queue
→ Behind P2
→ FIFO within P3
→ Escalate after 60 unattended minutes
```

Additional rules:

```text id="p7s3k4"
Claimed ticket
→ No longer unattended

IN_PROGRESS
→ Not in waiting queue

WAITING_USER
→ Not in waiting queue

RESOLVED
→ Not in waiting queue

CLOSED
→ Not in waiting queue

REOPENED P2/P3
→ Return to applicable station queue

REOPENED P1
→ Immediate P1 handling
```

---

# 41. Final Design Principle

The queue should answer one simple operational question:

> **Which waiting ticket should the IT team handle next?**

The answer is determined by:

```text id="n6x4q9"
STATION
   +
PRIORITY
   +
QUEUE ELIGIBILITY
   +
QUEUE ENTRY TIME
```

The queue must remain dynamic, predictable, auditable, and independent of the frontend implementation.