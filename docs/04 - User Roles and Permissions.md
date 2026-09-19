# User Roles and Permissions

## 1. Purpose

This document defines the roles, access levels, visibility rules, and permissions for the IT Ticketing System.

The permission model must ensure that:

- Users can access only information appropriate to their role.
- Agents can work on tickets relevant to their assigned stations.
- Administrators have system-wide management capabilities.
- Internal agent communication is never exposed to ordinary users.
- Temporary consultant accounts automatically lose access after their expiry date.
- Permissions are enforced by the backend and cannot be bypassed through the frontend or API.

The system follows a **deny-by-default** security model. A user may perform an action only when their role and the relevant business rules explicitly permit it.

---

# 2. Roles and Priority Levels

Roles and priority levels are separate concepts.

## 2.1 System Roles

The system has three primary roles:

| Role | Description |
|---|---|
| USER | Employee who submits and follows up on IT tickets |
| AGENT | IT support personnel who receive, manage, assign, and resolve tickets |
| ADMIN | Authorised personnel responsible for system configuration and administration |

A user's priority level does not create a separate system role.

---

## 2.2 User Priority Levels

Users have one of three priority levels:

| Priority | User Category | Queue Behaviour |
|---|---|---|
| P1 | CEO / Executive | Immediate handling; bypasses normal queue |
| P2 | Manager / Consultant | Normal queue with 10-minute unattended escalation |
| P3 | Standard employee | Normal queue with 60-minute unattended escalation |

Priority is determined by the user's account configuration and **must not be selected manually when creating a ticket**.

---

# 3. User Permissions

A USER can:

- Log into the system.
- View their own profile information.
- Submit a new IT ticket.
- Select the station associated with the problem.
- Select a problem type.
- Provide a brief description of the problem.
- Add permitted attachments.
- View their own tickets.
- View the current status of their tickets.
- View applicable queue information.
- View the number of applicable tickets ahead of their P2/P3 ticket.
- Communicate with the assigned IT agent through the ticket.
- Receive predefined notices from agents.
- Receive system notifications relating to their tickets.
- Receive resolution notifications.
- Submit feedback after a ticket is resolved.
- Reopen a ticket through negative feedback.
- View the history of their own tickets where appropriate.

A USER cannot:

- View another user's tickets.
- View internal agent-to-agent messages.
- Assign tickets.
- Claim tickets.
- Transfer tickets.
- Change ticket priority.
- Change another user's information.
- Resolve a ticket on behalf of an agent.
- Close a ticket directly.
- Modify system configuration.
- Manage users, stations, problem types, or response templates.
- Access administrative reports unless explicitly granted administrative permission.

---

# 4. P1 User Permissions

P1 users are still ordinary system users from an access-control perspective.

Their P1 status primarily affects **ticket priority and routing**, not administrative permissions.

A P1 user can perform all standard USER actions.

When a P1 user submits a ticket:

1. The ticket is assigned P1 priority automatically.
2. The ticket is routed to the selected station.
3. The ticket bypasses the normal queue.
4. Agents assigned to that station receive immediate notification.
5. The user does not receive a normal queue position.

A P1 user cannot manually change their priority.

---

# 5. P2 User Permissions

P2 users can perform the same standard USER actions.

When a P2 user submits a ticket:

1. The ticket is automatically classified as P2.
2. The ticket enters the queue for the selected station.
3. The ticket receives a dynamic queue position.
4. If the ticket remains unattended for 10 minutes, an escalation notification is sent to the relevant station agents.

The 10-minute escalation applies only while the ticket remains unattended.

Once an agent claims or is assigned responsibility for the ticket, it is no longer considered unattended.

---

# 6. P3 User Permissions

P3 users have the standard USER permissions.

When a P3 user submits a ticket:

1. The ticket is automatically classified as P3.
2. The ticket enters the queue for the selected station.
3. The ticket receives a dynamic queue position.
4. If the ticket remains unattended for 60 minutes, an escalation notification is sent to the relevant station agents.

The escalation stops applying once an agent accepts, claims, or is assigned responsibility for the ticket.

---

# 7. Agent Permissions

Agents are IT support personnel.

An AGENT can:

- Log into the system.
- View tickets within stations to which they are assigned.
- View ticket details for tickets they are authorised to access.
- Claim/accept tickets.
- Accept responsibility for a ticket.
- Communicate with the ticket user.
- Send predefined notices.
- Add permitted attachments.
- Update ticket status.
- Add resolution information.
- Resolve tickets.
- Transfer tickets to another station.
- Assign or transfer tickets to another authorised agent where permitted.
- View relevant ticket history.
- Receive station-based notifications.
- Receive escalation notifications.
- Communicate privately with other agents.
- Add internal notes/messages.
- View internal agent communication for tickets they are authorised to work on.
- Search tickets within their permitted scope.

