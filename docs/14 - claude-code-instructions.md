# **IT Ticketing System — Claude Code Instructions** 

# **1. Purpose** 

This document provides the operational instructions for Claude Code when developing the IT Ticketing System. 

Claude Code must treat the project documentation as the primary source of truth. 

The goal is to produce a secure, maintainable, tested, production-ready application without inventing business requirements or introducing unnecessary complexity. 

# **2. Source of Truth** 

Before implementing a feature, read the relevant documentation in docs/. 

The project documentation is: 

01-business-context.md 02-product-requirements.md 

03-business-rules.md 

04-user-roles-and-permissions.md 

05-ticket-workflow.md 

06-queue-and-priority-system.md 

07-database-design.md 

08-system-architecture.md 09-api-specification.md 

10-security.md 

11-notification-and-sla.md 

12-deployment.md 

13-development-roadmap.md 

14-claude-code-instructions.md 

Do not assume that general software-development conventions override an explicit project requirement. 

If documents conflict: 

1. Identify the conflict. 

2. Determine which requirement is affected. 

3. Do not silently choose a behaviour. 

4. Ask for clarification when the conflict affects implementation. 

# **3. Core Development Rule** 

For every feature, follow: 

READ 

↓ UNDERSTAND ↓ PLAN ↓ IMPLEMENT ↓ TEST ↓ SECURE 

↓ VERIFY ↓ 

DOCUMENT 

Do not jump directly from a feature request to code. 

# **4. Approved Technology Stack** 

Use the approved stack: 

Frontend Next.js TypeScript Tailwind CSS shadcn/ui 

Backend Django Django REST Framework 

Database PostgreSQL 

Real-Time Django Channels WebSockets 

Background Processing 

Celery Celery Beat 

Queue / Cache Redis 

Object Storage 

# MinIO initially 

Email 

Company SMTP 

Testing 

Pytest / Django tests 

Playwright 

Source Control 

Git 

Do not replace a core technology without a documented technical reason and explicit approval. 

# **5. Architecture** 

Use a modular-monolith architecture. 

The backend remains the authoritative source of: 

- Business rules 

- Authentication 

- Authorization 

- Ticket state 

- Queue calculations 

- Priority 

- Assignment 

- Transfers 

- Messaging 

- Feedback 

- Notifications 

- Audit records 

The frontend is not a security boundary. 

Never move authoritative business rules into frontend-only code. 

# **6. Backend Structure** 

Use the approved Django structure: 

backend/ 

- ├── config/ 

- │   ├── settings/ 

- │   ├── urls.py 

- │   └── asgi.py 

- │ 

- ├── apps/ 

- │   ├── accounts/ 

- │   ├── stations/ 

- │   ├── tickets/ 

- │   ├── messaging/ 

- │   ├── notifications/ 

- │   ├── feedback/ 

- │   ├── reports/ 

- │   └── audit/ 

- │ 

- ├── manage.py 

└── requirements.txt 

Keep application responsibilities separated. 

Do not create a single oversized Django application containing unrelated functionality. 

# **7. Frontend Structure** 

Use the approved structure: 

frontend/ 

- ├── app/ │   ├── login/ 

- │   ├── dashboard/ 

- │   ├── tickets/ 

- │   ├── notifications/ 

- │   └── admin/ 

- ├── components/ 

- │   ├── tickets/ 

- │   ├── dashboard/ 

- │   ├── chat/ 

- │   └── ui/ 

- ├── lib/ 

- │   ├── api/ 

- │   ├── auth/ 

- │   └── websocket/ 

- └── types/ 

Keep API communication centralized and typed where practical. 

# **8. Do Not Invent Business Rules** 

This is mandatory. 

If a requirement does not define behaviour, do not silently invent a rule that affects: 

- Ticket priority 

- Ticket state 

- Queue order 

- Permissions 

- Assignment 

- Transfer 

- Escalation 

- Feedback 

