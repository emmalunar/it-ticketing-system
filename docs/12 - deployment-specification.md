# **IT Ticketing System — Deployment** 

# **1. Document Purpose** 

This document defines how the IT Ticketing System is prepared, configured, deployed, secured, backed up, maintained, and recovered across development, testing, and production environments. 

The application is intended for deployment within the company's existing dedicated-server environment, which currently uses cPanel. 

The exact production operating system, web-server configuration, application-runtime configuration, and container support have not been formally confirmed. 

Therefore, this document defines: 

- Application deployment requirements 

- Environment configuration 

- Production service requirements 

- cPanel integration considerations 

- Security requirements 

- Database deployment 

- Background workers 

- File storage 

- Email configuration 

- HTTPS 

- Backups 

- Recovery 

- Monitoring 

- Deployment procedures 

The document deliberately avoids making an unconfirmed infrastructure component a mandatory application dependency. 

# **2. Deployment Principles** 

Deployment must follow these principles: 

1. Production must be separated from development. 

2. Production secrets must never be committed to source control. 

3. PostgreSQL must remain the authoritative application database. 

4. Application services must be isolated from ordinary users where possible. 

5. Production configuration must be externalised. 

6. Deployment must be repeatable. 

7. Database migrations must be applied deliberately. 

8. Backups must be automated and tested. 

9. Deployment changes must be documented. 

- 10.The application must remain portable. 

- 11.The production web-server mechanism must be environment-dependent. 

- 12.cPanel must be treated as a hosting/control environment rather than an application dependency. 

- 13.Active Directory/LDAP integration is future scope unless explicitly approved. 

- 14.Production deployment must not interfere with the existing HRMS application. 

# **3. Target Production Environment** 

The current intended production environment is: 

Company Dedicated Server 

│ 

└── cPanel 

│ 

- └── IT Ticketing System 

The application is expected to operate alongside the company's existing web applications. 

The exact production environment must be confirmed before final deployment. Items requiring confirmation include: 

- Operating system 

- Available Python version 

- Node.js support 

- PostgreSQL availability 

- Redis availability 

- Background-process support 

- Web-server configuration 

- WebSocket support 

- SSL/TLS configuration 

- Object-storage requirements 

- Available storage 

- Firewall rules 

- Process-management mechanism 

- Whether Docker is supported and approved 

# **4. cPanel as the Hosting Environment** 

cPanel is currently the company's server-management environment. 

cPanel may be used for infrastructure functions such as: 

- Domain/subdomain management 

- SSL/TLS certificates 

- Web-server configuration 

- Application/runtime configuration where supported 

- DNS configuration where applicable 

- Server resource management 

#  Logs and hosting administration 

However, the application must not depend on cPanel-specific business logic. 

The application should remain deployable if the company later changes its hosting-control environment. 

# **5. Production Architecture** 

The logical production deployment is: 

Internal Company Users 

│ │ HTTPS ▼ 

Production Web Access Layer 

│ ├───────────────┐ ▼ ▼ Next.js          Django 

Frontend          Backend │ ┌───────────┼───────────┐ │           │           │ ▼ ▼ ▼ PostgreSQL     Redis       MinIO │           │ │ ▼ │        Celery │           │ 

│      Celery Beat │ └───────────────┐ ▼ SMTP 

The web-access layer may be provided by the server's existing web-server/cPanel environment or another approved production configuration. 

No specific web-server product is mandatory at the application level. 

# **6. Required Production Components** 

The application requires the following capabilities: 

|**Component**|**Purpose**|
|---|---|
|Next.js|Web frontend|
|Django|Backend and business logic|
|PostgreSQL|Persistent database|
|Redis|Queue/cache/coordination|
|Celery|Background processing|
|Celery Beat|Scheduled tasks|
|Django Channels|WebSockets|
|Object storage|Ticket attachments|
|SMTP|Email notifications|



Production web access layer HTTP/HTTPS and application routing 

The exact method used to run each component depends on the company's server environment. 

# **7. Containerized Deployment** 

Docker Compose is the preferred approach for local development and reproducible environments. 

A development environment may use: 

frontend 

backend 

postgres 

redis 

celery 

celery-beat 

minio 

Production Docker deployment is optional. 

If Docker is supported and approved on the company's server, the same general service architecture may be deployed using containers. 

If Docker is unavailable or not approved, the application must be deployable using the supported native runtime/process-management mechanisms. 

