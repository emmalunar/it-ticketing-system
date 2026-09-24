Agreed. `08-system-architecture.md` is one of the documents that actually needs meaningful revision because the earlier version hard-coded Ubuntu, Nginx, and Dockerbased production assumptions. 

I’ll preserve the approved application architecture while making the **production infrastructure portable and environment-dependent** . cPanel will be treated as the 

current hosting environment, not as part of the application's business architecture. 

08-system-architecture.md 

# **IT Ticketing System — System Architecture** 

## **1. Document Purpose** 

This document defines the technical architecture of the IT Ticketing System. 

It describes: 

- Application architecture 

- Major system components 

- Responsibilities of each component 

- Communication between components 

- Data flow 

- Authentication and authorization boundaries 

- Real-time communication 

- Background processing 

- File storage 

- Email notifications 

- Deployment boundaries 

- Security boundaries 

- Development and production environments 

- Reliability and recovery considerations 

- Scalability considerations 

The architecture is designed to support the current internal IT support requirements while remaining portable enough to operate within the company's existing dedicatedserver/cPanel environment and adapt to future infrastructure changes. 

# **2. Architectural Principles** 

The system should follow these principles: 

1. **Backend as the source of truth** 

2. **Clear separation of frontend and backend responsibilities** 

3. **Modular monolith architecture** 

4. **Relational data integrity** 

5. **Centralised persistent storage** 

6. **Explicit authorization** 

7. **Secure-by-default design** 

8. **Asynchronous processing for scheduled/background work** 

9. **Real-time communication where beneficial** 

10. **Environment-independent application design** 

11. **Configuration through environment variables** 

12. **Auditable state changes** 

13. **Transactional handling of critical operations** 

14. **Portable deployment** 

15. **Future integration readiness** 

# **3. High-Level Architecture** 

The logical application architecture is: 

```
┌───────────────────────────────┐
│        Internal Users         │
│                               │
│ Employees / Agents / Admins   │
└───────────────┬───────────────┘
               │
               │ HTTPS
               ▼
┌───────────────────────────────┐
│       Web Access Layer        │
│                               │
│ Reverse Proxy / Web Server    │
│ Environment-dependent         │
└───────────────┬───────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌───────────────┐  ┌────────────────┐
│   Next.js     │  │ Django / DRF   │
```



<!-- Start of picture text -->
│   Frontend    │  │ Backend        │<br>└───────────────┘  └───────┬────────┘<br>                          │<br>           ┌──────────────┼──────────────┐<br>           │              │              │<br>           ▼              ▼              ▼<br>     PostgreSQL         Redis         Channels<br>     Persistent DB      Queue/Cache   WebSockets<br>                          │<br>                          ▼<br>                      Celery<br>                   Background Tasks<br>                          │<br>            ┌─────────────┴─────────────┐<br>            │                           │<br>            ▼                           ▼<br>         MinIO                        SMTP<br>     File/Object Storage           Email Service<br><!-- End of picture text -->

The exact production web-server and process-management arrangement is environment-dependent. 

The logical responsibilities of the application components remain unchanged regardless of deployment method. 

# **4. Architectural Style** 

The application will use a **modular monolith** architecture. 

The backend is a single Django application containing logically separated modules. 

Recommended backend modules include: 

```
accounts
stations
tickets
messaging
notifications
feedback
reports
audit
```

A modular monolith is preferred for the MVP because it provides: 

- Clear separation of responsibilities 

- Simpler deployment 

- Easier debugging 

- Easier database transactions 

- Lower operational complexity 

- Easier development and testing 

- Straightforward future extraction of components if scale eventually requires it 

The system should not be unnecessarily divided into microservices during the initial implementation. 

# **5. Frontend Architecture** 

The frontend uses: 

- Next.js 

- TypeScript 

- Tailwind CSS 

- shadcn/ui 

The frontend is responsible for: 

- User interface 

- Navigation 

- Forms 

- Client-side presentation 

- Displaying tickets 

- Displaying queues 

- Displaying notifications 

