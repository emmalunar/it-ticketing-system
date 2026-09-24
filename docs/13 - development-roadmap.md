# **IT Ticketing System — Development Roadmap** 

# **1. Document Purpose** 

This document defines the development sequence for the IT Ticketing System. 

It establishes: 

- Development phases 

- Implementation order 

- Dependencies between features 

- Testing requirements 

- Acceptance criteria 

- Development practices 

- Scope-control rules 

- Documentation requirements 

- Production-readiness requirements 

The roadmap is intended to guide implementation using Claude Code while keeping the project maintainable, secure, testable, and aligned with the approved project documentation. 

# **2. Development Principles** 

Development must follow these principles: 

1. Business rules are defined by the project documentation. 

2. Claude Code must not invent missing business rules. 

3. Backend logic is the source of truth. 

4. Security must be implemented together with functionality. 

5. Database models should reflect approved business entities. 

6. Business-critical operations should use a service layer. 

7. Every significant feature must have automated tests. 

8. Frontend development must follow the API contract. 

9. Infrastructure assumptions must remain environment-dependent. 

- 10.Production-specific configuration must not be hard-coded. 

- 11.Changes must be incremental and reviewable. 

12.Documentation must remain synchronized with implementation. 

13.MVP scope must be protected from unnecessary feature expansion. 

# **3. Approved Technology Stack** 

The implementation uses: 

**Layer Technology** Frontend Next.js 

Frontend Language TypeScript 

|UI|Tailwind CSS + shadcn/ui|
|---|---|
|Backend|Django|
|API|Django REST Framework|
|Database|PostgreSQL|
|Real-time|Django Channels + WebSockets|
|Background Tasks|Celery|
|Queue/Cache|Redis|
|File Storage|MinIO initially|
|Email|Company SMTP|
|Testing|Pytest / Django tests + Playwright|
|Source Control|Git|



Docker Compose is preferred for local development and reproducible environments. Production deployment remains environment-dependent. 

# **4. Development Architecture** 

The backend should be developed as a modular monolith. 

Initial Django applications: 

backend/ 

├── config/ │ 

- ├── apps/ 

- │   ├── accounts/ 

- │   ├── stations/ 

- │   ├── tickets/ 

- │   ├── messaging/ 

- │   ├── notifications/ 

- │   ├── feedback/ 

- │   ├── reports/ 

- │   └── audit/ │ 

└── manage.py 

The frontend should remain separated from backend business logic. 

The backend owns: 

- Authentication 

- Authorization 

- Business rules 

- Ticket state 

- Queue calculations 

- Priority 

- Assignment 

- Transfers 

- Feedback 

- Notifications 

- Audit 

- Database operations 

# **5. Development Order** 

The recommended implementation sequence is: 

Project Foundation 

↓ 

Database & Core Backend 

↓ 

Authentication & Authorization 

↓ 

Ticket Management 

↓ 

Queue & Priority 

↓ 

Messaging & Attachments 

↓ 

Notifications & SLA 

↓ 

Feedback & Closure 

↓ 

Administration 

↓ 

Frontend 

↓ 

Real-Time Features 

↓ 

Search & Reporting 

↓ 

Testing & Security Hardening ↓ 

Deployment Preparation 

↓ 

Acceptance Testing 

↓ 

Production Release 

The order should be maintained unless a documented technical dependency requires adjustment. 

# **6. Phase 1 — Project Foundation** 

# **Objectives** 

Create the initial repository and development environment. 

# **Tasks** 

- Initialize Git repository. 

- Create project directories. 

- Configure Django project. 

- Configure Next.js project. 

- Configure TypeScript. 

- Configure Tailwind CSS. 

- Configure shadcn/ui. 

- Configure environment variables. 

- Create .env.example. 

- Configure development PostgreSQL. 

- Configure Redis. 

- Configure development object storage. 

- Configure basic Celery infrastructure. 

- Configure linting/formatting. 

- Configure automated testing. 

- Establish initial README. 

# **Structure** 

it-ticketing-system/ 

- ├── docs/ 

- ├── frontend/ 

- ├── backend/ 

- ├── infrastructure/ 

- ├── tests/ 

- ├── docker-compose.yml 

- ├── README.md 

└── .env.example 

# **Acceptance Criteria** 

- Frontend starts successfully. 