- Closure 

- Account expiration 

- Data retention 

Instead: 

1. Identify what is missing. 

2. State the implementation dependency. 

3. Ask for clarification when necessary. 

Small technical implementation decisions may be made normally when they do not alter business behaviour. 

# **9. User Roles** 

The system has: 

USER 

AGENT 

ADMIN 

Do not create additional business roles without approval. 

Role, priority, and station scope are separate concepts. 

Use: 

ROLE + PRIORITY + STATION SCOPE + OBJECT ACCESS + 

CURRENT STATE 

when determining whether an operation is permitted. 

# **10. User Priority** 

Priority levels are: 

P1 → CEOs / executives P2 → Managers / consultants P3 → Standard users 

Priority is not a permission level. 

Do not allow the frontend to determine authoritative priority. 

The backend must determine ticket priority from the user's configured priority level. 

# **11. Stations** 

Current stations are: Head Office 

Babylove - Tesano Agents may be assigned to one or multiple stations. Use the agent_stations relationship. Do not assume an agent belongs permanently to only one station. Every ticket must have a station. 

The station determines the ticket's initial visibility and queue. 

# **12. Ticket Visibility** 

Initially: 

- Users can access their own tickets. 

- Agents can access tickets within their authorized station scope. 

- Administrators have appropriate administrative access. 

A ticket transfer changes its current station and potentially its current agent. Always enforce authorization on the backend. 

# **13. Ticket Statuses** 

Use: QUEUED IN_PROGRESS WAITING_USER RESOLVED 

CLOSED 

REOPENED 

Do not introduce a long-lived ASSIGNED status. 

Assignment is represented separately through the current assignee and assignment history. 

# **14. Ticket Lifecycle** 

The approved lifecycle is: 

CREATE 

↓ QUEUED ↓ IN_PROGRESS ↓ WAITING_USER ↔ IN_PROGRESS ↓ 

RESOLVED 

├── Positive feedback → CLOSED └── Negative feedback → REOPENED → IN_PROGRESS P1 bypasses the normal queue but follows the same general ticket lifecycle. 

Do not create alternative transitions without approval. 

# **15. Ticket Creation** 

Ticket creation requires: 

- Station 

- Problem type 

- Brief description 

Priority is determined by the user's account. 

Generate a human-readable ticket number such as: 

IT-2026-000125 

The human-readable ticket number is separate from the database primary key. 

# **16. Problem Catalogue** 

Problem types are configuration-driven. 

Initial categories include: 

# **Support** 

- SAP 

- Microsoft Excel 

- Microsoft Word 

- HR System 

- Other Support 

# **Laptop** 

- Faulty Laptop (Software) 

- Faulty Laptop (Hardware) 

# **Other** 

- Laptop Accessories 

- Printer 

- Scanner 

- Monitor 

Do not hard-code problem types into business logic. 

Administrators must eventually be able to add, modify, or deactivate problem types without code changes. 

# **17. P1 Tickets** 

# P1 tickets: 

- Receive immediate notification to agents at the selected station. 

- Bypass the normal queue. 

- Do not receive a normal queue position. 

Do not place P1 tickets into the standard P2/P3 queue. 

# **18. P2 Tickets** 

P2 tickets: 

- Enter the station queue. 

- Have priority over P3 tickets. 

- Use FIFO ordering within P2. 

- Escalate after 10 minutes if unattended. 

# Unattended means: 

No agent has accepted, claimed, or been assigned responsibility for the ticket. 

Once an agent claims or is assigned the ticket, unattended escalation stops. 

# **19. P3 Tickets** 

P3 tickets: 

- Enter the station queue. 

- Follow P2 tickets. 

- Use FIFO ordering within P3. 

- Escalate after 60 minutes if unattended. 

Once an agent claims or is assigned the ticket, unattended escalation stops. 

# **20. Queue Rules** 

Queue calculation must follow: 

Active tickets 

↓ 

