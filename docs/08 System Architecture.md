# **08-system-architecture.md** 

# IT Ticketing System — System Architecture 

- **Document:** 08-system-architecture.md 

- **Status:** Approved Architecture 

**Version:** 1.0 

**Last Updated:** 2026-09-14 

## 1. Purpose 

This document defines the technical architecture of the internal IT Ticketing System. 

It describes how the frontend, backend, database, background workers, real-time communication, file storage, email services, and reverse proxy work together. 

The architecture is designed for: 

- Internal company/intranet use 

- Reliable ticket processing 

- Secure role-based access 

- Station-based ticket routing 

- Real-time ticket and notification updates 

- Background escalation processing 

- Maintainability 

- Future expansion 

- Straightforward deployment using Docker Compose 

The architecture must support the business rules and requirements defined in: 

- `02-product-requirements.md` 

- `03-business-rules.md` 

- `04-user-roles-and-permissions.md` 

- `05-ticket-workflow.md` 

- `06-queue-and-priority-system.md` 

- `07-database-design.md` 

If an implementation decision conflicts with those documents, the business and security rules take precedence. 

# # 2. Architecture Overview 

The system follows a layered web application architecture. 

```text 

COMPANY INTRANET │ 

▼ 

┌─────────────┐ 

│   Browser   │ │ Next.js UI  │ └──────┬──────┘ │ HTTP / HTTPS │ ▼ ┌─────────────┐ │    Nginx    │ │ Reverse     │ │ Proxy       │ └──────┬──────┘ │ ┌─────────────┴─────────────┐ │                           │ ▼ ▼ ┌─────────────┐             ┌─────────────┐ │   Next.js   │             │   Django    │ │  Frontend   │             │ REST API    │ └─────────────┘             └──────┬──────┘ │ ┌─────────────────────────┼────────────────────────┐ │                         │                        │ ▼ ▼ ▼ ┌─────────────┐          ┌─────────────┐          ┌─────────────┐ │ PostgreSQL  │          │    Redis    │          │   MinIO     │ 

│   Database  │          │ Cache/Queue │          │ File Store  │ └─────────────┘          └──────┬──────┘          └─────────────┘ │ ▼ ┌─────────────┐ │   Celery    │ │   Workers   │ └──────┬──────┘ │ ▼ ┌─────────────┐ │ Company     │ │ SMTP Server │ └─────────────┘ Real-Time Communication │ ▼ Django Channels WebSockets 

# **3. Technology Stack** 

**Layer Technology** Frontend Next.js Frontend Language TypeScript UI Tailwind CSS + shadcn/ui 

|**Layer**|**Technology**|
|---|---|
|Backend|Django|
|API|Django REST Framework|
|Database|PostgreSQL|
|Real-time|Django Channels + WebSockets|
|Background Tasks|Celery|
|Message Broker / Cache|Redis|
|File Storage|MinIO|
|Reverse Proxy|Nginx|
|Email|Company SMTP|
|Containerisation|Docker|
|Deployment|Docker Compose|
|Server OS|Ubuntu Server LTS|
|Testing|Pytest / Django Tests + Playwright|
|Source Control|Git|



# **4. Architectural Principles** 

The following principles apply throughout the project. 

# **4.1 Backend Is the Source of Truth** 

The frontend must never be responsible for enforcing business rules. 

The backend is responsible for: 

- Authentication 

- Authorization 

- Ticket visibility 

- Priority 

- Queue calculations 

- Assignment 

- Transfers 

- Status transitions 

- Escalation rules 

- Feedback validation 

- Token validation 

- Audit logging 

- Data validation 

The frontend only presents the information and actions permitted by the backend. 

# **4.2 Database Is the Source of Persistent State** 

PostgreSQL stores authoritative application data. 

Redis must not be treated as the permanent source of ticket state. 

If Redis is restarted, the system must remain capable of recovering from PostgreSQL. 

# **4.3 Current State and History Are Separate** 

Tickets contain their current state. 

Historical actions are recorded separately. 

For example: 

tickets current_assignee current_station status priority 

ticket_assignments 

previous/current assignments 

ticket_transfers 

station transfer history 

audit_logs 

important system actions 

This prevents historical information from being lost when the current ticket state changes. 

# **4.4 Business Logic Must Be Centralised** 

Important business operations should be implemented in backend service functions rather than duplicated across API views. 

Examples: create_ticket() claim_ticket() assign_ticket() transfer_ticket() 

send_ticket_message() 

resolve_ticket() 

generate_feedback_token() submit_feedback() reopen_ticket() close_ticket() 

API endpoints call these services. 

This makes the system easier to test and reduces inconsistent behaviour. 

# **5. Component Responsibilities** 

# **5.1 Next.js Frontend** 

The frontend is responsible for the user interface. 

Responsibilities include: 

- Login interface 

- User dashboard 

- Ticket creation form 

- Ticket list 

- Ticket details 

- Ticket conversation 

- Agent queue 

- Agent dashboard 

- Notifications 

- Admin interfaces 

- Feedback interface 

- Search interface 

- Reports and dashboards 

- Responsive layout 

- Client-side form validation 

- Displaying real-time updates 

The frontend must not independently determine: 

- User priority 

- Ticket visibility 

- Queue position 

- Ticket ownership 

- Whether a ticket may be claimed 

- Whether a ticket may be transferred 

- Whether feedback is valid 

- Whether a user may access a resource 

These decisions must come from the backend. 

# **6. Django Backend** 

Django is the main application server. 

It provides: 

- Authentication 

- Authorization 

- REST API 

- Business logic 

- Database access 

- Ticket workflow 

- Queue logic 

- Notification generation 

- Audit logging 

- Feedback processing 

- File metadata management 

- Administrative functionality 

Django REST Framework exposes the application API. 

Recommended backend application structure: 

backend/ 

├── config/ 

│   ├── settings/ 

- │   ├── urls.py 

- │   └── asgi.py 

│ 

- ├── apps/ 

- │   ├── accounts/ 

- │   ├── stations/ 

- │   ├── tickets/ 

- │   ├── messaging/ 

- │   ├── notifications/ 

- │   ├── feedback/ 

- │   ├── reports/ 

- │   └── audit/ │ 

- ├── manage.py 

└── requirements.txt 

# **7. PostgreSQL** 

PostgreSQL is the primary relational database. 

It stores: 

- Users 

- Stations 

- Agent-station assignments 

- Problem categories 

- Problem types 

- Tickets 

- Ticket assignments 

- Ticket transfers 

- Messages 

- Attachments metadata 

- Response templates 

- Notifications 

- Feedback 

- Feedback tokens 

- Escalations 

- Audit logs 

PostgreSQL is the authoritative persistent data store. 

# **8. Redis** 

Redis is used for: 

- Celery task brokering 

- Celery task results where required 

- Short-lived caching 

- Real-time channel coordination where required 

Redis must not replace PostgreSQL for permanent application data. Example: 

PostgreSQL 

↓ 

Permanent ticket state 

Redis 

↓ 

Temporary/cache/background-task coordination 

# **9. Celery** 

Celery handles tasks that should not block normal user requests. 

Examples include: 

- P2 escalation checks 

- P3 escalation checks 

- Sending escalation emails 

- Sending ticket notifications 

- Sending feedback emails 

- Scheduled maintenance 

- Cleanup of expired temporary data 

- Other scheduled background jobs 

Example: 

User creates ticket 

│ 

▼ 

Django saves ticket 

│ ▼ 

Django creates notification/task 

│ ▼ 

Celery │ 

▼ 

Email / notification processing 

The user should not have to wait for an external email server before receiving the HTTP response confirming ticket creation. 

# **10. Django Channels and WebSockets** 

Django Channels provides real-time communication. 

WebSockets may be used for: 

- New ticket notifications 

- Queue updates 

- New ticket messages 

- Internal agent messages 

- Assignment updates 

- Transfer notifications 

- Ticket status changes 

- Read/unread notification updates 

- Other live dashboard changes 

Example: 

Agent Browser 

│ │ WebSocket ▼ 

Django Channels │ ▼ 

Authorization 

│ 

# ▼ 

Relevant event 

WebSocket authorization must follow the same permission rules as normal API requests. An agent must never receive WebSocket events for tickets they are not authorised to view. 

# **11. Nginx** 

Nginx is the reverse proxy and public/internal entry point. 

Responsibilities: 

- Receive HTTP/HTTPS requests 

- Route frontend requests 

- Route API requests 

- Route WebSocket connections 

- Serve static files where appropriate 

- Apply basic request controls 

- Terminate TLS in production 

- Hide internal service addresses 

Example: 

Browser 

│ ▼ 

Nginx 

┌─┴─────────────────────┐ │                       │ ▼ ▼ Next.js              Django 

│ ▼ 

Channels 

Internal services should not be directly exposed to users unless required. 

# **12. MinIO** 

MinIO provides object storage for uploaded files. 

Examples: 

- Screenshots 

- Error logs 

- Documents 

- Images 

- Other ticket attachments 

PostgreSQL stores file metadata. 

MinIO stores the actual file. 

Example: 

PostgreSQL 

filename 

storage_key 

content_type 

file_size 

ticket_id 

uploaded_by 

MinIO 

actual file 

The application must enforce attachment permissions before allowing a file to be downloaded. 

A user must not be able to access another user's attachment by guessing a storage key. 

# **13. SMTP** 

The application uses the company's SMTP service for email. 

Email may be used for: 

- P1 immediate notifications 

- P2 escalation notifications 

- P3 escalation notifications 

- Ticket assignment notifications 

- Ticket transfer notifications 

- User updates 

- Resolution notifications 

- Feedback requests 

- Other administrative notifications 

Email delivery must be handled asynchronously where practical. 

# **14. Request Flow** 

A normal API request follows: 

Browser 

│ 

▼ Nginx │ ▼ Next.js / Django API │ ▼ Authentication │ ▼ 

Authorization 

│ ▼ Validation │ ▼ 

Business Service 

│ ▼ 

Django ORM 

│ ▼ PostgreSQL │ ▼ 

Response 

The frontend should never communicate directly with PostgreSQL, Redis, MinIO, or Celery. 

# **15. Ticket Creation Flow** 

When a user creates a ticket: 

1. User opens ticket form 

- ↓ 

2. Selects station 

↓ 

3. Selects problem type 

↓ 

4. Enters description 

↓ 

5. Frontend sends API request 

↓ 

6. Django authenticates user 

↓ 

7. Django determines user's priority 

↓ 

8. Django validates station/problem type 

↓ 

9. Django creates ticket 

↓ 

10. Ticket receives unique ticket number 

- ↓ 

11. Queue rules are applied 

↓ 

12. Notification event is created 

- ↓ 

13. Background notification processing begins 

- ↓ 

14. Response returned to frontend 

- ↓ 

15. Relevant agents receive notification 

The client must not submit the priority as a trusted value. 

The backend determines it from the authenticated user. 

# **16. P1 Ticket Flow** 

P1 tickets bypass the normal queue. 

P1 Ticket Created │ ▼ 

Determine Selected Station 

│ ▼ 

Find Active Agents 

for Station 

│ ├───────────────┐ ▼ ▼ In-App Notification    Email │               │ └───────┬───────┘ 

▼ 

Immediate Handling 

P1 tickets do not receive a normal queue position. 

# **17. P2/P3 Queue Flow** 

P2 and P3 tickets enter the station queue. 

Queue order: 

P2 

↓ 

Older P2 first 

↓ 

P3 

↓ 

Older P3 first 

Queue calculations must be performed by the backend. 

The database should perform filtering and ordering rather than loading all tickets into application memory. 

Example conceptual query: 

station 

+ 

active status 

+ 

P2/P3 

+ 

waiting for agent 

+ 

priority ordering 

+ 

creation ordering 

# **18. Queue Position Flow** 

When a P2/P3 user requests their queue position: User │ ▼ Django API │ ▼ Authorization │ ▼ Queue Service │ ▼ PostgreSQL │ ▼ Calculate applicable tickets ahead │ 

▼ Return position 

Queue position should be calculated dynamically. 

It should not be permanently stored as a number on the ticket. 

For example: 

Ticket A 

Ticket B Ticket C ← current ticket 

If Ticket A is claimed, the user's ticket may automatically move from: 

2 tickets ahead to: 1 ticket ahead 

# **19. Claiming a Ticket** 

Claiming is a concurrency-sensitive operation. 

Two agents must not be able to successfully claim the same ticket simultaneously. Recommended flow: 

Agent │ ▼ 

Claim API 

│ ▼ 

Authorization 

│ ▼ 

Database Transaction │ ▼ 

Lock / verify ticket │ ▼ Check still claimable? │ ┌┴───────────────┐ │                │ Yes              No │                │ ▼ ▼ Assign agent    Reject request │ ▼ Change status to IN_PROGRESS │ ▼ Record assignment history │ ▼ Audit action 

This operation must be atomic. 

# **20. Ticket Transfer Flow** 

Transfers change the ticket's current station and/or responsible agent. 

Current Agent │ ▼ 

Transfer Request │ ▼ Authorization │ ▼ 

Validate Destination │ ▼ 

Database Transaction 

│ ├── Update ticket station ├── Update assignment ├── Record transfer └── Audit action │ ▼ 

Notify Receiving Station/Agent 

Historical transfer information must remain available. 

# **21. Ticket Messaging Flow** 

User-visible conversation: 

User 

│ 

▼ Django API │ ▼ Authorization │ ▼ Message Service │ ▼ PostgreSQL │ ▼ WebSocket event │ ▼ Agent Internal agent communication: Agent A 

│ ▼ Internal Message │ ▼ 

Django 

│ 

▼ 

Authorization 

│ 

▼ 

PostgreSQL │ 

▼ 

Agent B / authorised agents 

Internal messages must never be included in user-facing API responses. 

# **22. Predefined Notices** 

Agents may send predefined notices such as: 

"I am coming." 

"Please bring your PC." 

Templates are stored in the database and may be managed by administrators. The frontend retrieves active templates from the backend. 

The frontend must not hard-code the official template catalogue. 

# **23. Resolution Flow** 

When an agent resolves a ticket: 

Agent │ ▼ 

Resolve Ticket 

│ 

▼ Validate agent permission │ ▼ Validate resolution information │ ▼ Database transaction │ ├── status = RESOLVED ├── resolution timestamp ├── resolution notes └── audit record │ ▼ Generate feedback token │ ▼ Send feedback notification │ ▼ User receives feedback link 

The feedback token must be securely generated. 

# **24. Feedback Flow** 

The feedback process is: 

User opens feedback link 

│ ▼ 

Token validation │ ├── Invalid/expired → Reject │ ▼ 

Display feedback form 

│ ▼ 

User submits rating 

│ ▼ 

Database transaction │ ├── Verify token unused ├── Verify token unexpired ├── Save feedback ├── Mark token used └── Change ticket status │ ├── Positive → CLOSED │ └── Negative → REOPENED 

The token must become unusable immediately after successful submission. 

The feedback expiration rule is based on 5:00 PM GMT and the applicable working day. 

# **25. Background Escalation Architecture** 

Celery handles unattended ticket escalation. 

Conceptually: 

Celery Beat │ ▼ 

Scheduled Escalation Task │ ▼ 

Query PostgreSQL │ ▼ 

Find unattended tickets 

│ ├── P2 ≥ 10 minutes │ └── P3 ≥ 60 minutes │ ▼ 

Check escalation already sent 

│ ▼ 

Create escalation record 

│ ▼ 

Create notification 

│ ▼ 

Send email 

Escalation processing must be idempotent. 

A temporary worker failure must not cause duplicate escalation emails when the task runs again. 

# **26. Notification Architecture** 

Notifications should be generated centrally. 

Example: 

Business Event 

│ ▼ 

Notification Service 

│ ├───────────────┐ ▼ ▼ 

Database           Celery Notification       Email Task │               │ ▼ ▼ In-App             SMTP 

This allows the system to support multiple notification channels without duplicating business logic. 

# **27. Authentication Architecture** 

The application must authenticate every protected request. 

Conceptual flow: 

Browser │ ▼ Login │ ▼ 

Django Authentication │ 

▼ 

Session / Secure Authentication Mechanism │ ▼ 

Authenticated Request 

The exact authentication mechanism should be selected during implementation based on the deployment requirements. 

The architecture must support future integration with: 

- Active Directory 

- LDAP 

- Company SSO 

These are future enhancements unless explicitly added to the MVP. 

# **28. Authorization Architecture** 

Authorization follows: 

Authenticated User 

│ ▼ Determine Role │ ▼ 

Determine Priority │ ▼ 

Determine Station Scope 

│ ▼ 

Check Resource Access 

│ ▼ 

Allow / Deny 

Authorization must be enforced on the backend. 

Example: 

USER 

→ own tickets only 

AGENT 

→ tickets within authorised station scope 

ADMIN 

→ system-wide authorised access 

The system must also account for: 

- Current station 

- Assigned stations 

- Ticket transfer 

- Current assignee 

- Message visibility 

- Attachment visibility 

# **29. WebSocket Security** 

WebSocket connections require authentication and authorization. 

A connected agent must only receive events belonging to their authorised scope. Example: 

Agent A Stations: - Head Office 

Agent B Stations: - Babylove - Tesano 

If a ticket exists at Babylove - Tesano, Agent A must not receive its private ticket events merely because Agent A has an active WebSocket connection. 

When a ticket is transferred to Head Office, the relevant visibility/event rules change accordingly. 

# **30. File Upload Flow** 

Recommended flow: 

Browser │ ▼ 

Django API 

│ ├── Authenticate ├── Authorize ├── Validate file └── Validate ticket access │ ▼ MinIO │ ▼ 

Save file metadata 

in PostgreSQL 

Security controls should include: 

- File size limits 

- Allowed content types 

- Filename sanitisation 

- Storage key generation 

- Access authorization 

- Malware scanning if introduced later 

- No direct unrestricted public bucket access 

# **31. Deployment Architecture** 

Production deployment uses Docker Compose. 

Conceptual services: 

docker-compose │ ├── nginx 

- ├── frontend 

- ├── backend 

- ├── celery-worker 

- ├── celery-beat 

- ├── postgres 

- ├── redis └── minio 

SMTP remains an external company service unless the organisation specifically decides otherwise. 

# **32. Production Network** 

Recommended logical arrangement: 

Company Network 

│ ▼ Nginx │ ┌─────┴───────────┐ │                 │ ▼ ▼ Frontend         Backend 

│ ┌────────────┼────────────┐ ▼ ▼ ▼ PostgreSQL     Redis         MinIO │ ▼ Celery │ ▼ SMTP 

Only the necessary entry point should be accessible from employee devices. 

Database, Redis and MinIO should not be directly exposed to the employee network. 

# **33. Development Environment** 

Developers should be able to run the application locally using Docker. Recommended development environment: 

Developer PC │ 

├── Docker Desktop 

├── Git ├── VS Code └── Claude Code The application can run: 

Frontend container 

Backend container 

PostgreSQL container 

Redis container 

Celery worker Celery beat MinIO container 

This keeps development environments consistent. 

# **34. Environment Configuration** 

Secrets and environment-specific configuration must not be committed to Git. Use: .env .env.example Examples of environment variables: DJANGO_SECRET_KEY DJANGO_DEBUG DATABASE_URL REDIS_URL MINIO_ENDPOINT MINIO_ACCESS_KEY MINIO_SECRET_KEY SMTP_HOST SMTP_PORT SMTP_USERNAME SMTP_PASSWORD .env must be excluded from version control. .env.example must contain placeholders rather than real credentials. 

# **35. Failure and Recovery Behaviour** 

The system should fail gracefully. 

# **PostgreSQL unavailable** 

The application should: 

- Return a controlled error 

- Avoid corrupting application state 

- Log the failure 

- Recover when the database becomes available 

# **Redis unavailable** 

The application should: 

- Log the failure 

- Retry background processing where appropriate 

- Avoid treating Redis as permanent data storage 

Some real-time/background features may temporarily become unavailable. 

# **Celery unavailable** 

Normal API operations should remain available where possible. 

Pending background work should be processed once workers recover. 

# **SMTP unavailable** 

Ticket creation should not fail simply because an email cannot immediately be sent. Email should be queued for retry. 

# **MinIO unavailable** 

Attachment operations may temporarily fail, but ticket metadata should not be corrupted. 

# **36. Database Transactions** 

The following operations require database transactions: 

- Claiming a ticket 

- Assigning a ticket 

- Transferring a ticket 

- Resolving a ticket 

- Submitting feedback 

- Reopening a ticket 

- Closing a ticket 

- Important administrative configuration changes 

The goal is to prevent partially completed operations. 

For example, a ticket transfer should not update the station while failing to create its transfer history. 

# **37. Concurrency Control** 

The application must account for multiple agents operating simultaneously. 

Important concurrency-sensitive operations include: 

- Claiming tickets 

- Assignment 

- Transfer 

- Feedback submission 

- Status changes 

- Administrative changes 

Example: 

Agent A ──┐ 

├── Claim Ticket X Agent B ──┘ 

Only one valid claim should succeed. 

The implementation should use appropriate database transactions and row-level locking where required. 

# **38. Audit Architecture** 

Important system actions must create audit records. 

Examples: 

Ticket created 

Ticket claimed 

Ticket assigned 

Ticket transferred 

Ticket resolved 

Ticket reopened 

Ticket closed 

Priority/configuration changed 

User deactivated 

Station assignment changed 

Problem type changed 

Template changed 

Audit logs should be append-only from the application perspective. 

Normal users and agents should not be able to modify or delete audit records. 

# **39. Reporting Architecture** 

Reporting should use PostgreSQL data through backend services. 

Examples: 

- Tickets created by period 

- Tickets resolved by period 

- Tickets by station 

- Tickets by priority 

- Tickets by problem type 

- Average resolution time 

- Escalated tickets 

- Reopened tickets 

- Agent workload 

- Feedback results 

The frontend should request report data through APIs. 

The frontend must not connect directly to PostgreSQL. 

# **40. Caching Strategy** 

Caching should be introduced only where it provides measurable benefit. 

Potential candidates: 

- Active problem types 

- Active response templates 

- Station lists 

- Certain dashboard statistics 

Ticket state, assignment and authorization-sensitive information should not rely on stale cache data. 

The first implementation should prioritise correctness over aggressive caching. 

# **41. API and Frontend Boundary** 

The frontend communicates with the backend through: 

REST API 

+ 

WebSockets 

The frontend should not contain business rules that must also exist in the backend. For example, this is acceptable: 

Frontend: 

"Display P1 badge." This is not acceptable as the source of truth: Frontend: 

"If user is CEO, make ticket P1." 

The backend must determine the priority. 

# **42. Project Directory Alignment** 

The architecture maps to the repository as follows: 

it-ticketing-system/ │ ├── docs/ │ ├── frontend/ │   ├── app/ │   ├── components/ │   ├── lib/ │   └── types/ │ 

- ├── backend/ 

- │   ├── config/ 

- │   ├── apps/ 

│   │   ├── accounts/ 

- │   │   ├── stations/ 

- │   │   ├── tickets/ 

- │   │   ├── messaging/ 

- │   │   ├── notifications/ 

- │   │   ├── feedback/ 

- │   │   ├── reports/ 

- │   │   └── audit/ │   └── manage.py │ 

- ├── infrastructure/ 

│   ├── nginx/ │   ├── docker/ │   └── backups/ │ ├── tests/ │ 

- ├── docker-compose.yml 

- ├── README.md └── .env.example 

# **43. Scalability** 

The initial system is designed for a moderate internal user base. 

The architecture allows future scaling. 

Potential future scaling: 

Nginx │ ┌───────────┼───────────┐ ▼ ▼ ▼ Backend     Backend     Backend │           │           │ └───────────┼───────────┘ │ PostgreSQL 

Celery workers can similarly be increased: 

Redis │ ├── Worker 1 ├── Worker 2 └── Worker 3 Scaling should only be introduced when required by actual workload. 

# **44. Security Boundaries** 

The main security boundaries are: 

Employee Browser │ │ HTTPS ▼ Nginx │ ▼ 

Application Layer 

│ ├── Authentication ├── Authorization └── Validation │ ▼ 

Data Layer │ ├── PostgreSQL ├── Redis └── MinIO 

Employees should not have direct access to: 

- PostgreSQL 

- Redis 

- MinIO administration 

- Celery 

- Internal backend management interfaces 

Administrative interfaces must require appropriate privileges. 

# **45. Backup Architecture** 

PostgreSQL must be backed up automatically. 

Backups should be stored separately from the primary database server. Recommended approach: 

PostgreSQL │ 

▼ 

Scheduled Backup 

│ ▼ Separate Backup Storage 

Backups should be: 

- Automated 

- Retained according to company policy 

- Monitored 

- Tested through restoration exercises 

A backup that has never been tested for restoration should not be considered fully reliable. 

MinIO attachment storage should also have a backup/recovery strategy. 

# **46. Logging and Monitoring** 

The system should maintain application logs for: 

- API errors 

- Authentication failures 

- Background task failures 

- Email failures 

- Database errors 

- File-storage errors 

- WebSocket errors 

- Unexpected exceptions 

Logs must not expose: 

- Passwords 

- Authentication tokens 

- Feedback raw tokens 

- SMTP credentials 

- Other secrets 

Production monitoring can be expanded later. 

# **47. Health Checks** 

Services should expose or support health checks. 

Examples: 

Backend → Database connectivity 

Backend → Redis connectivity 

Celery → Redis connectivity 

MinIO → availability 

Docker Compose health checks should be used where practical to control service startup dependencies. 

Health checks must distinguish between: 

Service is running 

and: 

Service is actually usable 

# **48. Service Dependency Order** 

The logical dependency chain is: 

PostgreSQL 

│ ├──────────────┐ ▼ ▼ 

Backend          Celery 



Channels         Redis 

│ ▼ 

Frontend 

MinIO and SMTP provide additional external dependencies. 

Docker Compose should manage startup and restart behaviour, but application services must still handle temporary dependency failures gracefully. 

# **49. Architecture Decision Summary** 

The approved architecture is: 

Frontend 

Next.js + TypeScript 

│ ▼ 

Nginx 

│ ▼ 

Django + DRF 

│ ┌────┼──────────────┐ 

▼ ▼ ▼ 

Postgres Redis       MinIO 

│     │ │ ▼ 

- │   Celery │     │ │ ▼ │    SMTP │ ▼ 

Persistent Application Data 

Django Channels │ ▼ 

WebSockets │ ▼ 

Real-Time Browser Updates 

This architecture provides a clear separation between: 

- Presentation 

- API 

- Business logic 

- Persistent data 

- Background processing 

- Real-time communication 

- File storage 

- Email delivery 

- Infrastructure 

# **50. Claude Code Implementation Boundaries** 

Claude Code must follow the architecture defined in this document. 

# **Claude Code must:** 

- Use Django for backend development. 

- Use Django REST Framework for APIs. 

- Use PostgreSQL for persistent relational data. 

- Use Celery for background processing. 

- Use Redis for Celery/message coordination and appropriate caching. 

- Use Django Channels for WebSockets. 

- Use MinIO for attachment storage. 

- Use Next.js and TypeScript for the frontend. 

- Use Nginx as the production reverse proxy. 

- Use Docker Compose for deployment. 

- Keep secrets in environment variables. 

- Follow the database design document. 

- Follow the documented business rules. 

- Implement authorization server-side. 

- Use transactions for concurrency-sensitive operations. 

- Create audit records for important actions. 

- Write tests for business-critical behaviour. 

# **Claude Code must not:** 

- Invent new business rules. 

- Move business logic into the frontend. 

- Allow the frontend to determine priority. 

- Allow clients to bypass authorization. 

- Store permanent ticket data in Redis. 

- Store uploaded files directly in PostgreSQL. 

- Expose internal agent messages to users. 

- Expose PostgreSQL directly to employee devices. 

- Implement queue positions as permanently stored numbers. 

- Allow double-claiming of tickets. 

- Allow feedback tokens to be reused. 

- Hard-code configurable problem types. 

- Hard-code response templates. 

- Delete ticket history during normal operations. 

- Introduce additional architecture components without documenting the reason. 

When requirements are unclear, Claude Code should identify the ambiguity rather than silently inventing behaviour. 

# **51. Architecture Change Policy** 

Any major change to the architecture should be documented before implementation. Examples of architectural changes: 

- Replacing Django 

- Replacing PostgreSQL 

- Replacing Redis 

- Changing frontend framework 

- Changing storage system 

- Introducing microservices 

- Introducing Kubernetes 

- Introducing an external authentication provider 

- Changing the deployment model 

The project should avoid unnecessary architectural complexity during MVP development. 

# **52. Final Architecture Principle** 

The system should remain a modular monolithic application during the initial implementation. 

The preferred architecture is: 

One Django Backend 

+ 

One Next.js Frontend 

+ PostgreSQL 

+ 

Redis + 

Celery + 

Django Channels 

+ 

MinIO 

+ 

Nginx 

This provides enough separation for maintainability while avoiding the operational complexity of microservices. 

The system should only be split into separate services if future scale or organisational requirements clearly justify it. 

That completes **`08-system-architecture.md`**. 

The next document should be **`09-api-specification.md`**, where we turn this architecture into the actual API contract: endpoints, request/response structures, authentication, permissions, ticket operations, messaging, feedback, notifications, queue endpoints, and admin endpoints. 

