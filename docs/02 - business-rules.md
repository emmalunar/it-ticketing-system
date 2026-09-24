Next is `03-business-rules.md` . This is the authoritative rules document, so I’m keeping the actual ticketing behaviour intact and tightening the wording where needed for consistency with Documents 01 and 02. 

03-business-rules.md 

# **IT Ticketing System — Business Rules** 

## **1. Document Purpose** 

This document defines the authoritative business rules governing the behaviour of the IT Ticketing System. 

These rules describe how tickets are created, prioritised, routed, queued, assigned, transferred, communicated about, resolved, reopened, and closed. 

They also define rules for users, agents, administrators, consultants, notifications, feedback, auditing, and configuration. 

These rules must be enforced by the backend. The frontend may display or guide users through the rules, but must never be treated as the authority for enforcing them. 

# **2. Rule Authority** 

The following documents provide the broader project specification: 

1. `01-business-context.md` 

2. `02-product-requirements.md` 

3. `03-business-rules.md` 

4. `04-user-roles-and-permissions.md` 

5. `05-ticket-workflow.md` 

6. `06-queue-and-priority-system.md` 

7. `07-database-design.md` 

8. `08-system-architecture.md` 

9. `09-api-specification.md` 

10. `10-security.md` 

11. `11-notification-and-sla.md` 

12. `12-deployment.md` 

13. `13-development-roadmap.md` 

14. `14-claude-code-instructions.md` 

This document is the authoritative source for business behaviour. 

Technical implementation decisions must not change these rules without an approved requirements change. 

# **3. General Ticket Rules** 

## **BR-001 — Every IT Problem Becomes a Ticket** 

Every problem submitted through the system must create a ticket. 

A ticket must have a unique identifier and human-readable ticket number. 

Recommended ticket number format: 

```
IT-YYYY-XXXXXX
```

Example: 

```
IT-2026-000125
```

## **BR-002 — Every Ticket Must Have a Station** 

Every ticket must be associated with a station. 

The station is selected when the ticket is created. 

The station determines the ticket's initial visibility and handling location. 

## **BR-003 — Station Determines Initial Visibility** 

When a ticket is created, it is initially visible to agents authorised to handle the selected station. 

Agents outside that station must not automatically receive access to the ticket. 

Administrators may have broader access according to their permissions. 

**BR-004 — Tickets May Be Transferred** 

An authorised agent may transfer a ticket to another station when required. 

After transfer, the receiving station becomes the ticket's current station. 

The transfer must be recorded in the ticket history. 

## **BR-005 — Ticket History Must Be Preserved** 

Important changes to a ticket must be recorded as historical events. 

The system must preserve sufficient information to reconstruct important parts of the ticket's lifecycle. 

Normal ticket operations must not physically delete historical records. 

# **4. User and Priority Rules** 

## **BR-006 — Roles and Priority Are Separate** 

A user's role and priority level are separate properties. 

Roles determine what the user is authorised to do. 

Priority determines how the user's tickets are handled. 

A higher priority must not automatically grant administrative permissions. 

## **BR-007 — Supported Roles** 

The initial application roles are: 

```
USER
```

```
AGENT
```

```
ADMIN
```

Consultants are users with temporary accounts and are not a separate application role unless a future requirement introduces one. 

**BR-008 — Priority Levels** 

#### The supported priority levels are: 

```
P1
P2
P3
```

The initial interpretation is: 

|**Priority**|**Typical User Group**|
|---|---|
|P1|CEOs / executives|
|P2|Managers / configured consultants|
|P3|Standard users|



The exact priority assigned to a user is controlled by authorised administration. 

## **BR-009 — Users Cannot Select Their Own Priority** 

A user must not be allowed to select or change the priority of a ticket during ticket creation. 

The ticket priority is inherited from the user's configured priority level. 

Priority must be enforced by the backend. 

## **BR-010 — Priority Changes Are Administrative** 

Where priority changes are permitted, they must be performed by an authorised administrator or through an explicitly authorised administrative process. 

Priority changes must be audited. 

# **5. Station Rules** 

## **BR-011 — Stations Are Configurable** 

Stations must be stored in the database rather than hard-coded into the application. 

The initial stations are: 

Head Office 

Babylove - Tesano 

## **BR-012 — Inactive Stations Cannot Receive Normal New Tickets** 