Exclude P1 

↓ 

Filter by station 

↓ 

Exclude tickets no longer waiting for agent handling 

↓ 

P2 before P3 

↓ FIFO within priority 

Do not store queue position as permanent ticket data. Queue position is dynamic. 

Do not load the entire ticket table into Python to calculate queue position. Use appropriate database queries. 

# **21. Queue Eligibility** 

Waiting queue tickets include appropriate P2/P3 tickets that are: 

- Active 

- In the relevant station 

- Waiting for agent handling 

- Not already claimed/assigned 

- Not resolved 

- Not closed 

IN_PROGRESS and WAITING_USER tickets do not count as waiting queue tickets. 

# **22. Reopened Tickets** 

When a ticket is reopened because of negative feedback: 

- It returns to active handling. 

- P2/P3 tickets return to the appropriate station queue. 

- P1 tickets return to immediate P1 handling. 

- Existing priority is retained unless an authorized administrator changes it. 

# **23. Claiming Tickets** 

Claiming must be atomic. 

Two agents must not be able to successfully claim the same ticket simultaneously. Use appropriate database transactions and concurrency controls. 

When a ticket is claimed: 

- Current assignee is updated. 

- Assignment history is recorded. 

- Unattended escalation must stop. 

- The ticket leaves the waiting queue. 

# **24. Assignment** 

Assignment is separate from ticket status. 

Record: 

- Agent 

- Assigner 

- Assignment time 

- End time where applicable 

- Assignment type 

- Reason where applicable 

Do not create unnecessary ticket statuses merely to represent assignment. 

# **25. Ticket Transfer** 

# Transfers must record: 

- Previous station 

- New station 

- Previous agent 

- New agent where applicable 

- Initiating user 

- Timestamp 

- Reason 

After transfer, queue eligibility must be recalculated using the new station and current state. 

# **26. Messaging** 

Support separate message visibility types: 

USER_VISIBLE 

INTERNAL 

SYSTEM 

User-visible communication must remain separate from internal agent communication. Internal messages must never be returned through user-facing APIs. 

Do not rely on the frontend to hide internal messages. 

# **27. Predefined Notices** 

Initially support: 

I am coming 

Please bring your PC 

These are predefined notices, not hard-coded business workflows. 

They should eventually be manageable through administration. 

# **28. Attachments** 

|Attac|hments must:|
|---|---|
||Be stored outside executable application directories.|
||Use object storage.|
||Have database metadata.|
||Enforce authorization.|
||Enforce file-size limits.|
||Enforce allowed file types.|
||Use secure storage keys.|
|Do no|t expose attachment storage directly to unauthorized users.|



# **29. Feedback** 

|When|a ticket is resolved:|
|---|---|
|1.|Generate a secure feedback token.|
|2.|Send/provide the feedback link.|
|3.|Enforce the applicable expiry time.|
|4.|Accept one successful submission.|
|5.|Immediately invalidate the token after successful submission.|
|Feedb|ack must be atomic and replay-resistant.|



**30. Feedback Expiry** The feedback token expires at: 17:00 GMT on the applicable working day. 

If resolution occurs after 17:00 GMT, the expiry becomes 17:00 GMT on the next applicable working day. 

Initially: 

Working days = Monday–Friday 

Do not implement this as a fixed duration such as: 

resolution time + 9 hours 

Use timezone-aware calculations. 

# **31. Feedback Outcomes** 

Positive feedback: 

RESOLVED → CLOSED 

Negative feedback: 

RESOLVED → REOPENED → IN_PROGRESS 

Do not allow the client to directly close a ticket while bypassing the feedback workflow. 

# **32. Authentication** 

MVP authentication must work without Active Directory. 

However, authentication architecture must remain compatible with future: 

- Active Directory 

- LDAP 

- SSO 

Do not tightly couple the application's business logic to the current authentication mechanism. 

# **33. Authorization** 

Never trust the frontend to enforce permissions. 