The application must not assume that Docker exists in production. 

# **8. Production Operating System** 

The production operating system is intentionally not specified at this stage. 

The company has a dedicated server, but the exact operating system has not been formally confirmed. 

The application must therefore not contain assumptions such as: 

Ubuntu-specific paths 

Ubuntu-specific service commands 

Ubuntu-specific package management 

Ubuntu-specific deployment scripts 

Where operating-system-specific configuration is unavoidable, it should be isolated inside the deployment/infrastructure documentation. 

# **9. Domain and Application Address** 

The IT Ticketing System should be deployed using an approved internal or companycontrolled hostname. 

The final hostname should be determined during deployment. 

A possible structure is: 

it.company-domain.example 

or another approved company subdomain. 

The application should not be tied to a hard-coded hostname. 

The frontend, backend, API, WebSocket endpoints, and allowed hosts must obtain environment-specific configuration. 

# **10. Separation from Existing HRMS** 

The company already operates an HRMS application within its hosting environment. 

The IT Ticketing System must be deployed independently. 

Deployment must not: 

- Replace the HRMS 

- Modify the HRMS application 

- Reuse HRMS application code without approval 

- Reuse HRMS credentials 

- Assume access to the HRMS database 

- Modify the HRMS database schema 

- Depend on undocumented HRMS implementation details 

Any future HRMS integration must be separately designed and approved. 

# **11. Environment Structure** 

The project should support: 

Development 

Testing 

Staging (if available) 

Production 

Each environment should have separate configuration and data. 

At minimum: 

Development → developer/local data 

Testing     → test data 

Production  → real company data 

Production data must never be casually copied into development environments. 

# **12. Environment Configuration** 

Configuration must be supplied through environment variables or an approved server configuration mechanism. 

Typical variables include: 

DJANGO_DEBUG 

DJANGO_SECRET_KEY 

DJANGO_ALLOWED_HOSTS 

DATABASE_URL 

REDIS_URL 

MINIO_ENDPOINT 

MINIO_ACCESS_KEY 

MINIO_SECRET_KEY 

MINIO_BUCKET 

EMAIL_HOST 

EMAIL_PORT EMAIL_HOST_USER EMAIL_HOST_PASSWORD EMAIL_USE_TLS DEFAULT_FROM_EMAIL 

NEXT_PUBLIC_API_URL 

Additional variables may be introduced as implementation requires. 

Production secrets must never be committed to Git. 

# **13. Django Production Configuration** 

Production Django configuration must include appropriate settings for: 

- DEBUG=False 

- Allowed hosts 

- Secure cookies 

- CSRF trusted origins 

- HTTPS-aware settings 

- Secure session configuration 

- Security headers 

- Static-file handling 

- Media/file handling 

- Database connection 

- Email configuration 

- Logging 

- WebSocket/ASGI configuration 

The exact configuration must reflect the actual production web-server topology. 

# **14. Database Deployment** 

PostgreSQL is the production database. 

Before deployment: 

1. Provision the production database. 2. Create the application database/user. 3. Configure secure credentials. 4. Restrict database access. 5. Configure connection settings. 6. Run Django migrations. 7. Verify database integrity. 8. Create required initial configuration. 9. Create the first administrative account through a controlled process. 

The application should never use SQLite as the production database. 

# **15. Database Migrations** 

Database migrations must be managed through Django migrations. 

The deployment process should be: Backup ↓ Deploy Application Code 

↓ 

Review Migration Changes 

↓ Run Migrations ↓ Verify Application ↓ Monitor Production migrations must be tested before deployment. Destructive migrations require additional review and a verified backup. 

# **16. Database Security** 

The production PostgreSQL database must: 

- Use strong credentials 

- Be accessible only by authorized services 

- Not be publicly exposed 

- Use appropriate authentication 

- Receive regular security updates 

- Be included in backup procedures 

- Be monitored for storage capacity 

The application database user should have only the privileges required by the application. 

# **17. Redis Deployment** 

Redis should be deployed as an internal service. 

It must not normally be exposed to ordinary employees. 

Redis credentials and access controls must be configured according to the production environment. 

Redis data should not be treated as the permanent source of ticket records. 

# **18. Celery Worker Deployment** 

Celery workers must run continuously in production where background processing is required. 

They handle tasks such as: 

- P2 escalation 

- P3 escalation 

- Email processing 