- Backend starts successfully. 

- PostgreSQL connection works. 

- Redis connection works. 

- Celery can connect to Redis. 

- Development object storage is reachable. 

- Git repository is functional. 

- Environment configuration is externalized. 

- No production secrets are committed. 

# **7. Phase 2 — Database and Core Backend** 

# **Objectives** 

Implement the database structure defined in 07-database-design.md. 

# **Tasks** 

Create: 

- Users 

- Stations 

- Agent-station relationships 

- Problem categories 

- Problem types 

- Tickets 

- Ticket assignments 

- Ticket transfers 

- Ticket messages 

- Attachments 

- Response templates 

- Notifications 

- Feedback 

- Feedback tokens 

- Ticket escalations 

- Audit logs 

Implement: 

- UUID primary keys where specified 

- Ticket-number generation 

- Database constraints 

- Indexes 

- Foreign keys 

- Timestamps 

- Soft deactivation where required 

# **Acceptance Criteria** 

- Migrations run successfully. 

- Relationships are correct. 

- Required uniqueness constraints work. 

- Ticket numbers are unique. 

- Invalid relationships are rejected. 

- Database indexes exist for important queries. 

- Basic model tests pass. 

# **8. Phase 3 — Authentication and Authorization** 

# **Objectives** 

Implement secure identity and access control. 

# **Tasks** 

Implement: 

- Login 

- Logout 

- Current-user endpoint 

- User accounts 

- Roles 

- Account activation/deactivation 

- Consultant expiration 

- Password management 

- Role permissions 

- Station permissions 

- Object-level authorization 

# Implement: 

# USER 

AGENT 

ADMIN 

Ensure priority remains separate from role. 

Ensure station scope remains separate from role. 

# **Acceptance Criteria** 

- Users can authenticate. 

- Inactive users cannot authenticate. 

- Expired consultant accounts cannot authenticate. 

- Users cannot access another user's tickets. 

- Agents cannot access unauthorized stations. 

- Agents cannot perform administrator operations. 

- Administrators can perform approved administrative operations. 

- Authorization is enforced by the backend. 

# **9. Phase 4 — Ticket Management** 

# **Objectives** 

Implement the core ticket lifecycle. 

# **Tasks** 

Implement: 

- Ticket creation 

- Problem-type selection 

- Station selection 

- Automatic priority determination 

- Ticket number generation 

- Ticket retrieval 

- Ticket listing 

- Ticket details 

- Ticket messages 

- Claiming 

- Assignment 

- Reassignment 

- Transfer 

- Waiting for user 

- Resume 

- Resolution 

- Reopening 

- Closing 

Implement statuses: 

QUEUED 

IN_PROGRESS 

WAITING_USER 

# RESOLVED 

CLOSED 

# REOPENED 

Implement the approved lifecycle: 

CREATE → QUEUED → IN_PROGRESS → WAITING_USER ↔ IN_PROGRESS → RESOLVED 

RESOLVED → CLOSED 

RESOLVED → REOPENED → IN_PROGRESS 

# **Acceptance Criteria** 

- Every ticket has a station. 

- Every ticket has a problem type. 

- Priority is determined server-side. 

- Valid ticket transitions work. 

- Invalid transitions are rejected. 

- Ticket history is recorded. 

- Assignment history is recorded. 

- Transfers are recorded. 

- Users see only authorized ticket information. 

# **10. Phase 5 — Queue and Priority** 

# **Objectives** 

Implement the station-specific ticket queue. 

# **Priority Rules** 

P1 → Immediate handling, bypasses normal queue 

P2 → Queue + 10-minute unattended escalation 

P3 → Queue + 60-minute unattended escalation 

# **Queue Rules** 

The queue must: 

1. Filter active tickets. 

2. Exclude P1. 

3. Filter by station. 

4. Exclude tickets no longer waiting for agent handling. 

5. Place P2 before P3. 

6. Use FIFO within the same priority. 

The queue position must be calculated dynamically. 

# **Tasks** 

- Queue endpoint 

- Queue summary 

- Ticket queue position 

- Station-specific filtering 

- P1 bypass 

- P2/P3 ordering 

- Queue removal after claim 

- Reopened-ticket queue placement 

- Transfer queue updates 

# **Acceptance Criteria** 