For every protected operation, verify: 

# Authenticated user 

↓ 

Role 

↓ Station scope 

↓ ↓ 

Object access 

Current ticket state 

↓ 

Requested action 

Use backend object-level authorization. 

# **34. Security** 

Follow 10-security.md. 

Never: 

- Trust client-supplied permissions. 

- Trust client-supplied priority. 

- Trust client-supplied ticket status. 

- Expose internal notes. 

- Expose unauthorized attachments. 

- Store plaintext passwords. 

- Commit production secrets. 

- Disable security controls merely to make development easier. 

Validate all untrusted input. 

# **35. API** 

Follow 09-api-specification.md. 

API base: 

/api/v1/ 

Do not create undocumented endpoints when an existing endpoint/service can perform the required operation. 

Business-critical operations should be implemented through backend service functions. Examples: create_ticket() claim_ticket() assign_ticket() transfer_ticket() send_ticket_message() resolve_ticket() generate_feedback_token() submit_feedback() reopen_ticket() close_ticket() 

# **36. Database** 

PostgreSQL is the authoritative persistent database. Use UUID primary keys where specified. Use database constraints and indexes appropriately. Maintain the distinction between: Current state 

and: 

Historical events 

Do not destroy historical information merely to simplify current-state queries. 

# **37. Audit** 

Important actions must create audit records. 

Examples: 

- User creation 

- Account deactivation 

- Role changes 

- Priority changes 

- Station changes 

- Ticket creation 

- Claiming 

- Assignment 

- Transfer 

- Status changes 

- Resolution 

- Feedback 

- Administrative configuration changes 

Audit records should be append-oriented. 

# **38. Notifications** 

Notifications use: 

Database 

+ 

Redis/Celery 

# + 

Email 

# + 

WebSockets 

Notifications must respect user authorization and visibility. Internal notes must never become user notifications. 

Background notification processing must be idempotent. 

# **39. Celery and Background Tasks** 

Use Celery for asynchronous and scheduled work. 

Use Celery Beat for scheduled tasks where appropriate. 

Background tasks must: 

- Re-check current state. 

- Be safe to retry. 

- Avoid duplicate side effects. 

- Handle temporary failures. 

- Log failures appropriately. 

For example, an escalation task must verify that the ticket is still unattended before sending an escalation. 

# **40. Redis** 

Redis is used for: 

- Queue/coordination support 

- Cache 

- Background-task infrastructure 

- Real-time support 

Redis is not the authoritative source of permanent ticket records. 

PostgreSQL remains authoritative. 

# **41. WebSockets** 

Use Django Channels for real-time communication. Endpoints include: /ws/notifications/ /ws/tickets/{id}/ /ws/queue/ Every WebSocket connection must be authenticated and authorized. 

A WebSocket must not provide access to information that the corresponding HTTP API would deny. 

Core ticket functionality must continue to work if WebSockets are temporarily unavailable. 

# **42. Email** 

Use the company's SMTP service. 

Email should not be responsible for changing authoritative ticket state. For example: Ticket resolved ↓ Database state updated ↓ Email task created ↓ Email sent/retried 

A temporary email failure must not undo the ticket transaction. 

# **43. Time Handling** 

Use timezone-aware datetime values. 

Do not rely on the developer's local timezone. 

Explicitly handle: 

- GMT/UTC 

- Working days 

- Feedback expiry 

- P2 escalation 

- P3 escalation 

- Notification timestamps 

- Audit timestamps 

# **44. Error Handling** 

Do not expose: 

- Stack traces 

- Passwords 

- Secrets 

- Database credentials 

- Internal filesystem paths 

- Unnecessary infrastructure information 

to ordinary users. 

Use structured API errors. 

Log detailed diagnostic information only in controlled server logs. 

# **45. Rate Limiting** 

Apply appropriate rate limits to: 

