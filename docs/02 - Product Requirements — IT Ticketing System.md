# Product Requirements — IT Ticketing System

**Document:** `product-requirements.md`  
**Version:** 1.0  
**Status:** Draft / Initial Specification  
**System:** Internal IT Ticketing and Support Management System  
**Timezone:** GMT (UTC+0)

---

# 1. Product Overview

The IT Ticketing System is an internal web-based application designed to help the organisation's IT department receive, organise, prioritise, assign, track, communicate about, resolve, and report on employee IT problems.

The system will operate primarily on the organisation's internal network (intranet).

The application will provide separate experiences for:

- Normal users
- Priority users
- IT agents
- Administrators

The system will route tickets according to the user's selected station and will apply different handling rules according to the user's priority level.

---

# 2. Product Goals

The system should:

1. Provide a central location for reporting IT problems.
2. Reduce informal reporting through calls, messages, and verbal requests.
3. Ensure tickets reach the correct IT support station.
4. Help agents manage and prioritise support requests.
5. Provide visibility into outstanding IT problems.
6. Allow users and agents to communicate through the ticket.
7. Allow agents to communicate internally.
8. Automatically escalate unattended tickets.
9. Provide a structured resolution and feedback process.
10. Maintain a complete history of support activities.
11. Provide administrators with operational and performance information.

---

# 3. Scope

## 3.1 Included in Initial System

The initial system will include:

- User authentication
- User accounts
- Priority classification
- Station management
- Problem type selection
- Ticket creation
- Ticket queue
- Ticket assignment
- Ticket transfer
- User-agent communication
- Agent-to-agent internal communication
- Predefined agent notices
- Ticket status management
- Priority-based escalation
- Email notifications
- In-app notifications
- Ticket resolution
- Feedback
- Ticket reopening
- Ticket closure
- Temporary consultant accounts
- Audit history
- Administrative management
- Basic reporting

---

## 3.2 Future Features

The following may be introduced later:

- Active Directory / LDAP integration
- Company-wide single sign-on
- Advanced analytics
- Asset management
- Hardware inventory
- Knowledge base
- Automated troubleshooting suggestions
- AI-assisted ticket classification
- AI-assisted responses
- Mobile application
- Integration with enterprise systems
- Advanced SLA management

These features are not required for the initial version.

---

# 4. User Types

## 4.1 Normal User

A normal employee who needs IT support.

The user can:

- sign in
- report a problem
- select a station
- select a problem type
- describe the problem
- view submitted tickets
- view ticket status
- view queue position
- communicate with IT
- receive notifications
- respond to resolution feedback

---

## 4.2 Priority User 2

A manager or consultant who requires priority support.

The user has all normal user capabilities but receives P2 treatment.

Consultants are temporary users and must have an account expiration date.

---

## 4.3 Priority User 1

A CEO/executive user.

The user receives immediate priority treatment.

P1 tickets bypass the normal queue.

---

## 4.4 Agent

An IT support employee responsible for handling tickets.

Agents:

- belong to one or more stations
- see tickets they are authorised to handle
- claim tickets
- communicate with users
- communicate internally with other agents
- transfer tickets
- resolve tickets
- view ticket history

---

## 4.5 Administrator

An administrator manages the system and has organisation-wide visibility.

Administrators can manage:

- users
- agents
- stations
- priority classifications
- problem types
- response templates
- system settings
- tickets
- reports
- audit logs

---

# 5. Authentication

## PR-AUTH-001

All users must authenticate before accessing the application.

## PR-AUTH-002

Users must only access functionality permitted by their role.

## PR-AUTH-003

Inactive accounts must not be able to log in.

## PR-AUTH-004

Expired temporary consultant accounts must automatically become inactive.

## PR-AUTH-005

The authentication architecture should allow future integration with the organisation's Active Directory/LDAP infrastructure.

---

# 6. User Dashboard

After logging in, a normal user should be presented with a dashboard showing:

- active tickets
- recent tickets
- ticket status
- queue position where applicable
- notifications
- option to report a problem

Example:

```text
+------------------------------------------------+
| IT SUPPORT                                     |
+------------------------------------------------+
|                                                |
| [ Report a Problem ]                           |
|                                                |
| Active Tickets: 2                              |
|                                                |
| IT-2026-000101   Printer      In Progress      |
| IT-2026-000102   Excel        Queued           |
|                                                |
+------------------------------------------------+
```