- P1 never receives a normal queue position. 

- P2 appears before P3. 

- FIFO works within each priority. 

- Claimed tickets leave the waiting queue. 

- Resolved/closed tickets leave the queue. 

- Reopened P2/P3 tickets return to the queue. 

- Queue position is correct. 

- Unauthorized agents cannot view unauthorized station queues. 

# **11. Phase 6 — Messaging and Attachments** 

# **Objectives** 

Implement communication between users and IT agents. 

# **Tasks** 

Implement: 

- User-visible messages 

- Internal agent messages 

- System messages 

- Predefined notices 

- Attachments 

- Attachment metadata 

- Attachment authorization 

Predefined notices initially include: 

I am coming 

Please bring your PC 

Templates must eventually be manageable by administrators. 

# **Message Visibility** 

Messages must support: 

USER_VISIBLE 

INTERNAL 

SYSTEM 

Internal messages must never be exposed to ordinary users. 

# **Acceptance Criteria** 

- Users can communicate with agents. 

- Agents can communicate with users. 

- Agents can create internal notes. 

- Users cannot retrieve internal notes. 

- Authorized attachments can be uploaded. 

- Unauthorized attachments cannot be accessed. 

- File-size and file-type restrictions work. 

# **12. Phase 7 — Notifications and SLA** 

# **Objectives** 

Implement notifications and unattended escalation. 

# **Notification Channels** 

Support: 

- In-app notifications 

- Email 

- WebSockets where enabled 

# **Tasks** 

Implement: 

- P1 immediate notification 

- P2 escalation 

- P3 escalation 

- Assignment notification 

- Transfer notification 

- User-message notification 

- Resolution notification 

- Reopen notification 

- System notifications 

# **Escalation** 

P2: 

Ticket created 

↓ No agent claim/assignment 

↓ 10 minutes 

↓ 

Escalation 

P3: 

Ticket created 

↓ 

No agent claim/assignment 

↓ 

60 minutes 

↓ 

# Escalation 

The task must re-check the ticket before sending the notification. 

# **Acceptance Criteria** 

- P1 notifications are immediate. 

- P2 escalation occurs after the defined unattended period. 

- P3 escalation occurs after the defined unattended period. 

- Claimed tickets do not continue escalating. 

- Duplicate escalation notifications are prevented. 

- Failed background tasks can retry safely. 

# **13. Phase 8 — Feedback and Closure** 

# **Objectives** 

Implement the feedback-driven resolution process. 

# **Tasks** 

Implement: 

- Feedback token generation 

- Secure token storage 

- Feedback URL 

- Feedback page 

- Feedback submission 

- Token expiry 

- Token invalidation 

- Positive feedback closure 

- Negative feedback reopening 

# **Expiry Rule** 

Feedback expires at: 

# 17:00 GMT 

on the applicable working day. 

If resolution occurs after 17:00 GMT, expiry moves to 17:00 GMT on the next applicable working day. 

Initial working days: 

Monday–Friday 

# **Acceptance Criteria** 

- Every valid resolution generates the required feedback flow. 

- Expired tokens are rejected. 

- Successful feedback immediately invalidates the token. 

- A token cannot be successfully reused. 

- Positive feedback closes the ticket. 

- Negative feedback reopens the ticket. 

- Reopened tickets return to active handling. 

# **14. Phase 9 — Administration** 

# **Objectives** 

Provide controlled system administration. 

# **Tasks** 

Implement administration for: 

- Users 

- Stations 

- Agent-station assignments 

- Consultant accounts 

- Problem categories 

- Problem types 

- Response templates 

- User priority levels 

- Account activation/deactivation 

- Reports 

- Audit logs 

Problem types must be configuration-driven. 

Administrators should be able to add or deactivate problem types without code changes. 

# **Acceptance Criteria** 

- Admin functions require administrator authorization. 

- Configuration changes are audited. 

- Deactivated problem types cannot be selected for new tickets. 

- Existing tickets using deactivated types remain intact. 

- Consultant expiration works. 

- Agent-station relationships work. 

# **15. Phase 10 — Frontend** 

# **Objectives** 

Build the production user interface around the completed API. 

# **User Interface Areas** 

# **User** 

- Login 

- Dashboard 

- Create ticket 

- My tickets 

- Ticket details 