---

# 8. Station-Based Agent Access

Agent access is initially controlled by station assignment.

For example:

- Agent A → Head Office
- Agent B → Head Office
- Agent C → Babylove - Tesano
- Agent D → Babylove - Tesano

An agent can normally view and work on tickets belonging to their assigned station.

Agents must **not** automatically have access to tickets from every station.

### Exception: Ticket Transfer

When a ticket is transferred between stations, the receiving station's authorised agents must gain access to the ticket so they can continue the support process.

The transfer must be recorded in the ticket history.

Example:

```text
Head Office
      ↓
Ticket transferred
      ↓
Babylove - Tesano
      ↓
Babylove - Tesano agents gain access
```

The system must retain the complete history of the transfer.

---

# 9. Agent Claiming and Assignment

An agent can claim an eligible unassigned ticket.

When an agent claims a ticket:

- The agent becomes responsible for the ticket.
- The ticket is no longer considered unattended.
- The applicable unattended escalation timer stops.
- Other agents should see that the ticket has been claimed.
- The assignment/claim event is recorded in the audit history.

The system must prevent two agents from successfully claiming the same ticket simultaneously.

This must be enforced at the backend/database level rather than relying only on frontend controls.

---

# 10. Agent-to-User Communication

Agents may communicate with the user through the ticket conversation.

These messages are visible to:

- The assigned/authorised agent(s)
- The ticket owner/user

Examples include:

- Requests for additional information.
- Instructions to the user.
- Updates about the support process.
- Resolution explanations.

User-facing communication must be stored separately from internal agent communication.

---

# 11. Internal Agent Communication

Agents must have a mechanism for communicating privately with other agents.

Internal messages may contain:

- Troubleshooting discussions.
- Technical observations.
- Handover information.
- Escalation discussions.
- Internal instructions.
- Diagnostic information.

Internal messages must be marked as **INTERNAL**.

They must never be displayed to the ticket user.

The backend must enforce this visibility restriction.

A frontend-only hiding mechanism is not sufficient.

---

# 12. Ticket Transfer Permissions

An agent may transfer a ticket when the issue requires assistance from another station or agent.

A transfer must record:

- Previous station.
- New station.
- Previous assignee, if applicable.
- New assignee, if applicable.
- Agent who initiated the transfer.
- Date and time.
- Reason for transfer, where required.

After transfer:

- The receiving station becomes the active station for routing purposes.
- Authorised agents at the receiving station can access the ticket.
- The previous station should no longer receive normal station-specific notifications unless explicitly included by the system's notification rules.
- The transfer remains permanently visible in the ticket audit history.

---

# 13. Resolution Permissions

Only an authorised AGENT or ADMIN can mark a ticket as resolved.

When an agent resolves a ticket:

1. The agent provides resolution information.
2. The ticket enters the RESOLVED state.
3. The system generates a secure feedback token.
4. The user receives the feedback link.
5. The ticket is removed from the active queue.
6. The applicable feedback expiry time is calculated.

A USER cannot directly mark their ticket as resolved.

---

# 14. Feedback Permissions

Only the ticket owner/user may submit feedback for their ticket.

The feedback mechanism must use a secure, unique token.

A feedback token:

- Is associated with one ticket.
- Has a defined expiration time.
- Can be successfully used only once.
- Becomes invalid immediately after successful submission.
- Cannot be reused.

Positive feedback results in:

```text
RESOLVED → CLOSED
```

Negative feedback results in:

```text
RESOLVED → REOPENED
```

A reopened ticket returns to the active support workflow.

---

# 15. Feedback Visibility

The ticket user can submit feedback through the feedback interface.

Agents may view feedback associated with tickets they are authorised to access.

Administrators may access feedback for reporting and administrative purposes.

Feedback must not expose internal agent-only messages to the user.

---

# 16. Admin Permissions

The ADMIN role has system-wide administrative privileges.

An administrator can:

### User Management

- Create users.
- Edit users.
- Activate/deactivate users.
- Assign user priority levels.
- Assign users to relevant organisational/station information.
- Manage agent accounts.
- Manage consultant accounts.
- Set consultant expiration dates.

### Station Management

- Create stations.
- Edit stations.
- Activate/deactivate stations.
- Assign agents to stations.
- Manage agent-station relationships.

### Problem Type Management

- Create problem types.
- Edit problem types.
- Activate/deactivate problem types.
- Organise problem types into categories.

### Response Template Management

- Create predefined response templates.
- Edit templates.
- Activate/deactivate templates.
- Control where templates are available.

### Ticket Management

Administrators may:

- View all tickets.
- Search all tickets.
- View ticket history.
- View assignments.
- View transfers.
- View internal messages where authorised by administrative policy.
- Reassign tickets.
- Transfer tickets.
- Update ticket status where necessary.
- Resolve or close tickets when performing administrative intervention.