- User interaction 

- API communication 

- WebSocket communication 

The frontend must not be the authoritative source for business rules. 

For example, the frontend may hide a "Claim" button when the user cannot claim a ticket, but the backend must still reject an unauthorized claim request. 

# **6. Backend Architecture** 

The backend uses: 

- Django 

- Django REST Framework 

- Django Channels 

Django is responsible for: 

- Authentication 

- Authorization 

- Business rules 

- Ticket lifecycle 

- Queue calculations 

- Ticket assignment 

- Station routing 

- Transfers 

- Messaging 

- Feedback 

- Notifications 

- Audit logging 

- Data validation 

- Database interaction 

- API endpoints 

The backend is the authoritative application layer. 

# **7. Database Architecture** 

PostgreSQL is the authoritative persistent database. 

It stores: 

- Users 

- Roles and priority configuration 

- Stations 

- Agent-station assignments 

- Problem categories 

- Problem types 

- Tickets 

- Assignments 

- Transfers 

- Messages 

- Attachments metadata 

- Response templates 

- Notifications 

- Feedback 

- Feedback tokens 

- Escalations 

- Audit records 

- Reporting data derived from application records 

The database must remain the authoritative source for persistent business state. 

# **8. Database Access** 

The Django ORM should be used as the normal database access layer. 

The application should avoid unnecessary raw SQL. 

Where raw SQL is genuinely required for performance or specialised operations, it must be reviewed carefully for: 

- Security 

- Maintainability 

- Parameterisation 

- Transaction behaviour 

- Database compatibility 

Database migrations must be managed through Django migrations. 

# **9. Current State and Historical State** 

The architecture distinguishes between: 

### **Current State** 

Information required to determine the current state of a ticket. 

Examples: 

- Current station 

- Current assignee 

- Current status 

Current priority 

### **Historical State** 

Information describing what happened previously. 

Examples: 

- Assignment history 

- Transfer history 

- Status changes 

- Audit records 

- Messages 

- Feedback events 

This prevents the current ticket record from becoming an overloaded historical record. 

# **10. Redis** 

Redis is used as an infrastructure service for temporary and asynchronous processing needs. 

Potential uses include: 

- Celery task broker 

- Celery result backend where configured 

- Temporary caching 

- Real-time communication support 

- Short-lived coordination data 

Redis must not be treated as the authoritative permanent store for ticket information. 

If Redis becomes unavailable, the system must protect persistent business data stored in PostgreSQL. 

# **11. Celery** 

Celery is responsible for background and scheduled processing. 

Examples include: 

- P2 escalation checks 

- P3 escalation checks 

- Email notification processing 

- Consultant account expiration 

- Feedback expiry processing where required 

- Scheduled maintenance tasks 

- Other asynchronous operations 

Celery workers must revalidate relevant business conditions before performing sensitive actions. 

A background task must not assume that a ticket remains unchanged between task scheduling and task execution. 

# **12. Celery Beat** 

Celery Beat may be used for scheduled tasks. 

Examples: 

```
Periodic escalation checks
Consultant expiration checks
Scheduled notification processing
Maintenance tasks
```

The scheduling mechanism must be configured so that duplicate scheduled execution does not result in duplicate business actions. 

Important background operations must be idempotent. 

# **13. Real-Time Architecture** 

Django Channels provides WebSocket support. 

WebSockets may be used for: 

- New ticket notifications 

- Queue updates 

- New ticket messages 

- Ticket status changes 

- Assignment changes 

Transfer notifications 

In-app notifications 

Real-time communication is an enhancement to the application experience. 

It must not become the authoritative source of business state. 

If a WebSocket connection fails, the application must remain usable through normal API requests and page refresh/reconnection mechanisms. 

# **14. WebSocket Authorization** 

Every WebSocket connection must be authenticated and authorised. 

Authorization must be based on the same underlying rules used by the API. 

For example: 

A user must not be able to subscribe to: 

```
/ws/tickets/{unauthorized-ticket}/
```