- Notifications 

- Scheduled maintenance 

- Consultant expiration 

- Other approved asynchronous operations 

The production environment must provide a reliable mechanism for keeping Celery workers running. 

The exact process manager is environment-dependent. 

# **19. Celery Beat Deployment** 

Celery Beat is responsible for scheduled tasks. 

Only the intended production scheduler should run the scheduled jobs. 

Running multiple uncontrolled scheduler instances can result in duplicate task scheduling. 

Scheduled tasks must therefore be: 

- Idempotent 

- Auditable where necessary 

- Safe to retry 

# **20. Django Channels / WebSocket Deployment** 

The production environment must support WebSocket connections if real-time features are enabled. 

The web access layer must correctly route WebSocket requests to the Django ASGI application. 

The exact routing configuration depends on the production web server. 

If WebSockets are temporarily unavailable, the core ticketing system should continue to operate through normal HTTP/API requests. 

# **21. Application Runtime** 

Django should run using an appropriate production ASGI server or supported application runtime. 

The exact process model is environment-dependent. 

The production setup must support: 

- Django HTTP requests 

- Django Channels/WebSockets 

- Appropriate worker/process management 

- Graceful restarts 

- Logging 

- Health checks 

The application must not depend on the Django development server in production. 

# **22. Next.js Production Deployment** 

The Next.js frontend must be built using the appropriate production build process. 

The production deployment should: 

1. Install approved dependencies. 

2. Build the frontend. 

3. Configure the production API endpoint. 

4. Configure any required WebSocket endpoint. 

5. Start the production application using the approved runtime mechanism. 

Development servers must not be used in production. 

# **23. Static and Media Files** 

Static frontend/backend assets and uploaded ticket attachments must be treated separately. 

# **Static files** 

Generated application assets required for the user interface. 

# **Uploaded files** 

Employee/agent attachments associated with tickets. 

Uploaded files must not be stored in arbitrary application source directories. 

Object storage should be used for ticket attachments. 

# **24. MinIO / Object Storage** 

MinIO is the initial object-storage solution. 

Production storage should contain ticket attachment files while PostgreSQL stores their metadata. 

The storage system must: 

- Use protected credentials 

- Restrict direct public access 

- Use unique storage keys 

- Enforce file authorization through the application 

- Be included in backup/recovery planning 

If MinIO is not suitable for the final company environment, the application should be capable of using another approved storage mechanism through an abstraction layer. 

# **25. Email Configuration** 

The application should use the company's SMTP service. 

Production configuration must include: 

SMTP host 

SMTP port 

SMTP username SMTP password TLS/SSL configuration 

Default sender 

Credentials must be stored securely. 

Email addresses used by the application should be configurable. 

# **26. HTTPS / TLS** 

Production access must use HTTPS. 

TLS may be managed through the existing cPanel/web-server environment or another approved infrastructure component. 

The deployment must ensure: 

- Valid certificate 

- HTTPS redirection where appropriate 

- Secure cookies 

- Correct proxy headers 

- CSRF trusted origins 

- Secure WebSocket configuration 

- No accidental mixed-content requests 

The application should not hard-code certificate paths that are specific to one server environment. 

# **27. Reverse Proxy / Web Access Configuration** 

The application may operate behind a reverse proxy or server-managed web access layer. 

The deployment configuration must support routing such as: 

/ 

→ Next.js 

/api/ 

→ Django 

/ws/ 

→ Django Channels 

The exact routing syntax depends on the production web server. 

The application documentation should therefore describe the required routing behaviour rather than assume a particular product. 

# **28. Internal Service Isolation** 

The following services should remain inaccessible to ordinary users: 

PostgreSQL 

Redis 

Celery infrastructure 

Object-storage administration 

Other internal service interfaces 

Only required application endpoints should be exposed through the production web access layer. 

# **29. Firewall and Network Rules** 

The production server should restrict network access according to the company's infrastructure policy. 

At minimum: 

- Public access should be limited to required web services. 

- Database access should be restricted. 

- Redis access should be restricted. 

- Administrative interfaces should be restricted. 

- Object-storage administration should be restricted. 

- Server-management ports should be limited to authorized administrators. 

The exact firewall implementation depends on the server environment. 

# **30. Security Headers** 

The production application/web-server configuration should support appropriate security headers, including where applicable: 

- Content Security Policy 

- X-Content-Type-Options 

- Referrer-Policy 