||Login|
|---|---|
||Password reset|
||Feedback|
||Search|
||File uploads|
||Sensitive administrative operations|
||Other abuse-sensitive endpoints|
|Do no|t introduce limits that make normal internal usage impractical.|



# **46. Dependency Management** 

- Do not add dependencies unnecessarily. Before introducing a package: 1. Confirm the functionality is required. 2. Check whether an existing dependency already provides it. 3. Consider maintenance and security implications. 4. Add a pinned or appropriately constrained dependency. 5. Update tests where necessary. 

- Do not replace the approved stack merely because another technology is familiar. 

# **47. Environment Configuration** 

Use environment-specific configuration. Never hard-code: Production passwords API keys SMTP credentials 

Database passwords 

Secret keys 

Production hostnames 

Production IP addresses 

Use .env.example for placeholders. 

Never commit .env files containing real credentials. 

# **48. Development vs Production** 

Docker Compose is preferred for local development and reproducibility. 

Production deployment is environment-dependent. 

Do not assume that production uses: 

# Ubuntu 

Nginx 

Docker 

Do not hard-code these into application logic. 

The current company environment includes a dedicated server using cPanel, but the exact production OS/runtime/web-server configuration remains subject to confirmation. 

# **49. cPanel** 

Treat cPanel as the current hosting/control environment. 

Do not introduce cPanel-specific logic into: 

- Django business logic 

- Database models 

- API contracts 

- Ticket workflows 

- Authorization 

cPanel-specific configuration belongs in deployment/infrastructure documentation. 

The application must remain portable. 

# **50. Existing HRMS** 

The existing company HRMS is a separate application. 

Do not: 

- Modify its code. 

- Modify its database. 

- Reuse its credentials without authorization. 

- Assume undocumented APIs. 

- Introduce undocumented dependencies. 

- Interfere with its deployment. 

Future HRMS integration requires separate design and approval. 

# **51. Active Directory** 

The company uses Windows Active Directory. 

AD/LDAP integration is future scope unless explicitly requested. 

Do not implement AD integration merely because the infrastructure uses AD. 

However, avoid architectural choices that would make future integration unnecessarily difficult. 

# **52. Performance** 

Use database queries efficiently. 

Avoid: 

- N+1 queries 

- Loading unnecessary records 

- Calculating queues entirely in Python 

- Unnecessary API calls 

- Excessive WebSocket messages 

- Unnecessary background tasks 

Use: 

- Appropriate indexes 

- Pagination 

- select_related 

- prefetch_related 

- Database filtering 

- Efficient serializers 

Measure before introducing complex optimizations. 

# **53. Frontend Rules** 

The frontend must: 

- Consume the documented API. 

- Respect backend permissions. 

- Validate user input for usability. 

- Display useful errors. 

- Avoid duplicating authoritative business logic. 

- Handle loading states. 

- Handle network failures. 

- Handle WebSocket reconnection. 

- Remain responsive. 

- Follow accessibility principles. 

Hiding a button is not an authorization mechanism. 

# **54. API and Frontend Compatibility** 

When changing an API: 

1. Identify affected frontend components. 

2. Update backend tests. 

3. Update API documentation. 

4. Update TypeScript types. 

5. Update frontend integration. 

6. Run end-to-end tests. 

Do not silently break existing clients. 

# **55. Database Migration Rules** 

Every model change that affects the database must have an appropriate migration. Before a migration: 

- Review schema impact. 

- Check constraints. 

- Check indexes. 

- Consider existing data. 

- Test migration. 

- Consider rollback/recovery. 

Do not manually modify production database schemas outside the controlled migration process unless explicitly authorized. 

# **56. Testing** 

Every significant feature must have tests. 

At minimum, test: 

- Expected behaviour 

- Invalid input 

- Unauthorized behaviour  Boundary conditions  Error conditions 

- Concurrency where relevant 

Security-sensitive features require explicit authorization tests. 

# **57. Required Security Tests** 

Always test: 

User → cannot access another user's ticket 