merely because they know the ticket identifier. 

The server must verify access before allowing ticket-specific real-time communication. 

# **15. File Storage** 

MinIO is the initial object/file storage solution. 

The architecture separates: 

### **PostgreSQL** 

Stores attachment metadata: 

- Filename 

- Content type 

- Size 

- Storage key 

- Uploader 

- Related ticket/message 

Visibility Timestamp 

### **Object Storage** 

Stores the actual file. 

This separation avoids placing large binary files directly inside PostgreSQL. 

The storage implementation should remain abstract enough to permit a future migration to another object-storage system if required. 

# **16. Attachment Flow** 

The general flow is: 

```
User
 │
 ▼
Next.js
 │
 ▼
Django API
 │
 ├── Validate authorization
 ├── Validate file
 ├── Create metadata
 │
 ▼
Object Storage
 │
 ▼
PostgreSQL metadata
```

The exact transaction and upload sequence may be refined during implementation to ensure that incomplete uploads do not leave unusable attachment records. 

Attachment downloads must always pass through authorization checks. 

# **17. Email Architecture** 

The application uses the company's SMTP service for email delivery. 

Django/Celery is responsible for generating and processing application email notifications. 

Typical email events include: 

- P1 ticket notification 

- P2 escalation 

- P3 escalation 

- Ticket assignment 

- Ticket transfer 

- Ticket resolution 

- Feedback request 

- Negative feedback 

- Other configured notifications 

The application must not assume that email delivery is instantaneous or guaranteed. 

Email failures should be logged and retried where appropriate. 

# **18. Notification Architecture** 

Notifications use multiple layers. 

```
Business Event
     │
     ▼
Django Backend
     │
     ├───────────────┐
     ▼               ▼
Notification DB    Background Task
     │               │
     ▼               ▼
In-App            Email / Other
     │
     ▼
WebSocket
```

The notification record in PostgreSQL provides persistent application-level notification state. 

Redis/Celery supports asynchronous processing. 

WebSockets provide real-time delivery. 

# **19. API Architecture** 

The backend exposes a versioned REST API. 

Base path: 

```
/api/v1/
```

The API is responsible for: 

- Authentication 

- Ticket operations 

- Messages 

- Queue information 

- Notifications 

- Feedback 

- Administration 

- Reporting 

- Search 

The API must enforce: 

- Authentication 

- Authorization 

- Validation 

- Business rules 

- Rate limits where required 

- Consistent error handling 

The API must not expose internal implementation details unnecessarily. 

# **20. API and Frontend Boundary** 

The frontend communicates with the backend through defined APIs. 

The frontend should not: 

- Connect directly to PostgreSQL 

- Connect directly to Redis 

Modify database records directly 

Implement authoritative business rules 

Access object storage without appropriate authorization controls 

The intended boundary is: 

```
Next.js
  │
  │ API / WebSocket
  ▼
Django
  │
  ▼
Application Services
  │
  ▼
PostgreSQL / Redis / Storage / SMTP
```

# **21. Service Layer** 

Business-critical operations should be implemented through backend service functions or equivalent application-service structures. 

Examples: 

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

The service layer should centralise business logic so that the same rules are applied regardless of whether an operation originates from: 

REST API 

Administrative interface 

- Background task 

Other approved backend process 

# **22. Transaction Boundaries** 

Critical state-changing operations must use appropriate database transactions. Examples: 

### **Claim** 

```
Check eligibility
    ↓
Lock/validate ticket
    ↓
Create assignment
    ↓
Update ticket
    ↓
Audit
    ↓
Commit
```

### **Transfer** 

```
Validate authorization
    ↓
Validate target
    ↓
Update station/assignment
    ↓
Record transfer
    ↓
Audit
    ↓
Create notifications
    ↓
Commit
```

### **Feedback** 

```
Validate token
    ↓
Validate expiry
    ↓
Lock feedback/token state
    ↓
Record feedback
    ↓
Update ticket
    ↓
Invalidate token
    ↓
Audit
    ↓
Commit
```