Administrative intervention must be recorded in the audit log.

---

# 17. Consultant Account Rules

Consultants are treated as temporary users.

A consultant account must contain an expiration date.

Before expiration:

- The consultant can use the system according to their assigned role and priority.

At expiration:

- The account becomes inactive automatically.
- The consultant can no longer authenticate.
- New access to the system is denied.

Historical records must remain intact.

The system must not delete tickets, messages, feedback, audit records, or other historical information merely because a consultant account expires.

Where historical records reference the consultant, the system should retain the relevant identity information required for auditability.

---

# 18. Access After Account Deactivation

When an account becomes inactive:

```text
ACTIVE ACCOUNT
      ↓
Expiration / Deactivation
      ↓
LOGIN BLOCKED
      ↓
Historical Records Retained
```

Deactivation must not result in deletion of historical records.

The system should distinguish between:

- `is_active = true`
- `is_active = false`

and historical record ownership.

---

# 19. Reporting Permissions

### USER

Users should have access only to information relating to their own tickets.

### AGENT

Agents can view operational information within their authorised station/ticket scope.

Examples:

- Assigned tickets.
- Station queue.
- Resolution workload.
- Ticket status.
- Personal/agent workload.

### ADMIN

Administrators have access to system-wide reports.

Examples:

- Tickets by station.
- Tickets by priority.
- Tickets by problem type.
- Resolution times.
- Reopened tickets.
- Feedback results.
- Agent workload.
- Escalations.
- Ticket transfers.
- Monthly/periodic ticket trends.

---

# 20. Search Permissions

Search must follow the same access-control rules as normal ticket viewing.

A user searching the system must not be able to discover records they are not authorised to view.

### USER

Can search their own tickets.

### AGENT

Can search tickets within their authorised scope.

### ADMIN

Can search system-wide records.

Search must not become an indirect method of bypassing ticket permissions.

---

# 21. Notification Permissions

Users receive notifications relevant to their own tickets.

Agents receive notifications relevant to:

- Their assigned stations.
- Tickets assigned to them.
- Tickets transferred to their station.
- Applicable P1 tickets.
- P2 unattended escalations.
- P3 unattended escalations.
- Relevant internal events.

Administrators may receive administrative/system notifications where configured.

Notifications must not reveal information to users that they are not authorised to access.

---

# 22. Permission Matrix

| Action | USER | AGENT | ADMIN |
|---|---:|---:|---:|
| Login | ✓ | ✓ | ✓ |
| View own profile | ✓ | ✓ | ✓ |
| Create ticket | ✓ | ✓* | ✓* |
| View own tickets | ✓ | ✓ | ✓ |
| View authorised station tickets | — | ✓ | ✓ |
| View all tickets | — | — | ✓ |
| View queue | Own applicable queue | Authorised station | All |
| Claim ticket | — | ✓ | ✓ |
| Assign ticket | — | ✓ | ✓ |
| Transfer ticket | — | ✓ | ✓ |
| Send user-facing message | — | ✓ | ✓ |
| Send internal message | — | ✓ | ✓ |
| View internal messages | — | ✓** | ✓ |
| Send predefined notice | — | ✓ | ✓ |
| Change ticket status | — | ✓ | ✓ |
| Resolve ticket | — | ✓ | ✓ |
| Close ticket | Feedback-driven | — | ✓ |
| Submit feedback | ✓ | If also ticket owner | ✓ if acting as user is supported |
| Reopen through feedback | ✓ | If also ticket owner | ✓ |
| Search own tickets | ✓ | ✓ | ✓ |
| Search authorised tickets | — | ✓ | ✓ |
| Search all tickets | — | — | ✓ |
| View operational reports | Limited | Station scope | System-wide |
| Manage users | — | — | ✓ |
| Manage stations | — | — | ✓ |
| Manage problem types | — | — | ✓ |
| Manage response templates | — | — | ✓ |
| Manage configuration | — | — | ✓ |
| View audit logs | — | Limited | ✓ |
| Manage backups/system settings | — | — | ✓ |

`*` Agent/Admin ticket creation is an administrative/operational capability and may be restricted depending on the final workflow.

`**` Agents may view internal communication only for tickets within their authorised scope.

---

# 23. Ticket Visibility Rules

Ticket visibility must be evaluated independently from ticket modification permissions.

The following concepts must be treated separately:

```text
Can See Ticket?
        ↓
Can View Details?
        ↓
Can Communicate?
        ↓
Can Modify?
        ↓
Can Assign/Transfer?
        ↓
Can Resolve?
```

Having permission to perform one action does not automatically grant permission to perform all other actions.

For example:

- An agent may be able to view a ticket but not resolve it.
- An agent may be able to view a transferred ticket but not modify certain historical information.
- A user may view their ticket but cannot change its priority.
- An administrator may have system-wide visibility and intervention privileges.