- Conversation 

- Queue position where applicable 

- Notifications 

- Feedback 

# **Agent** 

- Agent dashboard 

- Station queues 

- Ticket details 

- Claim 

- Assignment 

- Transfer 

- Conversation 

- Internal notes 

- Predefined notices 

- Resolution 

- Notifications 

# **Administrator** 

- Administrative dashboard 

- User management 

- Station management 

- Problem catalogue 

- Templates 

- Reports 

- Audit logs 

- Configuration 

# **Acceptance Criteria** 

- UI follows API permissions. 

- Unauthorized controls are not presented unnecessarily. 

- Backend remains authoritative. 

- Forms validate user input. 

- Errors are displayed clearly. 

- Responsive layouts work. 

- Accessibility requirements are considered. 

# **16. Phase 11 — Real-Time Features** 

# **Objectives** 

Add real-time behaviour after core HTTP workflows are stable. 

# **Tasks** 

Implement WebSockets for: 

/ws/notifications/ 

/ws/tickets/{id}/ 

/ws/queue/ 

Possible events include: 

- New notification 

- New ticket message 

- Ticket assignment 

- Ticket transfer 

- Ticket status change 

- Queue change 

# **Security** 

Every WebSocket connection must enforce normal authentication and authorization. 

A user must not receive events for unauthorized tickets or stations. 

# **Acceptance Criteria** 

- Authorized users receive relevant events. 

- Unauthorized events are blocked. 

- Reconnection works. 

- WebSocket failure does not destroy core HTTP functionality. 

# **17. Phase 12 — Search and Reporting** 

# **Objectives** 

Provide useful operational visibility. 

# **Search** 

Implement authorized search across relevant fields. 

Search must respect: 

- User access 

- Station scope 

- Role 

- Ticket visibility 

# **Reports** 

Initial reporting should cover: 

- Ticket volume 

- Ticket status 

- Ticket priority 

- Station activity 

- Agent activity 

- Resolution information 

- Escalation activity 

- Feedback outcomes 

Reports must not expose information beyond the user's authorization scope. 

# **18. Phase 13 — Testing and Security Hardening** 

# **Objectives** 

Validate the complete system before deployment. 

Testing should include: 

# **Unit Tests** 

Business logic and individual components. 

# **API Tests** 

Endpoints, validation, authorization, and error handling. 

# **Integration Tests** 

Database, Redis, Celery, storage, notifications, and application workflows. 

# **End-to-End Tests** 

Complete user journeys using Playwright. 

# **Security Tests** 

- Authentication 

- Authorization 

- Object access 

- Station access 

- Internal-message confidentiality 

- Priority manipulation 

- Ticket-state manipulation 

- File access 

- Feedback tokens 

- WebSocket authorization 

- Rate limiting 

# **Concurrency Tests** 

Particularly: 

- Ticket claiming 

- Assignment 

- Transfer 

- Feedback submission 

- Escalation processing 

# **19. Critical Acceptance Scenarios** 

The following scenarios must work before production release. 

# **Scenario 1 — Standard Ticket** 

P3 user 

↓ Creates ticket 

↓ 

Ticket enters station queue 

↓ 

Agent sees ticket 

↓ 

Agent claims ticket 

↓ 

Ticket leaves waiting queue 

# **Scenario 2 — P1 Ticket** 

P1 user 

↓ 

Creates ticket 

↓ Immediate station notification 

↓ 

No normal queue position 

# **Scenario 3 — P2 Escalation** 

P2 ticket 

↓ 

No claim/assignment 

↓ 10 minutes ↓ 

Escalation notification 

# **Scenario 4 — P3 Escalation** 

P3 ticket 

↓ No claim/assignment 

↓ 60 minutes ↓ Escalation notification 

# **Scenario 5 — Internal Message** 

Agent A 

↓ 

Internal note 

↓ 

Agent B sees note 

↓ 

User does not see note 

# **Scenario 6 — Transfer** 

Station A 

↓ 

Agent transfers ticket 

↓ 

Station B 

↓ Ticket becomes available according to Station B rules 

# **Scenario 7 — Positive Feedback** 

Agent resolves 

↓ Feedback link ↓ User submits positive feedback ↓ 

Token invalidated 

↓ 

Ticket CLOSED 

# **Scenario 8 — Negative Feedback** 