The implementation must prevent race conditions such as: 

- Double claiming 

- Double feedback submission 

- Conflicting transfers 

- Invalid concurrent status changes 

# **23. Authentication Architecture** 

The MVP may use application-managed authentication. 

Authentication must be isolated from authorization so that future identity-provider integration can be introduced without redesigning the entire permission model. 

The system should retain application-level concepts for: 

- User 

- Role 

- Priority 

- Station scope 

- Active/inactive status 

Future Active Directory/LDAP integration may replace or extend the authentication mechanism. 

# **24. Future Active Directory / LDAP Integration** 

The company uses Windows Active Directory. 

AD/LDAP is considered a future integration point rather than a mandatory MVP component. 

The architecture should therefore avoid coupling business logic directly to local password authentication. 

A future directory integration could provide: 

```
Active Directory
      │
      ▼
Authentication / User Provisioning
      │
      ▼
IT Ticketing Application
      │
      ├── Role
      ├── Priority
      └── Station Scope
```

Directory identity should not automatically determine application permissions unless explicit mapping rules are configured. 

# **25. Authentication and Authorization Flow** 

The logical flow is: 

```
User
 │
 ▼
Next.js
 │
 ▼
Authentication
 │
 ▼
Django
 │
 ▼
```

`Authorization │ ├── Role ├── Station Scope ├── Object Access └── Ticket State │ ▼ Business Logic │ ▼ Database` Authorization must occur before protected business operations are performed. 

# **26. Queue Architecture** 

Queue calculations are based on PostgreSQL ticket state. 

The queue should not be permanently stored as a manually maintained list. 

The logical queue process is: 

```
Active Tickets
     │
     ▼
Filter Station
     │
     ▼
Exclude P1
     │
     ▼
Exclude IN_PROGRESS / WAITING_USER / RESOLVED / CLOSED
     │
     ▼
P2 First
     │
     ▼
FIFO
     │
     ▼
P3
     │
```

```
     ▼
FIFO
```

Queue position should be derived from current database state. 

# **27. Escalation Architecture** 

Escalation is handled asynchronously. 

The logical process is: 

```
Ticket Created
     │
     ▼
Ticket Enters Applicable Flow
     │
     ▼
Background Worker
     │
     ▼
Check Current Ticket State
     │
     ├── Claimed/Assigned? → Stop
     │
     ├── No longer eligible? → Stop
     │
     └── Threshold reached? → Escalate
                             │
                             ▼
                        Record Escalation
                             │
                             ▼
                        Send Notification
```

The worker must re-check the current state before escalating. 

This prevents stale background tasks from incorrectly escalating tickets that have already been claimed. 

# **28. Feedback Architecture** 

Feedback is handled through a secure token-based mechanism. 

Logical flow: `Ticket Resolved │ ▼ Generate Secure Token │ ▼ Store Token Hash + Expiry │ ▼ Send Feedback Link │ ▼ User Opens Link │ ▼ Validate Token │ ├── Invalid/Expired → Reject │ └── Valid │ ▼ Submit Feedback │ ▼ Invalidate Token │ ▼ Update Ticket` 

Feedback expiration follows the applicable 5:00 PM GMT working-day rule. 

# **29. Audit Architecture** 

Important actions generate audit records. 

The audit system should capture: 

Actor Action Entity 

- Entity ID 

- Ticket where applicable 

- Previous values where appropriate 

- New values where appropriate 

- Metadata 

- Timestamp 

Audit records should be append-only during normal operation. 

Audit logging should occur close to the transaction that changes the business state so that important state changes are not silently lost. 

# **30. Security Boundaries** 

The system should maintain clear boundaries between: 

### **User Interface** 

Untrusted client environment. 

### **Application API** 

Primary security and authorization boundary. 

### **Application Services** 

Business-rule enforcement. 

### **Database** 

Persistent data boundary. 

### **Redis** 

Temporary/coordination infrastructure. 

### **Object Storage** 

Protected file boundary. 

### **SMTP** 