User → cannot see internal messages 

Agent → cannot access unauthorized station 

Agent → cannot perform admin operations 

Client → cannot change priority 

Client → cannot bypass status transitions 

Unauthorized user → cannot access attachment 

Unauthorized WebSocket → rejected 

Used feedback token → rejected 

Expired feedback token → rejected 

Concurrent claim → only one succeeds 

Concurrent feedback → only one succeeds 

# **58. Testing Order** 

For a business-critical feature, follow: 

Model 

↓ Migration ↓ Service ↓ Authorization ↓ API ↓ Backend tests ↓ Frontend integration ↓ Frontend UI ↓ 

End-to-end tests 

Do not build a large frontend workflow before the backend behaviour is established. 

# **59. Git** 

Use Git throughout development. 

Keep commits focused. Examples: 

feat: add ticket creation service feat: implement station queue fix: prevent duplicate feedback submission security: restrict internal message access test: add ticket claim concurrency tests docs: update deployment requirements 

Never commit: 

- Secrets 

- Production databases 

- Uploaded production files 

- .env files 

- Private credentials 

# **60. Existing Code** 

Before modifying existing code: 

1. Inspect it. 

2. Understand its purpose. 

3. Determine whether it is used elsewhere. 

4. Preserve compatible behaviour unless a change is required. 

# 5. Avoid unnecessary rewrites. 

Do not replace functioning components merely because another implementation looks cleaner. 

# **61. Feature Decomposition** 

Do not attempt to implement the entire application in one operation. 

Break work into small features. 

For example: 

Ticket Management 

↓ 

Create ticket 

↓ 

View ticket 

↓ Claim ticket ↓ 

Assign ticket 

↓ 

Transfer ticket 

↓ 

Resolve ticket 

Complete and test each logical unit before moving to the next. 

# **62. Scope Control** 

Do not introduce future features into the MVP without approval. 

Future scope includes: 

- AD/LDAP 

- SSO 

- Advanced analytics 

- Asset management 

- Knowledge base 

- AI assistance 

- Mobile application 

- Enterprise integrations 

Do not expand the project merely because a feature seems useful. 

# **63. Production Readiness** 

Before declaring the application production-ready, verify: 

- Authentication 

- Authorization 

- Ticket lifecycle 

- Queue 

- Priority 

- Escalation 

- Messaging 

- Attachments 

- Notifications 

- Feedback 

- Administration 

- Audit 

- Search 

- Reporting 

- Security 

- Backups 

- Recovery 

- Logging 

- Monitoring 

- Deployment 

All critical acceptance scenarios must pass. 

# **64. Deployment** 

Follow 12-deployment.md. 

The deployment must remain environment-dependent. 

Do not assume: 

Ubuntu 

Nginx 

Docker 

are mandatory production components. 

Docker Compose is preferred for development/reproducibility. 

The production deployment must adapt to the company's actual dedicated-server/cPanel environment. 

Do not interfere with the existing HRMS deployment. 

# **65. Security Review Before Completion** 

Before completing any feature, ask: 

Can an unauthorized user access this? 

Can the client manipulate this? 

Can another station see this? 

Can an ordinary user elevate priority? 

Can internal information leak? 

Can the operation race with another request? 

Can the operation be replayed? 

Can uploaded files be abused? 

Can sensitive information appear in logs? 

Does the operation need an audit record? 

Fix identified issues before considering the feature complete. 

# **66. Documentation Updates** 

If implementation changes: 

- Business rules 

- Permissions 

- Workflow 

- Database structure 

- Architecture 

- API 

- Security 

- Notifications 

- Deployment 

update the corresponding documentation. 

Do not allow code and specifications to silently diverge. 

# **67. Code Quality** 

Code should be: 

- Readable 

- Modular 

- Typed where appropriate 

- Testable 

- Maintainable 

- Consistent with project conventions 

Avoid: 

- Giant functions 