---

# 24. Backend Authorization

All permissions must be enforced by the backend.

The system must **not** rely on:

- Hidden frontend buttons.
- Disabled UI controls.
- Client-side role checks alone.
- URL obscurity.
- Guessing or hiding ticket IDs.

The backend must verify:

1. Authenticated identity.
2. Account status.
3. User role.
4. User priority where relevant.
5. Station assignment.
6. Ticket ownership.
7. Ticket assignment.
8. Ticket status.
9. Requested operation.
10. Relevant business rules.

An unauthorised API request must be rejected even if the request is manually constructed outside the frontend.

---

# 25. Deny-by-Default Rule

The application must follow:

> If permission is not explicitly granted, access must be denied.

This rule applies to:

- Pages.
- API endpoints.
- WebSocket connections.
- Ticket records.
- Messages.
- Attachments.
- Reports.
- Administrative functions.
- Audit records.

---

# 26. WebSocket Authorization

Real-time communication must use the same authorization model as the REST API.

Before an agent receives real-time ticket updates, the system must verify that the agent is authorised to access the relevant ticket.

A user must receive real-time updates only for tickets they are authorised to view.

Internal agent messages must never be broadcast to user-facing WebSocket channels.

---

# 27. Attachment Permissions

Attachments must follow the visibility of the message or ticket information to which they belong.

If an attachment belongs to an internal agent message:

```text
Agent → Agent
Attachment → INTERNAL
User → No Access
```

If an attachment belongs to a user-agent conversation:

```text
User ↔ Agent
Attachment → USER + AUTHORISED AGENTS
```

Direct attachment URLs must not bypass authorization.

---

# 28. Audit Requirements

Important permission-sensitive actions must be recorded.

At minimum, audit records should capture:

- Actor.
- Action.
- Target object.
- Previous value where applicable.
- New value where applicable.
- Timestamp.
- Relevant station.
- Relevant ticket.
- Request/source information where appropriate.

Examples:

```text
Agent claimed ticket
Agent transferred ticket
Agent reassigned ticket
Admin changed user priority
Admin changed station assignment
Admin deactivated account
Consultant account expired
Agent resolved ticket
Admin performed intervention
```

Audit records should not normally be editable or physically deleted through the application.

---

# 29. Permission Design Principles

The implementation should follow these principles:

### Principle 1 — Least Privilege

Users receive only the permissions required for their work.

### Principle 2 — Backend Enforcement

Permissions are enforced server-side.

### Principle 3 — Station Isolation

Agents operate within their authorised station scope unless a valid transfer or administrative permission changes that scope.

### Principle 4 — Separation of Communication

User-facing communication and internal agent communication are separate.

### Principle 5 — Priority Does Not Equal Role

P1, P2, and P3 determine ticket handling behaviour; they do not create administrative privileges.

### Principle 6 — Historical Integrity

Deactivating a user must not destroy historical records.

### Principle 7 — Auditability

Permission-sensitive actions must be traceable.

### Principle 8 — No Permission Inference

The system must not assume that access to one resource grants access to related resources.

### Principle 9 — Explicit Authorization

Every protected operation must have an explicit authorization check.

### Principle 10 — Secure by Default

New functionality should begin with no access until an appropriate permission is explicitly defined.

---

# 30. Implementation Requirement

Claude Code must implement authorization as a central, reusable backend concern rather than scattering ad-hoc role checks throughout the application.

The authorization design should support future expansion such as:

- Additional stations.
- Agents assigned to multiple stations.
- Additional administrative roles.
- More granular permissions.
- Active Directory/LDAP.
- Single Sign-On.
- Department-based access.
- Asset-level permissions.

The implementation must avoid hard-coding the current two stations or current number of agents into authorization logic.

---

# 31. Open Design Decision

The system currently defines:

```text
USER
AGENT
ADMIN
```

with:

```text
P1
P2
P3
```

as priority levels.

Before database implementation, the project should confirm whether future administrative roles require more granular permissions, such as:

```text
SUPER_ADMIN
IT_MANAGER
ADMIN
AGENT
```

For the MVP, however, the three-role model is sufficient unless the organisation requires additional separation of administrative responsibilities.

---

# 32. Summary

The permission model is based on three independent dimensions:

```text
ROLE
  +
PRIORITY
  +
STATION SCOPE
```

For example:

```text
Employee
Role: USER
Priority: P3
Station: Head Office
```

or:

```text
IT Support Officer
Role: AGENT
Priority: N/A
Stations: Head Office + Babylove - Tesano
```

or:

```text
System Administrator
Role: ADMIN
Priority: N/A
Station Scope: System-wide
```

This separation provides a foundation for implementing secure and scalable authorization without tying permissions directly to the current organisational structure.