External notification boundary. 

No client should directly access internal services that are intended to remain private. 

# **31. Network Architecture** 

The exact production network topology depends on the company's dedicated server environment. 

The logical architecture is: 

```
Internal Users
     │
     │ HTTPS
     ▼
Application Web Access
     │
     ▼
Frontend / Backend
     │
     ├───────────────┐
     ▼               ▼
PostgreSQL          Redis
     │
     ├───────────────┐
     ▼               ▼
Object Storage      Celery
                     │
                     ▼
                   SMTP
```

Where the hosting environment supports service isolation, PostgreSQL, Redis, Celery, and object storage should not be exposed directly to ordinary users. 

# **32. Production Web Server** 

The production web server or reverse proxy is intentionally environment-dependent. 

The application must not require a specific product such as Nginx. 

The production environment may use: 

- An existing reverse proxy 

- A cPanel-managed web server 

- Another supported web server 

- A containerised reverse proxy 

Another approved company infrastructure component 

The application must expose standard interfaces that allow it to operate behind the selected production web server. 

# **33. cPanel Relationship** 

The company currently uses cPanel on its dedicated server environment. 

cPanel is treated as a **hosting and administration environment** , not as part of the application architecture. 

The application must not place business logic inside cPanel configuration. 

cPanel may be used to manage or expose: 

- Domains/subdomains 

- SSL/TLS 

- Application processes where supported 

- Web-server configuration 

- Email or DNS-related settings where applicable 

- Server resources 

The exact integration depends on the capabilities of the company's cPanel installation. 

The application must remain deployable independently of cPanel-specific business logic. 

# **34. Production Operating System** 

The production operating system is not currently hard-coded into the application architecture. 

The company has a dedicated server, but the exact operating-system/runtime configuration must be confirmed during deployment preparation. 

The application must therefore avoid assumptions such as: 

```
Production = Ubuntu
```

Instead: 

```
Production = Company-approved server environment
```

Application requirements should be documented separately from operating-system assumptions. 

# **35. Containerization** 

Docker Compose is preferred for development and reproducible local environments. A development environment may contain: 

```
frontend
backend
postgres
redis
celery
celery-beat
minio
```

Production containerization is conditional. 

If the company's server environment supports and approves Docker, the application may be deployed using containers. 

If it does not, the application must be capable of being deployed using the supported native application/runtime mechanisms. 

The architecture must not make Docker a mandatory business dependency. 

# **36. Development Architecture** 

The recommended local development architecture is: 

```
Docker Compose
     │
     ├── Next.js
     ├── Django
     ├── PostgreSQL
     ├── Redis
     ├── Celery
     ├── Celery Beat
     └── MinIO
```

This provides developers with a consistent environment. 

Local development may use development-specific settings and credentials. 

Production credentials must never be committed to source control. 

# **37. Environment Separation** 

At minimum, the project should distinguish between: 

```
Development
Testing
Staging (if available)
Production
```

Each environment should have its own: 

- Configuration 

- Secrets 

- Database 

- Redis instance 

- File storage 

- Email configuration 

- Allowed hosts 

- Security settings 

Development data must not be treated as production data. 

# **38. Configuration Management** 

Environment-specific values should be supplied through environment variables or an approved configuration mechanism. 

Examples include: 

```
DJANGO_SECRET_KEY
DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS
DATABASE_URL
REDIS_URL
MINIO_ENDPOINT
MINIO_ACCESS_KEY
```

```
MINIO_SECRET_KEY
EMAIL_HOST
EMAIL_PORT
EMAIL_HOST_USER
EMAIL_HOST_PASSWORD
```

Secrets must not be hard-coded in source code. 

The `.env.example` file may document required variable names but must not contain real production credentials. 

# **39. HTTPS and Transport Security** 

Production communication should use HTTPS. 

TLS termination may occur at: 

- The production web server 

- A reverse proxy 

- Another approved infrastructure component 

The application must correctly handle secure requests behind the selected infrastructure. 

Security settings must be configured according to the actual deployment topology. 