A station marked inactive must not normally be available for selection when creating a new ticket. 

Existing historical tickets associated with the station must remain available according to normal access rules. 

## **BR-013 — Agents May Have Multiple Stations** 

The system must support an agent being assigned to one or more stations. 

The current operational configuration may contain two agents per station, but the data model must not assume that an agent can belong to only one station. 

## **BR-014 — Station Access Is Authorised** 

An agent may access station tickets only when the agent has an active authorisation for that station, unless the agent has broader administrative permissions. 

Station access must be enforced on the backend. 

# **6. Ticket Creation Rules** 

## **BR-015 — Required Ticket Creation Information** 

At minimum, ticket creation requires: 

1. Station 

2. Problem type 

3. Brief description 

The authenticated user is automatically associated with the ticket. 

The system determines the ticket priority from the user's account. 

## **BR-016 — Problem Types Are Configurable** 

Problem types must be database-driven. 

The initial problem catalogue includes: 

### **Support** 

- SAP 

- Microsoft Excel 

- Microsoft Word 

- HR System 

- Other Support 

### **Laptop** 

- Faulty Laptop (Software) 

- Faulty Laptop (Hardware) 

### **Other Equipment** 

- Laptop Accessories 

- Printer 

- Scanner 

- Monitor 

Administrators must be able to add, deactivate, update, and reorder problem types without source-code changes. 

## **BR-017 — Inactive Problem Types Cannot Be Used for New Tickets** 

A problem type marked inactive must not normally be selectable when creating a new ticket. 

Existing tickets using that problem type must retain their historical reference. 

# **7. Priority Handling Rules** 

## **BR-018 — P1 Tickets Bypass the Normal Queue** 

P1 tickets do not participate in the normal P2/P3 queue. 

They must receive immediate handling notification at the selected station. 

P1 tickets therefore do not have a normal queue position. 

## **BR-019 — P2 Tickets Enter the Normal Queue** 

P2 tickets enter the queue for their selected station. 

P2 tickets are handled ahead of P3 tickets under the normal queue rules. 

## **BR-020 — P3 Tickets Enter the Normal Queue** 

P3 tickets enter the queue for their selected station. 

P3 tickets are handled after eligible P2 tickets. 

## **BR-021 — Queue Priority Takes Precedence Over FIFO Across Priorities** 

The normal queue ordering is: 

1. P2 

2. P3 

FIFO ordering applies within the same priority. 

Example: 

If the waiting queue contains: 

```
P3-A
P2-A
P3-B
P2-B
```

the handling order is: 

```
P2-A
P2-B
P3-A
P3-B
```

subject to the ticket eligibility rules. 

# **8. Unattended Ticket Rules** 

## **BR-022 — Definition of Unattended** 

A ticket is considered unattended when: 

It is eligible for agent handling; 

It is in an applicable waiting state; and 

No agent has claimed or been assigned responsibility for it. 

Ticket age alone does not determine whether a ticket is unattended. 

## **BR-023 — Claiming Ends Unattended Status** 

Once an agent successfully claims a ticket, the ticket is no longer considered unattended. 

## **BR-024 — Assignment Ends Unattended Status** 

If an authorised agent is assigned responsibility for a ticket, unattended escalation must stop. 

The ticket does not need to be resolved for unattended status to end. 

## **BR-025 — P2 Escalation** 

A P2 ticket that remains unattended for 10 minutes must trigger the configured P2 escalation notification. 

The escalation must be processed only once for that applicable unattended period. 

## **BR-026 — P3 Escalation** 

A P3 ticket that remains unattended for 60 minutes must trigger the configured P3 escalation notification. 

The escalation must be processed only once for that applicable unattended period. 

## **BR-027 — Escalation Must Be Idempotent** 

The system must prevent duplicate escalation notifications caused by: 

- Worker retries 

- Concurrent background jobs 

- Application restarts 

- Temporary infrastructure failures 

Escalation records must provide sufficient information to determine whether the escalation has already been processed. 

# **9. Queue Rules** 

## **BR-028 — Queue Is Station-Specific** 

A station's queue contains only eligible tickets for that station. 

Tickets belonging to another station must not affect the queue position for the current station. 

## **BR-029 — P1 Tickets Are Excluded** 

P1 tickets are excluded from normal queue calculations. 