---

# 7. Problem Submission

The system must provide a simple problem submission form.

## Required fields

### Station

The user selects the office/station where the problem is located.

Example:

```text
[ Head Office ▼ ]
```

### Problem Type

The user selects from available problem types.

Example:

```text
[ Microsoft Excel ▼ ]
```

### Description

The user provides a brief description.

Example:

> Excel closes whenever I try to open a particular workbook.

---

## PR-SUBMIT-001

Station selection is mandatory.

## PR-SUBMIT-002

Problem type selection is mandatory.

## PR-SUBMIT-003

Problem description is mandatory.

## PR-SUBMIT-004

The system must prevent users from manually changing their priority.

## PR-SUBMIT-005

After successful submission, the system must generate a unique ticket number.

## PR-SUBMIT-006

The system must display the ticket number to the user.

## PR-SUBMIT-007

The ticket must automatically inherit the user's priority level.

---

# 8. Problem Type Catalogue

The initial problem catalogue must include:

## Support

- SAP
- Microsoft Excel
- Microsoft Word
- HR System
- Other Support

## Laptop

- Faulty Laptop — Software
- Faulty Laptop — Hardware

## Laptop Accessories

- Laptop Accessories

## Office Equipment

- Printer
- Scanner
- Monitor

The catalogue must be expandable.

Administrators should be able to:

- create problem types
- deactivate problem types
- rename problem types
- organise problem types into categories

---

# 9. Ticket Number

Every ticket must have a human-readable ticket number.

Recommended format:

```text
IT-YYYY-XXXXXX
```

Example:

```text
IT-2026-000125
```

The ticket number must be unique.

The database primary key should remain separate from the human-readable ticket number.

---

# 10. Ticket Routing

When a ticket is created:

```text
User
  ↓
Select Station
  ↓
Create Ticket
  ↓
Determine User Priority
  ↓
Route to Station
  ↓
Station Agents See Ticket
```

Only active agents assigned to the selected station should initially have access to the ticket.

---

# 11. Agent Dashboard

Agents should have a dedicated dashboard.

The dashboard should provide:

- P1 tickets
- P2 tickets
- normal tickets
- unassigned tickets
- assigned tickets
- tickets waiting for users
- recently resolved tickets
- notifications

Example:

```text
+------------------------------------------------------+
| IT SUPPORT — HEAD OFFICE                             |
+------------------------------------------------------+
| P1       P2       Unassigned       My Tickets        |
|  1        3            5                4             |
+------------------------------------------------------+

URGENT
IT-2026-000121   CEO   Laptop Fault     P1

UNASSIGNED
IT-2026-000122   SAP             P2
IT-2026-000123   Printer         Normal

MY TICKETS
IT-2026-000110   Excel            In Progress
IT-2026-000115   Laptop           Waiting User
```

---

# 12. Agent Ticket Queue

Agents must be able to view tickets in their authorised station.

Filters should include:

- status
- priority
- problem type
- assigned/unassigned
- ticket age
- station

The agent should be able to open a ticket and view its complete history.

---

# 13. Claiming a Ticket

An agent must be able to claim an unassigned ticket.

Example:

```text
[ Claim Ticket ]
```

After claiming:

```text
Assigned Agent: Emmanuel
Status: In Progress
```

The system must record the assignment.

---

# 14. Ticket Assignment

Agents and administrators should be able to assign tickets to eligible agents.

An agent should only be able to assign or transfer a ticket to an agent who is authorised to handle the relevant station.

---

# 15. Ticket Transfer

Agents must be able to transfer tickets.

Example:

```text
Ticket
   ↓
Transfer
   ↓
Station: Babylove - Tesano
Agent: Agent B
Reason: Requires hardware specialist
```

The transfer should be recorded in ticket history.

---

# 16. Ticket Conversation

Each ticket must have a conversation area.

The conversation should display:

- user messages
- agent messages
- system events
- predefined notices
- attachments where permitted

Example:

```text
USER
My laptop cannot connect to Wi-Fi.

AGENT
I am coming to your office.

SYSTEM
Ticket assigned to Agent John.
```

---

# 17. Internal Agent Communication

Agents need an internal communication mechanism.

Internal messages may be:

- ticket-specific
- between two agents
- between multiple authorised IT staff

Example:

```text
INTERNAL NOTE

Agent A:
I have checked the laptop. It may be a driver issue.

Agent B:
I can check the driver when you bring it over.
```