# **40. Internal Service Exposure** 

The following services should not normally be directly exposed to ordinary employees: 

- PostgreSQL 

- Redis 

- Celery worker interfaces 

- Object-storage administrative interfaces 

- Other internal service ports 

Only the necessary application/web endpoints should be accessible to users. 

Administrative infrastructure access should be separately restricted. 

# **41. Health Checks** 

The application should provide health/readiness mechanisms suitable for the deployment environment. 

Health checks may verify: 

- Application availability 

- Database connectivity 

- Redis availability where required 

- Background processing health where applicable 

- Storage availability where required 

Health endpoints must not expose sensitive configuration or credentials. 

# **42. Failure Behaviour** 

The system should fail safely when individual components become unavailable. 

### **PostgreSQL unavailable** 

Persistent ticket operations should fail safely rather than writing incomplete state. 

### **Redis unavailable** 

Background and real-time features may be temporarily affected, but PostgreSQL data must remain authoritative. 

### **Celery unavailable** 

Scheduled/background processing may be delayed. 

The application should continue operating for synchronous actions where possible. 

### **SMTP unavailable** 

Email delivery may fail or be delayed. 

The ticket itself must not be lost because an email could not be sent. 

### **WebSocket unavailable** 

Users should still be able to access current information through normal HTTP/API requests. 

### **Object storage unavailable** 

Attachment operations may temporarily fail, but unrelated ticket operations should remain functional where possible. 

# **43. Logging** 

The system should maintain structured application logs. 

Logs may include: 

- Application errors 

- Authentication events 

- Background task failures 

- Notification failures 

- Integration failures 

- Unexpected exceptions 

- Security-relevant events 

Logs must not expose: 

- Passwords 

- Secret keys 

- Authentication tokens 

- Feedback tokens 

- Sensitive credentials 

Audit records and application logs serve different purposes and must not be treated as interchangeable. 

# **44. Monitoring** 

The production environment should provide practical monitoring for: 

- Application availability 

- Database availability 

- Background worker health 

- Scheduled task execution 

- Storage availability 

- Disk capacity 

- Email failures Application errors 

- Backup status 

The exact monitoring tools depend on the company's infrastructure. 

The application should expose sufficient information for external monitoring without requiring a specific monitoring platform. 

# **45. Backup Architecture** 

PostgreSQL data must be backed up regularly. 

Attachment/object storage should also be included in backup or recovery planning. 

Backups should be stored separately from the primary application data where possible. 

The backup system should support: 

- Scheduled backups 

- Retention 

- Verification 

- Restoration testing 

- Documented recovery procedures 

Backup configuration is an infrastructure responsibility and should not be tightly coupled to application code. 

# **46. Disaster Recovery** 

The architecture should support recovery from: 

- Database failure 

- Server failure 

- Storage failure 

- Application deployment failure 

- Accidental configuration changes 

- Data corruption 

- Other significant infrastructure incidents 

Recovery procedures should identify: 

- Backup source 

- Restoration sequence 

- Application redeployment process 

- Configuration recovery 

- File-storage recovery 

- Validation steps 

Recovery objectives should be defined in the deployment documentation. 

# **47. Scalability** 

The MVP is intended for internal organisational use. 

The architecture should nevertheless avoid unnecessary bottlenecks. 

Potential future scaling options include: 

- Additional Django application instances 

- Dedicated Celery workers 

- Dedicated Redis infrastructure 

- PostgreSQL tuning 

- External object storage 

- Load balancing 

- Separate frontend hosting 

- Improved monitoring 

- Database read optimisation where justified 

Scaling should be driven by actual organisational requirements rather than premature complexity. 

# **48. Security Architecture Summary** 

Security is implemented through multiple layers: 

```
User Authentication
```

```
      ↓
Role Authorization
      ↓
Station/Object Authorization
```

```
      ↓
```

```
Business Rule Validation
      ↓
Application Service
      ↓
Database Transaction
      ↓
Audit
```

Additional controls include: 

- HTTPS 