They must never appear as a P1 queue position such as "1st in queue". 

## **BR-030 — Only Waiting Tickets Count** 

The normal queue includes applicable tickets waiting for agent handling. 

The following must not count as waiting queue tickets: 

```
IN_PROGRESS
```

```
WAITING_USER
```

```
RESOLVED
```

```
CLOSED
```

P1 tickets are also excluded. 

## **BR-031 — Queue Position Is Dynamic** 

Queue position must be calculated from the current state of eligible tickets. 

It must not be treated as permanent ticket data. 

A ticket's position can change when: 

- Another ticket is claimed 

- A new higher-priority ticket enters the queue 

- A ticket is transferred 

- A ticket is resolved 

- A ticket is reopened 

- Other queue eligibility conditions change 

## **BR-032 — User Queue Visibility** 

P2 and P3 users may see the number of applicable tickets ahead of their ticket. 

P1 users do not receive a normal queue position because P1 tickets bypass the queue. 

## **BR-033 — Claimed Tickets Leave the Waiting Queue** 

When a ticket is successfully claimed or assigned, it must no longer count as a waiting queue ticket. 

## **BR-034 — Reopened Tickets Return to the Active Queue** 

When an eligible P2 or P3 ticket is reopened, it returns to the appropriate active station queue. 

A reopened P1 ticket returns to immediate-priority handling rather than the normal queue. 

## **BR-035 — Reopened Tickets Retain Priority** 

A reopened ticket retains its existing priority unless an authorised administrative action changes the priority. 

## **BR-036 — Transfers Affect Queue Placement** 

When a ticket is transferred to another station: 

- The receiving station becomes the current station. 

- The ticket follows the receiving station's queue rules. Station-specific visibility is updated. 

- The transfer is recorded in history. 

# **10. Ticket Assignment Rules** 

## **BR-037 — Claiming Must Be Atomic** 

Two agents must not be able to successfully claim the same unassigned ticket at the same time. 

The backend must use appropriate database transaction and concurrency controls. 

## **BR-038 — Assignment Is Separate From Status** 

Assignment is stored as ticket ownership/current responsibility. 

It is not a long-lived ticket status. 

When an agent takes responsibility for a queued ticket, the ticket normally moves to: `IN_PROGRESS` 

## **BR-039 — Assignment History Must Be Preserved** 

#### Every significant assignment change must be recorded. 

The history should identify: 

- Ticket 

- Agent 

- Initiating user 

- Assignment type 

- Timestamp 

- Previous assignment where applicable 

- Reason where applicable 

# **11. Ticket Transfer Rules** 

## **BR-040 — Transfers Require Authorisation** 

Only authorised agents or administrators may transfer tickets. 

## **BR-041 — Transfers Must Record History** 

Every transfer must record: 

- Previous station 

- New station 

- Previous agent where applicable 

- New agent where applicable 

- Initiating user 

- Reason where applicable 

- Timestamp 

## **BR-042 — Receiving Station Access** 

After a station transfer, authorised agents in the receiving station become eligible to access the ticket according to the ticket's current state. 

Agents in the previous station must no longer have access unless they retain access through another valid authorisation. 

# **12. Ticket Status Rules** 

## **BR-043 — Supported Primary Statuses** 

The primary ticket statuses are: 

- `QUEUED` 

```
IN_PROGRESS
```

```
WAITING_USER
```

```
RESOLVED
```

```
CLOSED
```

```
REOPENED
```

## **BR-044 — Initial Status** 

A newly created P2 or P3 ticket normally enters: 

```
QUEUED
```

A P1 ticket follows immediate-priority handling and does not participate in the normal queue. 

## **BR-045 — In Progress** 

`IN_PROGRESS` means an agent has taken responsibility for handling the ticket. 

A ticket in this state is not considered unattended. 

## **BR-046 — Waiting for User** 

`WAITING_USER` means the agent requires information, action, or another response from the user before continuing. 

A ticket in `WAITING_USER` is not part of the normal waiting queue. 

## **BR-047 — Resolved** 

`RESOLVED` means the agent has indicated that the support work is complete and the ticket is awaiting the applicable feedback/closure process. 

A resolved ticket is not part of the active queue. 

## **BR-048 — Closed** 

`CLOSED` means the ticket has completed the applicable closure process. 