- Strict-Transport-Security 

- Frame protection 

- Appropriate permissions policy 

The final header configuration must be tested against the actual frontend and API behaviour. 

# **31. Deployment Process** 

A normal production release should follow: 

1. Complete development 

- ↓ 

2. Run automated tests 

- ↓ 

3. Review changes 

- ↓ 

4. Build frontend/backend artifacts 

- ↓ 

5. Back up production 

- ↓ 

6. Deploy application code 

- ↓ 

7. Install/update dependencies 

- ↓ 

8. Run database migrations 

- ↓ 

9. Collect/update static assets where required 

- ↓ 

10. Restart/reload application services 

↓ 

11. Verify health checks 

↓ 

12. Perform smoke tests 

↓ 

13. Monitor logs 

↓ 

# 14. Confirm release 

The exact commands depend on the production environment. 

# **32. Release Versioning** 

Each production release should have an identifiable version. 

The release should record: 

- Version/commit 

- Deployment date 

- Changes 

- Database migration status 

- Configuration changes 

- Known issues 

- Person responsible for deployment 

Git should remain the source-control system. 

# **33. Deployment Rollback** 

A rollback plan must exist for failed deployments. 

Potential rollback actions include: 

- Restore previous application version 

- Restore previous frontend build 

- Restart previous services 

- Restore database backup where necessary 

- Revert configuration changes 

Database rollback must receive special consideration because application code and database schema versions may become incompatible. 

The safest rollback approach should be determined per release. 

# **34. Health Checks** 

The application should provide appropriate health endpoints. 

Example: 

GET /health/ 

GET /ready/ 

A basic health check may verify application availability. 

A readiness check may verify required dependencies such as: 

- PostgreSQL 

- Redis 

- Storage 

Health endpoints must not reveal credentials or sensitive infrastructure information. 

# **35. Smoke Testing After Deployment** 

After deployment, perform at least: 

# **Authentication** 

- User login 

- Agent login 

- Administrator login 

# **Ticketing** 

- Create ticket 

- View ticket 

- Claim ticket 

- Send message 

- Resolve ticket 

# **Queue** 

- Verify P1 handling 

- Verify P2 queue 

- Verify P3 queue 

- Verify queue visibility 

# **Notifications** 

- In-app notification 

- Email notification 

- WebSocket notification where enabled 

# **Feedback** 

- Open feedback link 

- Submit valid feedback 

- Verify token cannot be reused 

# **Administration** 

- Verify administrative access 

- Verify configuration access 

# **Attachments** 

- Upload 

- View/download authorized attachment 

# **36. Logging** 

Production logs should capture relevant: 

- Application errors 

- Authentication events 

- Background-task errors 

- Email failures 

- WebSocket failures 

- Database errors 

- Storage errors 

- Security events 

Logs must not contain: 

- Passwords 

- Secret keys 

- Session secrets 

- Feedback tokens 

- SMTP passwords 

- Database passwords 

# **37. Log Management** 

Logs should have: 

- Appropriate retention 

- Rotation 

- Access restrictions 

- Sufficient detail for troubleshooting 

The exact log-management mechanism depends on the server environment. 

Application logs should not be allowed to consume uncontrolled disk space. 

# **38. Monitoring** 

Production monitoring should cover: 

- Application availability 

- Database availability 

- Redis availability 

- Celery worker status 

- Scheduled task execution 

- Disk usage 

- Memory usage 

- CPU usage 

- Storage availability 

- Email failures 

- Application errors 

- Backup status 

The company may use existing server monitoring tools where available. 

The application should not require a specific monitoring product. 

# **39. Backup Strategy** 

Production backups must cover: 

# **PostgreSQL** 

Full database backups at an appropriate schedule. 

# **Object Storage** 

Backups of ticket attachments and related storage data. 

# **Configuration** 

Important production configuration should be recoverable without exposing secrets in source control. 

Backups should be stored separately from the primary production data whenever practical. 

# **40. Backup Security** 

Backups must be: 

- Access-controlled 

- Protected from unauthorized modification 

- Stored separately from primary data 

- Retained according to company policy 

- Monitored for successful completion 

Production credentials should not be stored unprotected alongside backups. 

# **41. Backup Verification** 

A backup is not considered reliable merely because the backup process reports success. 

The company should periodically perform restoration tests. 

A restoration test should verify: 

1. Database can be restored. 