Users must never see internal communications.

---

# 18. Predefined Agent Notices

Agents should have quick-action communication buttons.

Initial notices:

### I'm coming

Sends an appropriate message to the user indicating that the agent is coming to their location.

### Please bring your PC

Sends an appropriate message requesting that the user bring their computer to the IT office.

The system should support additional configurable templates.

---

# 19. Ticket Status Management

Agents should be able to move tickets through appropriate statuses.

Initial statuses:

```text
QUEUED
ASSIGNED
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
REOPENED
```

The interface should prevent invalid status transitions.

---

# 20. Priority 1 Experience

P1 tickets receive a special experience.

When a P1 user submits a ticket:

```text
P1 Ticket
   ↓
Station determined
   ↓
Immediate notification
   ↓
Agents see urgent ticket
   ↓
Agent claims ticket
```

P1 tickets:

- bypass the normal queue
- do not display normal queue position
- receive immediate agent notification
- should be visually distinguished in the agent dashboard

---

# 21. Priority 2 Experience

P2 tickets remain in the queue.

They receive:

- queue position
- priority treatment
- 10-minute unattended escalation

The user should be able to see how many applicable tickets are ahead of theirs.

---

# 22. Normal User Experience

Normal tickets:

- enter the station queue
- receive a queue position
- remain in the queue until assigned/handled
- trigger escalation after 60 minutes if unattended

---

# 23. Queue Position

Users with P2 and normal tickets should be able to see their current position.

Example:

> **There are 4 tickets ahead of you.**

The position must update as tickets are handled.

When tickets are resolved or closed, they must no longer count towards queue position.

P1 users do not receive a queue position.

---

# 24. Queue Rules

The queue must operate independently for each station.

For example:

```text
HEAD OFFICE
#101
#102
#103

BABYLOVE - TESANO
#104
#105
```

A Head Office ticket must not be delayed because of tickets belonging to Babylove-Tesano.

P1 tickets are excluded from the normal queue.

---

# 25. Automatic Escalation

The system must monitor unattended tickets.

### P1

Immediate notification.

### P2

Notification after 10 minutes.

### Normal

Notification after 60 minutes.

Before sending an escalation, the system must verify that the ticket remains unattended.

---

# 26. Email Notifications

Email notifications should be sent through the organisation's approved SMTP/email infrastructure.

The system should support notifications for:

- P1 ticket creation
- P2 escalation
- normal-ticket escalation
- ticket assignment
- important ticket updates
- ticket resolution
- feedback request

Email failures should be logged.

---

# 27. In-App Notifications

The system should provide an in-app notification centre.

Example:

```text
🔔 Notifications

P1 Ticket IT-2026-000125 requires attention.

Ticket IT-2026-000117 has been assigned to you.

User has responded to IT-2026-000110.

Ticket IT-2026-000099 has been reopened.
```

Unread notifications should be visually identifiable.

---

# 28. Resolution

An authorised agent can resolve a ticket.

When resolving:

1. The agent confirms the resolution.
2. The ticket becomes `RESOLVED`.
3. The resolution event is recorded.
4. The user is notified.
5. A feedback request is generated.

The system should record:

- resolving agent
- resolution timestamp
- resolution information

---

# 29. Feedback

The user should receive a feedback link after resolution.

The feedback page should be simple.

Example:

```text
Your IT support ticket

IT-2026-000125

Has your problem been resolved?

[ YES, IT IS RESOLVED ]

[ NO, I STILL NEED HELP ]
```

---

# 30. Feedback Expiration

Feedback links expire at:

> **17:00 GMT on the applicable working day.**

If a ticket is resolved after 17:00 GMT, the feedback link should expire at 17:00 GMT on the next applicable working day.

The feedback link must also expire immediately after successful submission.

A used feedback link cannot be submitted again.

---

# 31. Positive Feedback

When the user selects:

> YES, IT IS RESOLVED

the system should:

1. record the feedback
2. invalidate the feedback token
3. close the ticket
4. record the closure event

---

# 32. Negative Feedback

When the user selects:

> NO, I STILL NEED HELP

the system should:

1. record the feedback
2. invalidate the feedback token
3. reopen the ticket
4. return the ticket to active support handling
5. notify the relevant IT agent(s)

The ticket's previous history must remain intact.

---

# 33. Consultant Management

Administrators must be able to create temporary consultant accounts.