Agent resolves 

↓ 

Feedback link 

↓ 

User submits negative feedback 

↓ 

Token invalidated 

↓ 

Ticket REOPENED 

↓ 

Ticket returns to active handling 

# **20. Development Workflow** 

Each feature should follow: 

Read requirements 

↓ 

Identify dependencies 

↓ 

Design 

↓ Implement ↓ 

Write tests 

↓ 

Run tests 

↓ 

Security review 

↓ 

Review implementation 

↓ 

Update documentation 

↓ 

Commit 

The workflow should be repeated for each meaningful feature. 

# **21. Backend-First Development Order** 

For business-critical features, implementation should generally follow: 

Database Model 

↓ 

Migration 

↓ 

Service / Business Logic 

↓ 

Authorization 

↓ 

API Endpoint 

↓ Backend Tests ↓ 

Frontend API Integration 

↓ Frontend UI ↓ 

Frontend Tests 

↓ 

Integration Testing 

This prevents business rules from becoming dependent on frontend behaviour. 

# **22. Service Layer** 

Critical business operations should be implemented through clearly defined backend services. 

Examples: 

create_ticket() 

claim_ticket() 

assign_ticket() 

transfer_ticket() 

send_ticket_message() 

resolve_ticket() 

generate_feedback_token() 

submit_feedback() reopen_ticket() close_ticket() 

The service layer should: 

- Validate business rules 

- Perform authorization checks where appropriate 

- Use transactions 

- Update current state 

- Create history 

- Trigger required notifications/events 

# **23. Transactions and Concurrency** 

Operations that modify critical state must use appropriate transaction handling. 

Important examples: 

- Claiming a ticket 

- Assignment 

- Transfer 

- Resolution 

- Feedback submission 

- Closing 

- Reopening 

The system must prevent race conditions such as: 

Agent A claims ticket 

+ 

Agent B claims same ticket 

= 

Only one successful claim 

# **24. API Development** 

The API must follow 09-api-specification.md. 

Base path: 

/api/v1/ 

API development must include: 

- Authentication 

- Authorization 

- Validation 

- Pagination 

- Filtering 

- Error handling 

- Rate limiting where appropriate 

- Consistent response structures 

API changes must not silently break existing frontend functionality. 

# **25. API Compatibility** 

- When an API change is necessary: 

   1. Identify affected clients. 

   2. Determine whether the change is breaking. 

   3. Update documentation. 

   4. Update tests. 

   5. Update frontend integration. 

   6. Consider versioning where appropriate. 

The frontend must not rely on undocumented backend behaviour. 

# **26. Database Migration Safety** 

Before applying a production migration: 

- Review the migration. 

- Test it against representative data. 

- Verify dependencies. 

- Confirm backup availability. 

- Identify possible downtime. 

- Determine rollback/recovery implications. 

Destructive schema changes require particular caution. 

# **27. Performance Development** 

The application should avoid unnecessary database work. 

Important principles: 

- Use appropriate indexes. 

- Use database filtering rather than loading unnecessary records into Python. 

- Use pagination. 

- Avoid N+1 queries. 

- Use select_related/prefetch_related where appropriate. 

- Keep queue calculations database-driven. 

- Avoid unnecessary WebSocket traffic. 

- Avoid unnecessary background jobs. 

Performance should be measured before introducing unnecessary complexity. 

# **28. Time and Timezone Handling** 

The application must use timezone-aware datetimes. 

The feedback and escalation rules depend on exact time calculations. The system must explicitly handle: 

GMT / UTC 

Working days 5:00 PM expiry 10-minute escalation 60-minute escalation 

The implementation must not depend on the developer's local timezone. 

# **29. Background Task Development** 

Celery tasks must be designed for safe retries. 

Tasks should: 

- Re-check current state 

- Be idempotent where possible 

- Avoid duplicate side effects 

- Handle temporary failures 

- Log failures appropriately 

- Avoid assuming the ticket state has remained unchanged 

Background tasks must not blindly execute an action based only on stale data. 

# **30. Real-Time Development** 

WebSocket functionality must remain supplemental. 

The application must continue to work when: 

- WebSocket connection fails 

- User reconnects 

- Browser tab is refreshed 

- Network connection temporarily disappears 

HTTP/API requests remain the authoritative mechanism. 