2. Application can connect to the restored database. 

3. Ticket records are intact. 

4. Attachments can be restored. 

5. Application functionality remains usable. 

6. Recovery documentation is accurate. 

# **42. Disaster Recovery** 

The recovery process should cover: 

Server failure 

Database failure 

Storage failure 

Application corruption 

Failed deployment Configuration loss 

Accidental deletion 

Recovery should follow a documented sequence: 

Provision/restore infrastructure 

↓ Restore configuration 

↓ Restore PostgreSQL ↓ Restore object storage ↓ Deploy application ↓ 

Run migrations if appropriate 

↓ Configure services 

↓ 

Verify connectivity 

↓ 

Run smoke tests 

↓ 

Return to service 

The exact recovery sequence must be adapted to the company's infrastructure. 

# **43. Recovery Objectives** 

The production environment should eventually define: 

# **RPO — Recovery Point Objective** 

The maximum acceptable amount of data loss measured in time. 

# **RTO — Recovery Time Objective** 

The maximum acceptable time required to restore service. 

The final RPO/RTO values should be agreed with the company based on operational requirements rather than invented during development. 

# **44. Production Updates** 

Production updates should be performed through a controlled process. 

Before major updates: 

- Review release notes. 

- Test the update. 

- Verify backups. 

- Confirm rollback options. 

- Schedule an appropriate maintenance period where necessary. 

Security updates should be applied according to the company's maintenance policy. 

# **45. Dependency Management** 

Dependencies must be managed through version-controlled dependency files. Python dependencies should be defined in the backend dependency configuration. Node.js dependencies should be defined through the frontend package configuration. Before upgrading major dependencies: 

- Run automated tests. 

- Review compatibility. 

- Test authentication. 

- Test ticket workflows. 

- Test WebSockets. 

- Test background processing. 

- Test file handling. 

# **46. Secrets Management** 

Production secrets must never be stored in: 

- Git 

- GitHub 

- Frontend source code 

- Public configuration files 

- Docker images 

- Logs 

- Documentation 

Examples include: 

- Django secret key 

- Database passwords 

- Redis credentials 

- MinIO credentials 

- SMTP credentials 

- API keys 

- Authentication secrets 

The .env.example file may contain placeholders only. 

# **47. Production Access** 

Production server access must be limited to authorized personnel. 

Administrative access should be separately controlled from normal application access. 

Application users do not require direct access to: 

- Server shell 

- PostgreSQL 

- Redis 

- Object-storage administration 

- Application deployment directories 

# **48. Active Directory / LDAP Readiness** 

The company uses Windows Active Directory. 

The MVP does not require AD/LDAP integration unless explicitly added to scope. 

The deployment architecture should nevertheless leave room for future integration. 

Future AD/LDAP deployment may require: 

- Network access to directory services 

- Secure LDAP where appropriate 

- Service credentials 

- Group mapping 

- User synchronization 

- Authentication configuration 

These requirements should be introduced only when the integration is formally approved. 

# **49. Development Deployment** 

Developers should be able to run the system locally using the documented development environment. 

Docker Compose is preferred for this purpose. 

Typical local services: 

frontend 

backend 

postgres 

redis 

celery 

celery-beat 

minio 

Development credentials and services must remain separate from production. 

# **50. Staging Deployment** 

If the company provides a staging environment, it should closely resemble production. 

Staging should be used to verify: 

- Application builds 

- Database migrations 

- Authentication 

- Queue behaviour 

- Background tasks 

- Email configuration 

- WebSockets 

- File storage 

- Deployment procedures 

Production credentials and sensitive production data should not be copied into staging without explicit authorization and appropriate protection. 

# **51. Production Deployment Checklist** 

Before deployment: 

- Code reviewed 

- Tests passing 

- Security tests passing 

- Production backup verified 

- Environment variables configured 

- Database credentials configured 

- SMTP configured 

- Object storage configured 

- Redis configured 

- Celery configured 

- WebSocket routing configured 

- HTTPS configured 

- Allowed hosts configured 

- CSRF/trusted origins configured 

- Static assets prepared 

- Database migrations reviewed 

- Rollback plan available 

After deployment: 

- Application loads 

- Login works 

- Ticket creation works 

- Queue works 

- Agent claim works 

- Messaging works 

- Notifications work 

- WebSockets work where enabled 

- Attachments work 

- Resolution works 

- Feedback works 