- Duplicated business logic 

- Unnecessary abstractions 

- Hidden side effects 

- Hard-coded configuration 

- Magic values 

- Unused dependencies 

Prefer clear code over clever code. 

# **68. Do Not Trust the Client** 

This is one of the most important rules. 

The client may send: 

priority=P1 

status=CLOSED station=OTHER_STATION assignee=ADMIN 

role=ADMIN 

The backend must treat these values as untrusted input. 

The backend determines whether the requested operation is valid. 

# **69. Business-Critical Transactions** 

Use transactions for: 

- Ticket creation where multiple records must remain consistent 

- Claiming 

- Assignment 

- Transfer 

- Resolution 

- Feedback submission 

- Reopening 

- Closing 

- Other operations involving multiple related state changes 

Ensure failures do not leave inconsistent ticket state. 

# **70. Idempotency** 

Where duplicate execution is possible, operations should be idempotent or otherwise protected against duplicate effects. 

Particularly: 

- Escalation 

- Notifications 

- Feedback submission 

- Background tasks 

- Scheduled jobs 

Do not assume a background task will execute exactly once. 

# **71. Search Authorization** 

Search must respect the same access controls as direct ticket access. 

A user must not retrieve an unauthorized ticket by searching for: 

- Ticket number 

- Employee name 

- Description 

- Problem type 

- Station 

- Other identifying information 

Search results must be filtered server-side. 

# **72. Consultant Accounts** 

Consultants have temporary accounts. 

Store an expiration date. 

When the expiration date is reached: 

Account active 

↓ 

Expiration reached 

↓ 

Account deactivated 

Historical tickets and records remain available according to normal authorization and retention rules. 

# **73. Accessibility and Usability** 

The frontend should: 

- Use clear labels. 

- Provide useful form validation. 

- Support keyboard navigation where practical. 

- Maintain readable contrast. 

- Provide understandable error messages. 

- Avoid unnecessary complexity. 

- Work on common desktop and mobile-sized screens. 

Accessibility improvements must not weaken authorization. 

# **74. No Production Secrets** 

Never ask the user to paste production secrets into source files. 

Never generate fake credentials and present them as production credentials. 

Use placeholders in examples. 

Example: 

EMAIL_HOST_USER= 

EMAIL_HOST_PASSWORD= 

# **75. When Requirements Are Missing** 

If the requested feature requires an undefined business decision, stop at the boundary of the missing decision. 

For example: 

"The current documentation defines ticket transfer but does not define whether agents may transfer directly to an agent outside their station. This requires clarification before implementing that permission." 

Do not silently invent the rule. 

# **76. Final Implementation Checklist** 

Before declaring a feature complete: 

- [ ] Requirements read 

- [ ] Business rules understood 

- [ ] Database impact considered 

- [ ] Authorization implemented 

- [ ] Service logic implemented 

- [ ] API implemented 

- [ ] Frontend integration completed where required 

- [ ] Unit tests written 

- [ ] API tests written 

- [ ] Security tests written where relevant 

- [ ] Concurrency considered where relevant 

- [ ] Error handling implemented 

- [ ] Logging considered 

- [ ] Audit requirements considered 

- [ ] Documentation updated 

- [ ] Existing functionality verified 

# **77. Final Directive** 

Claude Code must follow this sequence throughout the project: 

READ 

# → UNDERSTAND 

→ PLAN 

→ IMPLEMENT 

→ TEST 

→ SECURE 

→ VERIFY 

→ DOCUMENT 

The primary objective is not to generate the largest amount of code. 

The objective is to build the approved IT Ticketing System correctly. 

The implementation must remain: 

# Secure 

+ 

# Correct 

+ 

# Maintainable 

+ 

# Testable 

+ 

# Portable 

+ 

# Documented 

+ 

Consistent with Business Rules 

When uncertain, preserve the documented requirement, avoid assumptions, and identify the missing decision before changing system behaviour. 