# **31. Email Development** 

Email functionality should be asynchronous where practical. 

Email failures must not corrupt ticket state. 

For example: 

Ticket resolved 

↓ Ticket remains RESOLVED ↓ 

Email delivery fails 

↓ 

Email task retries 

A temporary SMTP failure must not cause the ticket resolution transaction to be undone. 

# **32. Error Handling** 

Errors must be handled at the appropriate layer. 

The system should provide: 

- User-friendly frontend errors 

- Structured API errors 

- Detailed controlled server logs 

- Appropriate HTTP status codes 

Errors must not expose sensitive implementation details. 

# **33. Scope Control** 

The following are not MVP requirements unless explicitly added later: 

- Active Directory/LDAP integration 

- SSO 

- Advanced analytics 

- Asset management 

- Knowledge base 

- AI assistance 

- Mobile application 

- Enterprise integrations 

Development must not expand into these areas simply because they could be useful. 

# **34. Future Integration Readiness** 

Although future integrations are outside MVP, the architecture should avoid blocking them. In particular: 

# **Active Directory / LDAP** 

Authentication architecture should permit future integration. 

# **HRMS** 

The ticketing system should remain independently deployable. 

# **Asset Management** 

Ticket models should not prevent future association with assets. 

# **Knowledge Base** 

Problem types and ticket history should remain structured enough to support future knowledge-base features. 

Future readiness does not mean implementing these features now. 

# **35. Documentation Maintenance** 

When implementation changes approved behaviour, the relevant documentation must be reviewed. 

Examples: 

Business rule change 

- → 03-business-rules.md 

Permission change 

- → 04-user-roles-and-permissions.md 

Workflow change 

- → 05-ticket-workflow.md 

Queue change 

- → 06-queue-and-priority-system.md 

Database change 

- → 07-database-design.md 

Architecture change 

- → 08-system-architecture.md 

API change 

- → 09-api-specification.md 

Security change 

→ 10-security.md 

Notification/SLA change 

→ 11-notification-and-sla.md 

Deployment change 

- → 12-deployment.md 

Documentation must not silently become inconsistent with implementation. 

# **36. Git Workflow** 

Development should use Git consistently. 

Commits should be: 

- Focused 

- Understandable 

- Related to a specific change 

- Free from secrets 

- Free from generated production data 

Example: 

feat: add ticket creation service 

feat: implement station-based queue fix: prevent duplicate feedback submission test: add ticket claim concurrency tests security: restrict internal message access docs: update deployment configuration 

# **37. Code Review** 

Before merging significant functionality, review: 

- Business-rule compliance 

- Authorization 

- Security 

- Database impact 

- Performance 

- Error handling 

- Test coverage 

- API compatibility 

- Documentation impact 

Code that works but violates an approved business rule must not be considered complete. 

# **38. Claude Code Working Method** 

Claude Code should work incrementally. 

For each feature: 

# **Step 1 — Read** 

Read the relevant project documents. 

# **Step 2 — Understand** 

Identify: 

- Business rules 

- Permissions 

- Data requirements 

- API requirements 

- Security requirements 

- Dependencies 

# **Step 3 — Plan** 

Describe the implementation before making broad changes. 

# **Step 4 — Implement** 

Implement only the requested scope. 

# **Step 5 — Test** 

Run relevant automated tests. 

# **Step 6 — Secure** 

Review authorization, validation, input handling, and sensitive data exposure. 

# **Step 7 — Verify** 

Confirm the feature works with existing functionality. 

# **Step 8 — Document** 

Update relevant documentation if behaviour or architecture changed. 

# **39. Ambiguity and Conflicts** 

If requirements are unclear or contradictory, Claude Code must not silently choose a behaviour. 

It should: 

1. Identify the ambiguity. 

2. Identify the affected requirement. 

3. Explain the implementation impact. 

4. Ask for clarification when necessary. 

Existing approved documents should be treated as the source of truth according to the project documentation hierarchy. 

# **40. Documentation Authority** 

The implementation should follow the project documents in their defined order: 

01 Business Context 

02 Product Requirements 

03 Business Rules 

04 User Roles and Permissions 05 Ticket Workflow 06 Queue and Priority System 07 Database Design 08 System Architecture 09 API Specification 10 Security 11 Notification and SLA 12 Deployment 13 Development Roadmap 14 Claude Code Instructions 