The administrator should provide:

- name
- email
- department/organisation where applicable
- station
- account start date where applicable
- account expiration date
- priority classification

The system must automatically disable the account after its expiration.

Historical ticket records must remain available.

---

# 34. Administration Dashboard

Administrators should have an organisation-wide dashboard.

It should provide:

```text
Total Tickets
Active Tickets
Resolved Tickets
Closed Tickets
P1 Tickets
P2 Tickets
Unattended Tickets
Reopened Tickets
SLA Escalations
```

Administrators should be able to filter information by:

- date
- station
- priority
- problem type
- agent
- status

---

# 35. User Management

Administrators should be able to:

- create users
- edit users
- activate users
- deactivate users
- assign priority level
- assign station
- create consultant accounts
- set consultant expiry dates
- manage agents

Users should not be able to change their own priority level.

---

# 36. Station Management

Administrators should be able to:

- create stations
- rename stations
- deactivate stations
- assign agents to stations
- designate primary agent stations

Initial stations include:

```text
Head Office
Babylove - Tesano
```

The system must support additional stations in the future.

---

# 37. Problem Type Management

Administrators should be able to:

- create categories
- create problem types
- edit problem types
- deactivate problem types

Deactivated problem types should not appear for new tickets but should remain associated with historical tickets.

---

# 38. Response Template Management

Administrators should be able to manage predefined agent responses.

Examples:

```text
I'm coming.

Please bring your PC.

Additional information is required.

The issue is currently being investigated.

The issue has been resolved.
```

---

# 39. Ticket History

Every ticket must have a chronological history.

The history should show events such as:

```text
09:02 — Ticket created
09:03 — Ticket assigned to Agent A
09:10 — Agent sent "I'm coming"
09:22 — User responded
09:45 — Ticket marked resolved
09:46 — Feedback request sent
10:15 — User confirmed resolution
10:15 — Ticket closed
```

Internal messages should remain distinguishable from user-facing messages.

---

# 40. Audit and Accountability

Important actions must be recorded.

The system should make it possible to determine:

- who performed an action
- what action was performed
- which ticket/account/object was affected
- when the action occurred
- relevant previous and new values where applicable

---

# 41. Attachments

The ticket conversation should eventually support file attachments.

Potential examples:

- screenshots
- error messages
- documents
- photographs of faulty equipment

The system must apply security controls to uploaded files.

Attachment size and file-type restrictions should be configurable.

---

# 42. Search

The system should provide ticket search.

Authorised users should be able to search using:

- ticket number
- problem type
- status
- priority
- date
- station

Agents should be able to search tickets they are authorised to access.

Administrators may search organisation-wide.

---

# 43. Reporting

The system should provide basic reports.

### Ticket volume

Tickets by:

- day
- week
- month
- station
- problem type
- priority

### Agent performance

Where appropriate:

- tickets handled
- tickets resolved
- tickets reopened
- average response time
- average resolution time

### SLA

Reports should include:

- escalated tickets
- unattended tickets
- P1 response
- P2 escalation
- normal-ticket escalation

### Feedback

Reports should include:

- positive feedback
- negative feedback
- feedback response rate
- reopened tickets resulting from feedback

---

# 44. Dashboard Real-Time Updates

The application should provide near-real-time updates where practical.

Examples:

- new ticket appears in agent dashboard
- ticket assignment changes
- new message appears
- notification count changes
- queue information changes
- P1 alert appears

The system should use WebSockets or an equivalent real-time mechanism.

---

# 45. Responsive Interface

The web application should work on:

- desktop computers
- laptops
- tablets
- mobile browsers

The primary interface should be optimised for desktop use because the system is an internal IT department application.

---

# 46. Intranet Deployment

The system is intended primarily for internal organisational use.

The application should be hosted on an internal server accessible through the organisation's network.

The architecture should support:

```text
Employee Computer
       ↓
Company Network
       ↓
Internal DNS
       ↓
Nginx
       ↓
IT Ticketing Application
       ↓
PostgreSQL
```

The system should not require public internet access for normal ticket operations.

External services should only be used where explicitly required, such as an approved email service.

---

# 47. Data Storage

Ticket information must be stored in a central relational database.

The system must preserve:

- users
- stations
- tickets
- assignments
- messages
- ticket history
- feedback
- notifications
- audit records

Data must remain available after tickets are closed.

---