A closed ticket is not part of the active queue. 

## **BR-049 — Reopened** 

`REOPENED` means a previously resolved or closed ticket requires further support. 

A reopened ticket must return to the applicable active handling flow. 

# **13. Ticket Lifecycle Rules** 

The normal lifecycle is: 

```
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

Negative feedback may produce: 

```
RESOLVED
  ↓
REOPENED
  ↓
IN_PROGRESS
```

A ticket may follow different valid transitions where authorised, but arbitrary status changes must not be allowed. 

# **14. Communication Rules** 

## **BR-050 — User-Agent Communication** 

Users and agents may communicate through the ticket. 

User-visible messages may include: 

- User messages 

- Agent responses 

- Predefined notices 

- Appropriate system messages 

## **BR-051 — Internal Agent Communication** 

Agents may create internal notes/messages for other authorised agents. 

Internal messages must never be exposed to the ticket owner through the normal user-facing conversation. 

## **BR-052 — Message Visibility Must Be Enforced Server-Side** 

Message visibility must be enforced by backend authorization. 

The frontend must not be trusted to hide internal messages. 

## **BR-053 — Message History Is Preserved** 

Ticket communication should remain part of the ticket history according to the system's retention and audit rules. 

# **15. Predefined Notice Rules** 

**BR-054 — Predefined Notices** 

Agents may send predefined notices to users. 

The initial notices are: 

```
I am coming
```

and: 

```
Please bring your PC
```

## **BR-055 — Templates Are Configurable** 

Administrators should be able to manage predefined response templates. 

Changes must not require source-code modifications. 

## **BR-056 — Templates Must Not Bypass Permissions** 

A predefined template is only a message mechanism. 

Using a template must not bypass: 

- Ticket access controls 

- Message visibility rules 

- Ticket state rules 

- Assignment rules 

# **16. Resolution Rules** 

## **BR-057 — Resolution Requires an Authorised Agent** 

Only an authorised agent or administrator may resolve a ticket. 

## **BR-058 — Resolution Records Resolution Information** 

When resolving a ticket, the system should record appropriate resolution information and timestamp. 

## **BR-059 — Resolution Generates Feedback** 

A successful resolution must trigger generation of a feedback request/token according to the feedback rules. 

# **17. Feedback Rules** 

## **BR-060 — Feedback Requires a Secure Token** 

The feedback endpoint must require a valid feedback token. 

The token must be cryptographically secure. 

## **BR-061 — Feedback Token Expiry** 

The token must expire at 5:00 PM GMT on the applicable working day. 

If resolution occurs after 5:00 PM GMT, the token expires at 5:00 PM GMT on the next applicable working day. 

Initially, working days are Monday through Friday. 

## **BR-062 — Feedback Token Is One-Time Use** 

Once feedback has been successfully submitted: 

The token becomes invalid immediately. 

The token must not be accepted again. 

A second submission must fail. 

## **BR-063 — Positive Feedback Closes the Ticket** 

Positive feedback results in: 

```
RESOLVED → CLOSED
```

**BR-064 — Negative Feedback Reopens the Ticket** 

Negative feedback results in: 

```
RESOLVED → REOPENED
```

The ticket must return to active support handling. 

## **BR-065 — Feedback Must Be Transaction-Safe** 

Feedback submission must be protected against concurrent submissions. 

Only one successful feedback submission may be recorded for the applicable resolution event. 

# **18. Consultant Account Rules** 

## **BR-066 — Consultant Accounts May Expire** 

Consultant accounts may have an expiration date. 

## **BR-067 — Expired Consultants Become Inactive** 

When the consultant expiration date is reached, the account must automatically become inactive. 

An inactive consultant must not be able to authenticate normally. 

## **BR-068 — Historical Records Remain** 

Deactivation of a consultant account must not delete: 

Tickets 

- Messages 

- Assignments 

- Audit records 

- Feedback records 

- Other historical information associated with the account 

Historical records should continue to identify the original account. 

# **19. Notification Rules** 

## **BR-069 — P1 Notification** 

Creation of a P1 ticket must trigger immediate notification to authorised agents at the selected station. 

## **BR-070 — P2 Escalation Notification** 

A P2 ticket that remains unattended for 10 minutes must trigger the configured escalation notification. 

## **BR-071 — P3 Escalation Notification** 

A P3 ticket that remains unattended for 60 minutes must trigger the configured escalation notification. 

## **BR-072 — Notification Channels** 

Notifications may use: 

In-app notifications 

- Email 

WebSocket real-time updates 

The specific channel used depends on the notification event and system configuration. 

## **BR-073 — Notification Failure Must Not Corrupt Ticket State** 

Failure to deliver an email or real-time notification must not automatically change or corrupt the underlying ticket state. 

Notification processing must support retries where appropriate. 

# **20. Audit Rules** 

## **BR-074 — Important Actions Must Be Audited** 

The system must audit significant actions including: 

- Ticket creation 

- Claiming 

- Assignment 

- Reassignment 

- Transfer 

- Status changes 

- Resolution 

- Reopening 

- Closure 

- Feedback 

- Administrative changes 

- User account changes 

- Configuration changes 

## **BR-075 — Audit Records Are Append-Only** 

Normal application users must not be able to modify or delete audit records. 

## **BR-076 — Audit Records Identify the Actor** 

Where an authenticated actor exists, the audit record must identify that actor. 

System-generated events must be identifiable as system actions. 

# **21. Data Integrity Rules** 

## **BR-077 — Tickets Are Not Normally Physically Deleted** 

Normal operations must not physically delete tickets. 

Tickets should be retained for historical, reporting, and accountability purposes. 

## **BR-078 — Deactivation Is Preferred to Deletion** 

For configurable entities such as: 

- Users 

- Stations 

- Problem categories 

- Problem types 

- Response templates 

- Agent-station relationships 

deactivation should normally be used instead of physical deletion where historical references exist. 

## **BR-079 — Critical Operations Must Be Transactional** 

The following operations require appropriate transaction handling: 

- Ticket claiming 

- Assignment 

- Transfer 

- Resolution 

- Feedback submission 

- Closure 

- Reopening 

- Other state-changing operations where concurrent requests could cause inconsistency 

# **22. Security Rules** 

## **BR-080 — Backend Is the Authority** 

All important business rules must be enforced by the backend. 

The frontend must never be trusted to enforce: 

- Priority 

- Station access 

- Ticket ownership 

- Message visibility 

- Status transitions 

- Feedback validity 

Queue position 

Administrative permissions 

## **BR-081 — Access Must Be Denied by Default** 

A user should only receive access explicitly granted through their role, station scope, ticket ownership, or administrative permissions. 

## **BR-082 — Search Must Respect Access Control** 

Search results must follow the same authorization rules as direct ticket access. 

A user must not be able to discover restricted tickets by searching. 

## **BR-083 — WebSocket Access Must Respect Authorization** 

WebSocket connections and subscriptions must enforce the same relevant access controls as API requests. 

# **23. Configuration Rules** 

## **BR-084 — Business Configuration Must Be Data-Driven Where Appropriate** 

The following should be configurable without source-code changes: 

- Stations 

- Problem categories 

- Problem types 

- Response templates 

- User priority levels 

- Consultant expiry 

- Active/inactive states 

**BR-085 — Core Business Rules Are Not Arbitrary User Configuration** 

Administrators must not be given unrestricted controls that could silently change fundamental business behaviour. 

For example, changing a response template is normal configuration. 

Changing the meaning of P1/P2/P3 or bypassing access control is not ordinary configuration. 

Changes to core business rules require an approved requirements change. 

# **24. Time and Working-Day Rules** 

## **BR-086 — Timezone** 

The feedback expiry rule uses GMT/UTC as its authoritative reference. 

Application timestamps should be stored consistently and converted for presentation where required. 

## **BR-087 — Working Days** 

The initial working-day definition is: 

- Monday 

- Tuesday 

- Wednesday 

- Thursday 

- Friday 

Saturday and Sunday are initially non-working days. 

Holiday calendars may be introduced through future configuration. 

# **25. Deployment-Independent Business Rules** 

## **BR-088 — Business Rules Must Not Depend on Hosting Platform** 

Business behaviour must not depend on: 

cPanel 

- Ubuntu 

- Nginx 

- Docker 

- A particular cloud provider 

- A particular server operating system 

These are infrastructure concerns. 

## **BR-089 — Existing HRMS Must Not Change Ticket Behaviour** 

The existence of the company's HRMS or other applications must not alter the ticketing system's business rules. 

The ticketing system must operate as an independently managed application. 

## **BR-090 — Future AD/LDAP Integration Must Not Change Core Ticket Rules** 

If Active Directory/LDAP integration is introduced in the future, it may change how users authenticate or are provisioned. 

It must not silently change: 

- Ticket priority rules 

- Station routing 

- Queue rules 

- Ticket lifecycle 

- Feedback rules 

- Internal communication rules 

unless those business requirements are separately approved. 

# **26. Rule Precedence** 

Where multiple rules apply to a ticket, the following precedence should be used: 

1. Security and authorization rules 

2. Explicit P1 handling rules 

3. Ticket status/state rules 

4. Station visibility and routing rules 

5. P2/P3 queue rules 

6. Assignment/claim rules 

7. Notification rules 

8. Reporting/presentation behaviour 

Security and authorization must always take precedence over convenience. 

# **27. Business Rule Acceptance Criteria** 

The implementation must demonstrate at minimum that: 

### **Ticket Creation** 

- A valid user can create a ticket. 

- Station is mandatory. 

- Problem type is mandatory. 

- Description is validated. 

- Priority is inherited from the user. 

- The user cannot self-select priority. 

### **P1** 

- P1 bypasses the normal queue. 

- P1 receives immediate station notification. 

- P1 has no normal queue position. 

### **P2** 

- P2 enters the correct station queue. 

- P2 appears ahead of P3. 

- P2 escalates after 10 unattended minutes. 

- Claiming/assignment stops unattended escalation. 

### **P3** 

- P3 enters the correct station queue. 

- P3 escalates after 60 unattended minutes. 

- Claiming/assignment stops unattended escalation. 

### **Station** 

Agents only see authorised station tickets. 

Transfers update the current station. 

Receiving agents gain appropriate access after transfer. 

### **Communication** 

- Users can communicate with agents. 

- Agents can communicate internally. 

- Internal messages are never exposed to users. 

### **Resolution** 

- Only authorised agents can resolve tickets. 

- Resolution generates feedback. 

- Resolved tickets leave the active queue. 

### **Feedback** 

- Valid feedback is accepted. 

- Expired feedback is rejected. 

- Successful feedback cannot be reused. 

- Positive feedback closes the ticket. 

- Negative feedback reopens the ticket. 

### **Consultants** 

- Expired consultants cannot authenticate. 

- Historical consultant records remain available. 

### **Security** 

- Unauthorized ticket access is denied. 

- Unauthorized message access is denied. 

- Unauthorized administrative actions are denied. 

- WebSocket authorization matches API authorization. 

# **28. Implementation Guidance** 

These business rules should be implemented through explicit backend service logic rather than scattered across frontend components. 

Recommended service operations include: 

```
create_ticket()
claim_ticket()
assign_ticket()
reassign_ticket()
transfer_ticket()
send_ticket_message()
send_internal_message()
send_predefined_notice()
wait_for_user()
resume_ticket()
resolve_ticket()
generate_feedback_token()
submit_feedback()
reopen_ticket()
close_ticket()
```

These services should validate: 

1. Authentication 

2. Authorization 

3. Current ticket state 

4. Business rules 

5. Database consistency 

6. Audit requirements 

7. Notification requirements 

The API layer should expose these operations without duplicating or weakening their business logic. 

# **29. Rule Change Policy** 

No business rule should be changed merely because an implementation is inconvenient. 

If implementation reveals an ambiguity, the ambiguity must be identified and resolved before the relevant behaviour is finalised. 

Any approved change to a business rule should be reflected in all affected documentation, including: 

Product requirements Workflow 

- Queue rules 

- Database design 

- API specification 

- Security requirements 

- Notification/SLA rules 

- Development roadmap 

- Claude Code instructions 

# **30. Final Business Rule Principle** 

The IT Ticketing System must behave predictably and consistently regardless of the interface, deployment environment, or technical implementation. 

The same business decision must produce the same result whether an action originates from: 

- The web interface 

- An API request 

- A background task 

- A WebSocket interaction 

- An administrative operation 

The backend remains the authoritative enforcement point for all business rules. 

The next document is `04-user-roles-and-permissions.md` . That one will focus specifically on the access-control model—especially the separation between **role, priority, and station scope** , which is important before we move into the workflow and database implementation. 