If two documents appear to conflict, the conflict must be identified rather than hidden. 

# **41. Environment Independence** 

Development must not introduce unnecessary production assumptions. 

Claude Code must not hard-code: 

Ubuntu 

Nginx cPanel Docker 

Production hostname 

Production IP 

Production filesystem paths 

The current production context is a dedicated company server using cPanel, but the exact server runtime remains environment-dependent. 

Docker Compose is preferred for development and reproducibility. 

Production containerization is conditional on infrastructure approval. 

# **42. Testing Strategy** 

Testing should occur continuously rather than only at the end. The project should maintain: Backend Unit Tests Backend API Tests Security Tests Integration Tests Frontend Tests End-to-End Tests Concurrency Tests Tests should cover both expected and unauthorized behaviour. 

# **43. Minimum Test Coverage Areas** 

Before MVP release, tests must cover: 

- Authentication 

- Role authorization 

- Station authorization 

- Ticket creation 

- Priority determination 

- Queue ordering 

- Queue position 

- Claiming 

- Assignment 

- Transfer 

- Messaging 

- Internal messages 

- Attachments 

- P1 notification 

- P2 escalation 

- P3 escalation 

- Feedback expiry 

- Feedback replay protection 

- Positive feedback 

- Negative feedback 

- Reopening 

- Closing 

- Consultant expiry 

- Audit logging 

- Administrative permissions 

# **44. Production Readiness** 

The system is not production-ready until: 

- Core workflows are complete. 

- Security controls are implemented. 

- Automated tests pass. 

- Critical concurrency scenarios pass. 

- Database migrations are stable. 

- Background tasks operate correctly. 

- Email works. 

- WebSockets work where enabled. 

- File storage works securely. 

- Backups are configured. 

- Recovery procedures are documented. 

- Production configuration is separated from development. 

- Deployment has been tested. 

- Existing HRMS functionality remains unaffected. 

# **45. MVP Definition of Done** 

The MVP is complete when an employee can: 

Login 

↓ 

Select station 

↓ 

Select problem type 

↓ 

Describe problem 

↓ 

Submit ticket 

↓ 

Track ticket 

↓ 

Communicate with IT 

↓ 

Receive resolution 

↓ 

Submit feedback 

and an authorized IT agent can: 

View authorized station queue 

↓ 

Claim/accept ticket 

↓ 

Communicate with user 

↓ 

Use predefined notices 

↓ 

Add internal notes 

↓ 

Transfer when required 

↓ 

Resolve ticket 

↓ 

Track feedback/reopening 

while administrators can manage the required system configuration and audit activity. 

# **46. Final Implementation Sequence** 

The recommended implementation sequence is: 

PHASE 1 

Project Foundation 

↓ 

PHASE 2 

Database & Core Backend 

↓ 

PHASE 3 

Authentication & Authorization 

↓ 

PHASE 4 

Ticket Management 

↓ 

PHASE 5 

Queue & Priority 

↓ 

PHASE 6 

Messaging & Attachments 

↓ 

PHASE 7 

Notifications & SLA 

↓ 

PHASE 8 

Feedback & Closure 

↓ 

PHASE 9 

Administration 

↓ 

PHASE 10 

Frontend 

↓ 

PHASE 11 

Real-Time Features 

↓ 

PHASE 12 

Search & Reporting 

↓ 

PHASE 13 

Testing & Security Hardening 

↓ 

PHASE 14 

Deployment Preparation 

↓ 

PHASE 15 

Acceptance Testing 

↓ 

PRODUCTION RELEASE 

# **47. Final Development Principle** 

The system should be developed incrementally rather than attempting to build the entire application at once. 

The implementation cycle is: 

READ 

↓ 

# UNDERSTAND 

↓ 

# PLAN 

↓ 

# IMPLEMENT 

↓ 

TEST 

↓ 

# SECURE 

↓ 

# VERIFY 

↓ 

# DOCUMENT 

Every completed feature should leave the application in a working state. 

The objective is not simply to produce code, but to produce a system that is: 

- Correct 

- Secure 

- Maintainable 

- Testable 

- Portable 

- Understandable 

- Consistent with the approved business rules 

- Ready for controlled production deployment 