# 48. Backup and Recovery

The production environment must have automated database backups.

The backup strategy should include:

- regular database backups
- backup retention
- backup storage separate from the primary database
- restoration testing

The exact backup schedule will be defined in `deployment.md`.

---

# 49. Security Requirements

The application must implement:

- authentication
- role-based access control
- station-based access control
- secure password handling
- backend authorisation
- input validation
- protection against common web attacks
- secure session management
- attachment validation
- audit logging
- database backup

Security requirements will be expanded in `security.md`.

---

# 50. Performance Requirements

The initial system is intended for internal organisational use.

The application should provide responsive performance for normal operations.

Core operations such as:

- login
- ticket creation
- viewing tickets
- sending messages
- updating status

should normally complete without noticeable delay under expected internal usage.

The system architecture should allow future scaling if the organisation expands.

---

# 51. Reliability Requirements

The ticketing system is an operational IT system and should remain available during normal working hours.

Failure of an individual supporting service should not unnecessarily corrupt ticket data.

For example:

> An email service failure must not prevent an agent from resolving a ticket.

Failures should be logged and made visible to administrators where appropriate.

---

# 52. Accessibility and Usability

The interface should be simple enough for employees who are not technically inclined.

Problem reporting should require minimal steps.

The system should use:

- clear labels
- understandable status names
- visible priority indicators
- readable notifications
- confirmation messages
- consistent navigation

The application should avoid unnecessary complexity for normal users.

---

# 53. Initial MVP Definition

The first usable version should contain:

### Authentication

- login
- role management
- account activation/deactivation

### Ticketing

- ticket creation
- station selection
- problem type
- priority
- ticket number
- ticket queue
- queue position

### Agent Operations

- agent dashboard
- station-based visibility
- claim ticket
- assignment
- transfer
- status updates
- resolution

### Communication

- user-agent messaging
- internal agent messaging
- predefined notices

### Notifications

- P1 immediate notification
- P2 10-minute escalation
- normal 60-minute escalation
- in-app notifications
- email notifications

### Feedback

- resolution feedback
- 17:00 GMT expiry
- one-time feedback
- reopen/close behaviour

### Administration

- user management
- agent management
- station management
- problem-type management
- consultant accounts

### Audit

- ticket history
- important action logging

---

# 54. Features That Should Not Delay the MVP

The following should not be allowed to delay the first production-ready version:

- AI features
- mobile application
- advanced analytics
- Active Directory integration
- automated troubleshooting
- knowledge base
- complex asset management
- external customer support
- third-party chat integrations

These can be added after the core ticketing workflow is stable.

---

# 55. Product Success Criteria

The system will be considered successful when IT staff can reliably:

1. Receive every submitted support request as a ticket.
2. Route tickets to the correct station.
3. Identify priority users automatically.
4. Handle P1 tickets immediately.
5. Escalate unattended P2 and normal tickets.
6. See and manage their station's queue.
7. Communicate with users.
8. Communicate privately with other agents.
9. Transfer tickets when necessary.
10. Resolve tickets.
11. Collect feedback.
12. Reopen unresolved problems.
13. Close successfully resolved tickets.
14. Review historical ticket activity.
15. Generate useful operational reports.

---

# 56. Requirements Traceability

The following documents will further define these requirements:

```text
business-rules.md
        ↓
Defines WHAT rules must be followed

product-requirements.md
        ↓
Defines WHAT the product must provide

user-roles-and-permissions.md
        ↓
Defines WHO can do WHAT

ticket-workflow.md
        ↓
Defines HOW tickets move through the system

queue-and-priority-system.md
        ↓
Defines queue and escalation behaviour

database-design.md
        ↓
Defines HOW information is stored

architecture.md
        ↓
Defines HOW the application is technically structured

api-specification.md
        ↓
Defines HOW frontend and backend communicate

security.md
        ↓
Defines HOW the system is protected

deployment.md
        ↓
Defines HOW the system runs in production

development-roadmap.md
        ↓
Defines HOW the system is built

claude-code-instructions.md
        ↓
Defines HOW Claude Code should work with the project
```

---

# 57. Requirement Change Policy

Any change to a confirmed product requirement must be documented.

Claude Code must not silently introduce functionality that changes the established business behaviour.

Where requirements conflict or are ambiguous, development should pause on the affected functionality until the requirement is clarified.

New features should be classified as:

- MVP
- Post-MVP
- Future