- Secure sessions 

- CSRF protection where applicable 

- Input validation 

- Rate limiting 

- Secure file handling 

- Secure token handling 

- WebSocket authorization 

- Secret management 

- Dependency security Backup protection 

Detailed security requirements are defined in `10-security.md` . 

# **49. Data Flow — Ticket Creation** 

The normal ticket creation flow is: 

```
Employee
  │
  ▼
Next.js Ticket Form
  │
  ▼
POST /api/v1/tickets/
  │
  ▼
Django Authentication
  │
  ▼
Authorization & Validation
```

```
  │
  ▼
Determine User Priority
  │
  ▼
Determine Station
  │
  ▼
Create Ticket Transaction
  │
  ├── Ticket
  ├── Audit Record
  └── Notification Event
  │
  ▼
PostgreSQL
  │
  ▼
Background/Real-Time Notification
```

The client does not determine the authoritative priority. 

# **50. Data Flow — Ticket Claim** 

```
Agent
  │
  ▼
Claim Action
  │
  ▼
Django API
  │
  ▼
Authentication
  │
  ▼
Station Authorization
  │
  ▼
Ticket State Validation
  │
  ▼
```

```
Atomic Transaction
  │
  ├── Update Assignment
  ├── Update Ticket Status
  ├── Audit
  └── Notification
  │
  ▼
PostgreSQL
```

The claim operation must prevent concurrent successful claims by multiple agents. 

# **51. Data Flow — Ticket Resolution** 

```
Agent
  │
  ▼
Resolve Ticket
  │
  ▼
Django
  │
  ├── Validate authorization
  ├── Validate ticket state
  ├── Record resolution
  ├── Generate feedback token
  ├── Audit event
  └── Create notification
  │
  ▼
PostgreSQL
  │
  ├── Feedback Token
  └── Ticket State
  │
  ▼
Celery / SMTP
  │
  ▼
User Feedback Link
```

# **52. Data Flow — Feedback** 

```
User
  │
  ▼
Feedback Link
  │
  ▼
Feedback API
  │
  ▼
Validate Token
  │
  ├── Expired → Reject
  ├── Used → Reject
  └── Valid
        │
        ▼
  Transaction
        │
        ├── Record Feedback
        ├── Invalidate Token
        ├── Close/Reopen Ticket
        └── Audit
        │
        ▼
     PostgreSQL
```

# **53. Data Flow — Background Escalation** 

```
Celery Beat / Scheduler
       │
       ▼
Escalation Task
       │
       ▼
Query Eligible Tickets
       │
       ▼
Revalidate Current State
       │
       ├── Claimed → No escalation
```

```
       ├── Ineligible → No escalation
       └── Threshold reached
                 │
                 ▼
            Record Escalation
                 │
                 ▼
            Send Notification
                 │
                 ├── In-App
                 ├── Email
                 └── WebSocket
```

The task must be idempotent. 

# **54. Component Dependency Summary** 

|**Component**|**Depends On**|**Primary Responsibility**|
|---|---|---|
|Next.js|Django API / WebSockets|User interface|
|Django|PostgreSQL, Redis as required|Business logic/API|
|PostgreSQL|Persistent storage|Authoritative application data|
|Redis|None at application level|Queue/cache/realtime support|
|Celery|Django, Redis, PostgreSQL as<br>required|Background tasks|
|Celery Beat|Celery/Redis|Scheduled tasks|
|Channels|Django, Redis where<br>configured|WebSockets|
|MinIO|Application configuration|File/object storage|
|SMTP|External company mail service|Email delivery|
|Production Web|Environment-dependent|HTTP/TLS/routing/process|
|Server||exposure|



# **55. Repository Architecture Alignment** 

The architecture maps to the repository structure: 