- Feedback token cannot be reused 

- Background tasks are running 

- Email delivery works 

- Logs are healthy 

- Monitoring is healthy 

- Backup process is operational 

# **52. Production Acceptance Criteria** 

The deployment is considered production-ready when: 

1. The application runs reliably on the company's approved server environment. 

2. The existing HRMS remains unaffected. 

3. HTTPS works correctly. 

4. Authentication works. 

5. Role and station authorization works. 

6. PostgreSQL is functioning correctly. 

7. Redis is functioning correctly. 

8. Celery workers are running. 

9. Scheduled tasks are functioning. 

- 10.WebSockets work where enabled. 

- 11.File attachments work securely. 

- 12.SMTP notifications work. 

- 13.P1 notifications work. 

- 14.P2/P3 escalation works. 

- 15.Feedback expiry rules work. 

- 16.Feedback tokens cannot be reused. 

- 17.Audit records are created. 

- 18.Backups are working. 

19.Restoration procedures have been tested. 

20.Monitoring/logging is operational. 

21.Production secrets are protected. 

22.No development server or development configuration remains active. 

# **53. Deployment Documentation Requirements** 

The final production deployment record should document the actual environment once confirmed. 

It should include: 

- Server environment 

- Operating system 

- cPanel version where relevant 

- Web-server configuration 

- Python version 

- Node.js version 

- PostgreSQL version 

- Redis version 

- Celery process configuration 

- Object-storage configuration 

- Domain/subdomain 

- SSL/TLS configuration 

- Firewall configuration 

- Backup schedule 

- Recovery procedure 

- Monitoring method 

- Responsible administrators 

These details should describe the actual production environment rather than assumptions made during development. 

# **54. Deployment Portability Requirement** 

The application must remain portable. 

The following should not be hard-coded into application business logic: 

Ubuntu 

Nginx 

Docker 

cPanel 

Specific filesystem paths Specific production hostname 

Specific server IP 

Instead, the application should depend on configurable services and standard interfaces. 

# **55. Deployment Responsibility Boundaries** 

# **Application Development Team** 

Responsible for: 

- Application code 

- Database migrations 

- Application configuration requirements 

- Tests 

- Deployment documentation 

- Health checks 

- Application-level logging 

# **Server/Infrastructure Administrators** 

# Responsible for: 

- Server provisioning 

- cPanel configuration 

- Web-server configuration 

- TLS certificates 

- Firewall 

- OS maintenance 

- Process management 

- Database infrastructure 

- Redis infrastructure 

- Backup infrastructure 

- Server monitoring 

# **Shared Responsibility** 

- Production deployment 

- Incident response 

- Disaster recovery 

- Security reviews 

- Performance monitoring 

- Release management 

The exact division of responsibilities may be adjusted according to company policy. 

# **56. Claude Code Deployment Instructions** 

Claude Code must: 

1. Read the complete deployment documentation before changing deployment configuration. 

2. Never assume Ubuntu is the production operating system. 

3. Never assume Nginx is the production web server. 

4. Never assume Docker is available in production. 

5. Treat Docker Compose primarily as the preferred development/reproducibility environment unless production Docker is explicitly approved. 

6. Treat cPanel as the current hosting environment, not as an application business dependency. 

7. Keep production infrastructure configuration separate from application business logic. 

8. Use environment variables for environment-specific configuration. 

9. Never commit production secrets. 

10.Never overwrite or interfere with the existing HRMS deployment. 

11.Never assume undocumented server capabilities. 

12.Flag infrastructure requirements that cannot be confirmed from the repository. 

13.Keep the application portable. 

14.Test production configuration changes before recommending deployment. 

- 15.Preserve rollback capability. 

- 16.Never disable security controls merely to make deployment easier. 

- 17.Document any deployment-specific assumptions. 

# **57. Final Deployment Principle** 

The IT Ticketing System should be developed as a portable application and deployed according to the company's actual infrastructure. 

The current deployment context is: 

Company Dedicated Server 

│ └── cPanel │ 

└── IT Ticketing System 

The application architecture remains independent of that hosting environment. 

The final deployment model should therefore be: 

Stable Application Architecture 

+ 

Environment-Specific Configuration 

+ 

Controlled Production Deployment 

= 

Portable and Maintainable System 

The exact production operating system, web server, runtime management, container support, and service configuration must be confirmed before final production deployment rather than assumed during development. 