```
it-ticketing-system/
│
├── docs/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── stations/
│   │   ├── tickets/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   ├── feedback/
│   │   ├── reports/
│   │   └── audit/
│   └── manage.py
│
├── infrastructure/
│
├── tests/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

The architecture should remain aligned with this structure unless a documented reason for change exists. 

**56. Development vs Production Development** 

Docker Compose is preferred for creating a reproducible development environment. 

Developers should be able to start the core services consistently. 

## **Testing** 

Automated tests should use an isolated test environment. 

Test data must not be mixed with production data. 

## **Production** 

Production deployment must use the company's approved infrastructure. 

The application must not assume: 

- Ubuntu 

- Nginx 

- Docker 

- A particular cloud platform 

The production deployment method should be selected after confirming the capabilities and restrictions of the company's dedicated server/cPanel environment. 

# **57. Existing HRMS Separation** 

The company already has an HRMS application within its hosting environment. 

The IT Ticketing System must be deployed as a separate application. 

The architecture must prevent: 

- Database coupling without explicit approval 

- Shared application code 

- Shared secrets 

- Accidental modification of the HRMS 

- Dependency on undocumented HRMS implementation details 

Integration with the HRMS may be considered in the future if formally required. 

# **58. Future Integration Readiness** 

The architecture should allow future integration with: 

- Active Directory / LDAP 

- Single Sign-On 

- HRMS 

- Asset management 

- Knowledge base 

- External notification systems 

- Advanced analytics 

- AI services 

- Mobile clients 

Future integrations should communicate through defined interfaces rather than directly modifying core business data without authorization. 

# **59. Architectural Constraints** 

The implementation must respect the following constraints: 

1. PostgreSQL remains the authoritative persistent store. 

2. Django remains the primary backend/business-logic layer. 

3. Next.js remains the primary web frontend. 

4. Redis is not the permanent ticket database. 

5. Celery handles background processing. 

6. Django Channels handles real-time communication. 

7. File storage remains separate from relational ticket metadata. 

8. Internal messages remain protected. 

9. Backend authorization remains mandatory. 

10. Critical operations remain transaction-safe. 

11. Production infrastructure remains environment-dependent. 

12. cPanel must not become a business-logic dependency. 

13. The application must remain portable. 

14. Active Directory integration remains future scope unless explicitly approved. 

# **60. Architectural Decision Summary** 

The approved architecture is: 

```
Frontend
Next.js + TypeScript
       │
```

```
       │ HTTPS / WebSocket
       ▼
Backend
Django + Django REST Framework
       │
       ├───────────────┐
       │               │
       ▼               ▼
PostgreSQL           Redis
       │               │
       │               ▼
       │            Celery
       │               │
       │         Celery Beat
       │
       ├───────────────┐
       ▼               ▼
    MinIO             SMTP
```

The production web access layer sits in front of the application but is intentionally environment-dependent: 

```
Company Users
     │
     ▼
Approved Production Web Access Layer
     │
     ▼
Next.js / Django Application
```

The architecture therefore preserves the approved technology stack while avoiding unnecessary assumptions about the company's exact server operating system, web server, or container support. 

# **61. Final Architectural Principle** 

The system should be built so that the **application architecture remains stable even when the deployment infrastructure changes** . 

The application depends on clearly defined capabilities: 

HTTP/HTTPS Application runtime 

- PostgreSQL 

- Redis 

- Background task execution 

- Object/file storage 

- SMTP 

- WebSocket support where enabled 

It should not depend on a particular operating system, hosting control panel, reverseproxy product, or container platform unless that dependency is explicitly confirmed and documented. 

The current company environment is a dedicated server with cPanel. That environment should be supported without allowing its implementation details to dictate the application's business architecture. 

The guiding architecture is: 

```
Portable Application
       +
Environment-Specific Deployment
       =
Maintainable IT Ticketing System
```

This is the main architectural correction we needed. **The application stack remains Django + Next.js + PostgreSQL + Redis + Celery + Channels + MinIO, but production infrastructure is no longer artificially tied to Ubuntu, Nginx, or Docker.** 

The next document that actually needs a similar deployment-aware review is `10security.md` , because its infrastructure-security sections currently contain some Nginx/Docker/Ubuntu-specific assumptions. 

