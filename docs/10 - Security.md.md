# **10-security.md** 

# IT Ticketing System — Security Specification 

- **Document:** 10-security.md 

- **Status:** Approved Security Specification 

**Version:** 1.0 

**Last Updated:** 2026-09-14 

## 1. Purpose 

This document defines the security requirements for the internal IT Ticketing System. 

The system handles: 

- Employee accounts 

- IT support requests 

- Internal agent communication 

- Ticket attachments 

- User information 

- Operational information 

- Feedback 

- Audit records 

- Administrative configuration 

Although the application is primarily intended for the company intranet, it must not assume that the internal network is automatically trusted. 

Security controls must therefore be implemented at the application, database, infrastructure, and network levels. 

# 2. Security Objectives 

The system must protect: 

### Confidentiality 

Users must only access information they are authorised to see. 

### Integrity 

Users must not be able to manipulate tickets, assignments, priorities, feedback, or audit records outside their permissions. 

### Availability 

The system should remain available and recoverable during service failures. 

### Accountability 

Important actions must be attributable to an authenticated user through audit records. 

### Least Privilege 

Users and services should receive only the permissions required to perform their functions. 

# 3. Security Principles 

The following principles apply throughout the application: 

1. Deny by default. 

2. Authenticate before accessing protected resources. 

3. Authorise every protected operation. 

4. Never trust client-supplied permissions. 

5. Validate all input on the backend. 

6. Keep secrets outside source code. 

7. Protect sensitive data in transit. 

8. Minimise sensitive data exposure. 

9. Record important security-sensitive actions. 

10. Fail securely. 

11. Use secure defaults. 

12. Keep dependencies updated. 

13. Apply security controls consistently to REST APIs and WebSockets. 

14. Never rely on the intranet alone as a security boundary. 

# # 4. Threat Model 

The application should account for threats including: 

- Compromised employee accounts 

- Unauthorized ticket access 

- Privilege escalation 

- Ticket manipulation 

- Unauthorized ticket claiming 

- Unauthorized station access 

- Internal message exposure 

- Malicious file uploads 

- Credential theft 

- Session theft 

- Cross-site scripting 

- Cross-site request forgery 

- SQL injection 

- Insecure direct object references 

- Brute-force login attempts 

- API abuse 

- WebSocket authorization bypass 

- Feedback token theft 

- Feedback token reuse 

- Email compromise 

- Database compromise 

- Server compromise 

- Accidental data deletion 

- Malicious administrative actions 

The application should follow a defence-in-depth approach. 

# 5. Authentication 

All protected application functionality requires authentication. 

Authentication must establish the identity of the user before protected resources are accessed. 

The authentication system must: 

- Verify credentials securely. 

- Never store plaintext passwords. 

- Use Django's secure password hashing mechanisms. 

- Prevent authentication bypass. 

- Handle inactive accounts correctly. 

- Invalidate authentication when an account is deactivated where appropriate. 

- Protect authentication endpoints against abuse. 

# 6. Password Security 

If the application manages passwords directly, Django's password hashing facilities must be used. 

Passwords must never be: 

- Stored in plaintext 

- Stored using reversible encryption 

- Logged 

- Included in API responses 

- Included in audit logs 

- Included in error messages 

Password requirements should be configurable and should favour strong passwords/passphrases. 

The system should use Django's password validation framework. 

# 7. Account Status 

User accounts must support active/inactive states. 

An inactive account must not be able to authenticate normally. 

This applies to: 

- Deactivated employees - Expired consultant accounts - Administratively disabled accounts Historical records belonging to the account must remain intact. 

--# 8. Consultant Account Expiration 

Consultant accounts are temporary. 

Each consultant account may have an expiration date. 

Example: ```text Account: Consultant 

Expires: 

2026-12-31 23:59 GMT After expiration: 

is_active = false 

The account must no longer be able to access the application. 

Historical tickets and audit records must remain associated with the account. 

Account expiration should be enforced by the backend and supported by a scheduled background task. 

The system must not rely exclusively on the scheduled task. 

If an expired consultant attempts to authenticate or access a protected resource, the backend must reject access based on the account's current expiration state. 

# **9. Authorization Model** 

Authorization is based on: 

ROLE 

+ PRIORITY 

+ STATION SCOPE Roles: USER AGENT ADMIN Priority: P1 P2 P3 

Priority does not grant administrative permissions. 

For example: 

P1 USER 

does not automatically become an administrator. 

# **10. Role-Based Access Control** 

# **USER** 

A normal user can: 

- Create tickets 

- View their own tickets 

- Send messages on their tickets 

- View user-visible ticket messages 

- Upload permitted attachments 

- View ticket status 

- View applicable queue information 

- Submit feedback 

A user cannot: 

- View another user's ticket 

- View internal notes 

- Claim tickets 

- Assign tickets 

- Transfer tickets 

- Modify priority 

- Modify system configuration 

- View administrative reports unless explicitly authorised 

# **11. AGENT Access** 

An agent may: 

- View tickets within authorised station scope 

- Claim tickets 

- Work on tickets 

- Send user-visible messages 

- Send internal messages 

- Use predefined notices 

- Assign/reassign tickets where permitted 

- Transfer tickets where permitted 

- Resolve tickets 

- Reopen tickets where permitted 

- View authorised notifications 

- Access authorised reports if later enabled 

Agent access must follow current station assignment. 

# **12. ADMIN Access** 

Administrators may have system-wide access necessary to administer the application. This may include: 

- User management 

- Station management 

- Agent-station management 

- Problem type management 

- Response template management 

- System configuration 

- Reporting 

#  Audit log access 

Administrative actions must still be validated by the backend and audited. 

Administrator access must not bypass basic security controls such as authentication and input validation. 

# **13. Station-Based Authorization** 

Station scope is a core security boundary. 

An agent assigned to: 

Head Office 

must not automatically have access to tickets belonging to: 

Babylove - Tesano 

unless the agent is also authorised for that station. 

Agents may eventually belong to multiple stations. 

Example: 

Agent A 

Head Office 

Babylove - Tesano 

Agent A may therefore access tickets within both authorised stations. 

# **14. Ticket Authorization** 

Every ticket access request must pass an authorization check. 

The backend must determine: 

Who is requesting? 

↓ 

What role do they have? 

↓ 

What stations may they access? 

↓ 

Who owns the ticket? 

↓ 

What is the ticket's current station? 

↓ 

What operation is being requested? 

↓ 

Is the operation permitted? 

The frontend must never be trusted to enforce these rules. 

# **15. Object-Level Authorization** 

The system must protect against insecure direct object references. 

For example, changing: 

/tickets/123/ 

to: 

/tickets/124/ 

must not allow a user to access another employee's ticket. 

The backend must verify authorization for the actual resource. 

UUIDs should be used for major entities, but UUIDs must not be treated as an authorization mechanism by themselves. 

# **16. Search Authorization** 

Search must follow the same authorization rules as normal ticket access. A user searching for: 

printer 

must not receive results from another user's restricted ticket merely because the search term matches. 

Agents must only receive search results from tickets within their authorised scope. 

Administrators may search system-wide according to their permissions. 

# **17. Internal Message Security** 

Internal agent messages are confidential to authorised internal personnel. 

They must be stored separately through explicit visibility controls such as: 

visibility = INTERNAL 

Normal users must never receive internal messages through: 

- Ticket APIs 

- Search 

- WebSockets 

- Notifications 

- Attachments 

- Reports 

- Exports 

The backend must filter internal messages before serializing user-visible ticket responses. 

# **18. WebSocket Security** 

WebSocket connections are subject to the same authorization model as REST APIs. Authentication must be established before subscribing to protected channels. 

The backend must verify access when joining: 

ticket channel 

queue channel 

notification channel 

An authenticated agent must not be able to subscribe to another station's private ticket channel. 

WebSocket events must contain only authorised information. 

# **19. CSRF Protection** 

If browser-based session authentication is used, appropriate CSRF protection must be enabled. 

State-changing requests must not be accepted solely because a browser automatically includes authentication credentials. 

Django's CSRF protection should be used rather than implementing a custom mechanism unnecessarily. 

The frontend and backend must be configured correctly for the selected authentication architecture. 

# **20. CORS** 

CORS must be restrictive. 

The backend should only allow trusted frontend origins. 

The application must not use: 

Access-Control-Allow-Origin: * 

for authenticated application traffic unless there is a specific documented reason. 

Production origins must be configured through environment settings. 

# **21. HTTPS / TLS** 

Production application traffic must use HTTPS. 

Even though the application is intended for an internal network, HTTPS protects against: 

- Credential interception 

- Session theft 

- Network sniffing 

- Man-in-the-middle attacks 

Recommended architecture: 

Browser │ HTTPS ▼ Nginx │ ▼ 

Application 

TLS certificates should be managed according to company infrastructure requirements. 

# **22. HTTP Security Headers** 

Nginx and/or Django should provide appropriate security headers. 

Depending on deployment configuration, these may include: 

Content-Security-Policy X-Content-Type-Options Referrer-Policy Strict-Transport-Security Permissions-Policy 

The final Content Security Policy must be compatible with the Next.js application. Security headers should be tested rather than added blindly. 

# **23. Session Security** 

Authentication sessions must be protected. 

# Where cookie-based authentication is used: 

- Cookies should be Secure in production. 

- HttpOnly should be enabled where appropriate. 

- SameSite should be configured appropriately. 

- Session expiration should be configured. 

- Session invalidation should occur after logout. 

- Session identifiers must not be exposed to JavaScript unnecessarily. 

# **24. Login Protection** 

Login endpoints should be protected against brute-force attempts. Controls may include: 

- Rate limiting 

- Temporary lockouts where appropriate 

- Monitoring repeated failures 

- Secure error messages 

Authentication errors should not reveal unnecessary information. 

For example, avoid clearly revealing whether a particular username exists. 

# **25. Input Validation** 

All client input must be treated as untrusted. 

Validation must occur on the backend. 

Inputs include: 

- Ticket descriptions 

- Messages 

- Search queries 

- IDs 

- Station selections 

- Problem types 

- Feedback 

- File uploads 

- Administrative configuration 

- Template content 

Django REST Framework serializers should perform structured validation. 

Business validation should occur in the service layer where appropriate. 

# **26. SQL Injection Protection** 

Database queries must use Django's ORM or properly parameterized queries. Do not construct SQL by directly concatenating user input. 

Unsafe example: 

"SELECT * FROM tickets WHERE description = '" + user_input + "'" Preferred approach: 

Django ORM / parameterized query 

Raw SQL should only be used where necessary and must be parameterized. 

# **27. Cross-Site Scripting Protection** 

Ticket descriptions and messages may contain user-controlled text. 

The frontend must treat user-generated content as untrusted. 

The application should: 

- Escape content appropriately. 

- Avoid unsafe HTML rendering. 

- Sanitize HTML if rich text is ever introduced. 

- Apply an appropriate Content Security Policy. 

The initial ticketing interface should prefer plain text messages rather than unrestricted HTML. 

# **28. File Upload Security** 

File uploads represent a significant security risk. 

The backend must validate: 

- File size 

- File type 

- Content type 

- Filename 

- Storage key 

- Associated ticket 

- User permissions 

Files must not be executed by the application server. 

Uploaded files should not be stored inside executable application directories. 

MinIO should be configured so uploaded files are not automatically executable or publicly accessible. 

# **29. File Download Security** 

A file URL must not automatically grant access. 

The application must verify: 

Authenticated user 

+ 

Ticket authorization 

+ 

Attachment authorization 

before allowing the file to be downloaded. 

Do not expose predictable storage paths. 

Example of an unsafe pattern: 

/files/ticket-123/report.pdf 

where knowing the URL is sufficient to access the file. 

# **30. File Content Scanning** 

The initial MVP may use basic file validation. 

Malware scanning should be considered as a future security enhancement if company infrastructure permits it. 

The architecture should allow scanning to be introduced later without redesigning the ticket system. 

# **31. Feedback Token Security** 

Feedback tokens are effectively temporary credentials. 

They must therefore be protected carefully. 

Requirements: 

- Use cryptographically secure random token generation. 

- Do not use predictable ticket IDs as feedback tokens. 

- Store a secure hash of the token where possible. 

- Do not store the raw token unnecessarily. 

- Do not log raw tokens. 

- Set an explicit expiration time. 

- Support one-time use. 

- Invalidate immediately after successful submission. 

# **32. Feedback Token Expiration** 

The token must expire according to the defined business rule. 

Resolution before 17:00 GMT 

↓ 5:00 PM GMT same applicable working day 

Resolution after 17:00 GMT ↓ 5:00 PM GMT next applicable working day The implementation must not use: resolution timestamp + 9 hours The working-day calculation should be implemented centrally. 

# **33. Feedback Token Replay Protection** 

A successful feedback submission immediately invalidates the token. Example: 

First submission 

↓ SUCCESS ↓ token.used_at = timestamp ↓ 

Second submission 

↓ 

REJECTED 

The database transaction must prevent two simultaneous requests from both successfully submitting feedback. 

# **34. Priority Security** 

Ticket priority is determined by the user's priority level. 

The client must not submit: 

{ 

"priority": "P1" } 

and expect the server to accept it. 

The backend must determine: authenticated_user.priority_level 

when creating the ticket. 

This prevents ordinary users from artificially creating P1 tickets. 

# **35. Queue Security** 

Queue information must be permission-aware. 

Users should only receive queue information applicable to their own ticket. 

Agents should only receive queues for stations they are authorised to handle. P1 tickets must not be exposed as normal queue positions. 

Queue calculations must use current authoritative database state. 

# **36. Ticket Claim Security** 

Claiming a ticket must be transactional. 

The backend must prevent: 

Agent A ──┐ 

├── Claim Ticket X 

Agent B ──┘ 

from resulting in two successful claims. 

Recommended protection: 

Database transaction 

+ 

appropriate row locking 

+ 

state verification 

The final implementation must ensure that only one valid claim succeeds. 

# **37. Transfer Security** 

Only authorised agents/admins may transfer tickets. 

The backend must verify: 

- Current user's permission 

- Destination station 

- Destination agent, if supplied 

- Ticket state 

- Agent eligibility 

- Current assignment 

A transfer must update the relevant records transactionally. 

Transfer history must be retained. 

# **38. Status Transition Security** 

Users must not arbitrarily modify ticket status. 

For example, a user must not be able to send: 

{ 

"status": "CLOSED" 

} 

and close their own ticket. 

Status transitions must be implemented through authorised workflow operations. Example: 

QUEUED 

↓ IN_PROGRESS 

↓ 

WAITING_USER 

↓ 

IN_PROGRESS 

↓ 

RESOLVED 

↓ 

CLOSED 

Negative feedback may cause: 

RESOLVED 

↓ 

REOPENED 

The backend must validate every transition. 

# **39. Audit Logging** 

Security-sensitive and business-critical actions must be audited. 

Examples: 

Login/security events where appropriate 

Ticket creation 

Ticket claim 

Ticket assignment Ticket transfer Ticket resolution Ticket reopening Ticket closure Feedback submission User creation User deactivation Role changes Priority changes Station assignment changes Problem type changes Template changes Administrative configuration changes Audit entries should include: actor action entity entity ID ticket where applicable timestamp old values where appropriate new values where appropriate metadata 

# **40. Audit Log Integrity** 

Audit logs must be append-only from the normal application interface. 

Users and agents must not be able to modify or delete audit records. 

Administrative access to audit logs should also be controlled. 

If audit records are ever physically deleted as part of infrastructure maintenance, that process must be separate from normal application functionality and follow company retention policy. 

# **41. Secrets Management** 

Secrets must never be committed to Git. 

Sensitive values include: 

Django SECRET_KEY 

Database passwords 

Redis credentials 

MinIO credentials 

SMTP credentials 

API keys 

TLS private keys 

Use environment variables or an appropriate secrets-management mechanism. 

The repository should contain: 

.env.example 

but never actual production credentials. 

# **42. Secret Exposure Prevention** 

Secrets must not appear in: 

- Source code 

- Git history 

- API responses 

- Error messages 

- Logs 

- Audit records 

- Frontend JavaScript 

- Docker images unnecessarily 

Frontend environment variables must be carefully controlled because Next.js variables exposed to the browser are not secret. 

# **43. Database Security** 

PostgreSQL must: 

- Require authentication. 

- Use a strong database password. 

- Be accessible only from authorised application services. 

- Not be exposed directly to employee devices. 

- Use separate application credentials from administrative credentials. 

- Follow least privilege. 

The Django application should use a database account with only the permissions it requires. 

# **44. Redis Security** 

Redis must not be publicly exposed. 

It should be accessible only to authorised application services. 

If authentication is configured, credentials must be stored securely. 

Redis should not contain permanent authoritative ticket data. 

# **45. MinIO Security** 

MinIO administration must be restricted. 

Application credentials should not provide unnecessary administrative privileges. 

Buckets should not be publicly writable. 

Objects should not be publicly readable unless explicitly intended. 

The application should generate controlled access to attachments. 

# **46. Nginx Security** 

Nginx acts as the primary network-facing application gateway. 

It should: 

- Accept only required ports. 

- Redirect HTTP to HTTPS where appropriate. 

- Route API requests correctly. 

- Route WebSockets correctly. 

- Apply appropriate request limits. 

- Avoid exposing internal service ports. 

- Avoid exposing sensitive files. 

- Avoid exposing Docker/internal infrastructure. 

# **47. Docker Security** 

Containers should follow least privilege. 

Where practical: 

- Avoid running containers as root. 

- Use minimal base images. 

- Keep images updated. 

- Avoid unnecessary packages. 

- Do not bake secrets into images. 

- Restrict exposed ports. 

- Use named/internal Docker networks. 

- Pin important dependency versions appropriately. 

# **48. Network Segmentation** 

Recommended Docker network structure: 

Employee Network 

│ ▼ 

Nginx 

│ ▼ 

Application Network 

│ ┌─────┼──────────────┐ ▼ ▼ ▼ 

Django Redis         MinIO │ 

▼ 

PostgreSQL 

PostgreSQL and Redis should not be directly reachable from employee devices. 

Where practical, database and infrastructure services should reside on an internal/private Docker network. 

# **49. API Rate Limiting** 

Rate limiting should protect: 

- Login 

- Feedback endpoints 

- Search 

- File uploads 

- Sensitive administrative endpoints 

- Other abuse-prone APIs 

Rate limits should be configurable. 

The system should return: 

429 Too Many Requests 

when an applicable limit is exceeded. 

# **50. Error Handling** 

Production error responses must not expose: 

- Stack traces 

- SQL statements 

- Database credentials 

- Internal filesystem paths 

- Service credentials 

- Framework debugging information 

Users should receive controlled messages. 

Detailed information should remain in secure server-side logs. 

Django debug mode must be disabled in production. 

# **51. Logging Security** 

Logs should support troubleshooting without becoming a source of sensitive-data leakage. Do not log: 

- Passwords 

- Session credentials 

- Raw feedback tokens 

- API keys 

- SMTP passwords 

- Database passwords 

- Full sensitive request payloads unnecessarily 

Logs should include enough context to investigate failures. 

# **52. Dependency Security** 

Dependencies must be maintained. 

This applies to: 

- Django 

- Django REST Framework 

- Next.js 

- React 

- Node.js packages 

- Python packages 

- Docker images 

- Nginx 

- PostgreSQL 

- Redis 

- MinIO 

Security updates should be evaluated and applied according to company maintenance procedures. 

The project should periodically review dependency vulnerabilities. 

# **53. Secure Development Practices** 

Development must include: 

- Code review 

- Automated tests 

- Dependency checks 

- Static analysis where practical 

- Secret scanning 

- Secure configuration 

- Error handling 

- Authorization testing 

Security-sensitive functionality must have automated tests. 

# **54. Security Testing Requirements** 

The test suite should include tests for: 

# **Authentication** 

Invalid credentials rejected 

Inactive accounts rejected 

Expired consultant accounts rejected 

Logout invalidates session 

# **Authorization** 

User cannot access another user's ticket 

Agent cannot access unauthorised station ticket 

Agent cannot access internal messages as a user 

Unauthorised user cannot access admin endpoints 

# **Ticket Security** 

User cannot set priority manually 

User cannot close ticket arbitrarily 

Agent cannot claim unavailable ticket 

Two agents cannot successfully claim same ticket 

Unauthorised agent cannot transfer ticket 

# **Feedback Security** 

Expired token rejected 

Used token rejected 

Invalid token rejected 

Concurrent submissions allow only one success 

# **File Security** 

Unauthorised attachment download rejected 

Oversized file rejected 

Unsupported file rejected 

# **API Security** 

Unauthenticated request rejected 

Invalid input rejected 

Rate limits enforced where configured 

# **55. Security Testing Against Common Web Vulnerabilities** 

The application should be tested against common vulnerability categories including: 

- Broken access control 

- Authentication failures 

- Injection 

- Cryptographic failures 

- Security misconfiguration 

- Vulnerable components 

- Identification/authentication failures 

- Software/data integrity failures 

- Logging/monitoring weaknesses 

- Server-side request vulnerabilities where applicable 

The project should use the OWASP Top 10 as a general security reference. 

# **56. Data Protection** 

The system should minimise the amount of sensitive information stored. Only information required for: 

- Ticket processing 

- Authentication 

- Reporting 

- Audit 

- Administration 

should be stored. 

Sensitive information should not be copied unnecessarily between systems. 

# **57. Data Retention** 

Tickets should not normally be physically deleted through the application. Historical information should remain available according to company policy. Retention periods for: 

- Tickets 

- Messages 

- Attachments 

- Audit logs 

- Notifications 

#  Feedback 

should eventually be determined by company policy and applicable legal requirements. The application should support future retention rules without compromising normal ticket history. 

# **58. Backup Security** 

Backups must be protected with appropriate access controls. 

Backup storage should not be accessible to ordinary application users. 

Where supported, backups should be encrypted. 

Backup credentials must be kept separate from normal application credentials. 

Restoration procedures must be tested. 

# **59. Disaster Recovery** 

The system should be recoverable after: 

- Database failure 

- Server failure 

- Container failure 

- Storage failure 

- Accidental data corruption 

Recovery should include: 

Application configuration 

+ 

PostgreSQL data 

+ 

Attachment storage 

+ 

Required secrets/configuration 

Recovery procedures should be documented separately during deployment planning. 

# **60. Administrative Security** 

Administrative privileges should be assigned only to authorised personnel. 

Administrative actions should be auditable. 

The application should avoid creating unnecessary administrator accounts. 

Where possible, administrative interfaces should be restricted further through network or infrastructure controls. 

# **61. Principle of Least Privilege for Services** 

Each service should have only the permissions it needs. 

Example: 

Django 

→ PostgreSQL access 

→ Redis access 

→ MinIO application access 

Celery 

→ PostgreSQL access 

→ Redis access 

→ SMTP access where required 

Nginx 

→ Frontend/backend routing 

Services should not receive unrestricted access to unrelated infrastructure. 

# **62. Security of Background Tasks** 

Celery tasks must also enforce security assumptions. 

A background task must not assume that data is still valid simply because it was valid when the task was created. 

Before performing important actions, the task should verify current state where appropriate. 

Examples: 

Escalation task 

→ ticket still unattended? 

Feedback notification 

→ feedback still valid? 

Consultant expiration 

→ account still active and expiration reached? 

Tasks must be idempotent where retries are possible. 

# **63. Security of Notifications** 

Notifications must not expose sensitive information unnecessarily. 

Email content should contain enough information for the recipient to understand the notification without unnecessarily exposing: 

- Internal notes 

- Sensitive ticket details 

- Credentials 

- Feedback tokens in logs 

Notification recipients must be determined by backend authorization rules. 

# **64. Email Security** 

Email should be treated as a notification channel, not as the authoritative source of ticket state. 

For example: 

Email: 

"Ticket IT-2026-000125 has been assigned to you." 

The actual assignment state remains in PostgreSQL. 

Email delivery failure must not corrupt ticket state. 

# **65. Security Monitoring** 

The system should monitor significant security events such as: 

- Repeated failed logins 

- Unauthorized access attempts 

- Permission failures 

- Suspicious file uploads 

- Administrative changes 

- Unexpected service failures 

A future monitoring system may provide centralised alerting. 

The MVP should at minimum maintain useful server-side logs. 

# **66. Security Incident Response** 

If a security incident is suspected: 

1. Identify the affected account/service. 

2. Restrict or disable compromised access. 

3. Preserve relevant logs. 

4. Investigate affected resources. 

5. Rotate compromised credentials. 

6. Restore affected services/data where necessary. 

7. Document the incident. 

8. Review and improve controls. 

The application should support account deactivation and credential rotation without deleting historical records. 

# **67. Security Configuration by Environment** 

Development and production configurations must differ appropriately. 

Development may use: 

DEBUG=True 

localhost services 

development credentials 

Production must use: 

DEBUG=False 

HTTPS 

secure credentials 

restricted service access 

production SMTP 

production database 

Production secrets must never be copied into development repositories unnecessarily. 

# **68. Security Headers and Django Configuration** 

Django security settings should be reviewed before production deployment. 

Relevant settings may include: 

DEBUG 

SECRET_KEY ALLOWED_HOSTS CSRF_COOKIE_SECURE SESSION_COOKIE_SECURE SESSION_COOKIE_HTTPONLY SESSION_COOKIE_SAMESITE 

SECURE_SSL_REDIRECT SECURE_HSTS_SECONDS SECURE_CONTENT_TYPE_NOSNIFF 

SECURE_REFERRER_POLICY 

Exact settings depend on the final deployment topology. 

They must be tested after configuration. 

# **69. Security and API Design** 

The API specification in 09-api-specification.md must be implemented together with this security specification. 

An endpoint being documented does not automatically mean every authenticated user can call it. 

Every endpoint requires: 

Authentication 

+ 

Authorization 

+ 

Validation 

+ 

Business-rule enforcement 

# **70. Security and Frontend Design** 

The frontend may hide unavailable actions to improve usability. 

However: 

Hidden button ≠ security control 

For example, hiding the "Admin" menu from a USER does not secure the admin endpoint. 

The backend must reject the request even if the user manually constructs it. 

# **71. Security and Database Design** 

The database design in 07-database-design.md should be implemented with appropriate constraints. 

Examples: 

- Unique ticket numbers 

- Unique usernames where required 

- Valid foreign keys 

- Appropriate indexes 

- Appropriate nullability 

- Transactional state changes 

Application-level validation should be supplemented by database constraints where appropriate. 

# **72. Security and Audit Design** 

Security-sensitive changes should be traceable. 

For example: 

User: 

Agent A 

Action: 

Transfer ticket 

Ticket: 

IT-2026-000125 

From: 

Head Office 

To: 

Babylove - Tesano 

Time: 

2026-09-14T12:30:00Z 

The audit system should preserve enough information to reconstruct important events. 

# **73. Security Acceptance Criteria** 

The security implementation is acceptable for MVP only when: 

- Authentication is enforced. 

- Role permissions are enforced. 

- Station-based access is enforced. 

- Users cannot access other users' tickets. 

- Internal messages are protected. 

- Priority cannot be manipulated by clients. 

- Ticket claiming is concurrency-safe. 

- Ticket transfers are authorization-controlled. 

- Feedback tokens are secure and one-time. 

- File access is authorization-controlled. 

- API validation is enforced. 

- Production debugging is disabled. 

- Secrets are externalised. 

- HTTPS is configured for production. 

- Database/Redis are not directly exposed to employees. 

- Important actions are audited. 

- Backup/recovery procedures are documented. 

- Security-critical behaviour has automated tests. 

# **74. Claude Code Security Instructions** 

Claude Code must treat this document as mandatory. 

Claude Code must: 

- Implement security from the beginning. 

- Enforce authorization server-side. 

- Follow Django security best practices. 

- Use secure password handling. 

- Protect sessions. 

- Protect CSRF where applicable. 

- Validate all input. 

- Use Django ORM safely. 

- Protect file uploads/downloads. 

- Protect feedback tokens. 

- Protect WebSockets. 

- Use transactions for sensitive state changes. 

- Record required audit events. 

- Keep secrets out of source control. 

- Write security-focused tests. 

- Fail securely. 

- Avoid exposing internal implementation details. 

Claude Code must not: 

- Disable security controls merely to make development easier. 

- Hard-code production credentials. 

- Trust client-supplied roles. 

- Trust client-supplied priority. 

- Trust client-supplied ownership. 

- Expose internal messages. 

- Expose unrestricted attachment URLs. 

- Disable CSRF without documented architectural justification. 

- Use wildcard CORS for authenticated production traffic without justification. 

- Enable Django DEBUG in production. 

- Expose PostgreSQL or Redis to employee devices. 

- Store passwords in plaintext. 

- Log secrets or feedback tokens. 

- Bypass authorization because an endpoint is "internal". 

- Treat UUIDs as authorization. 

- Add insecure shortcuts merely to simplify implementation. 

If Claude Code identifies a conflict between functionality and security, security requirements must be preserved and the conflict must be reported. 

# **75. Final Security Architecture** 

The application's security model is: 

USER / AGENT / ADMIN │ ▼ Authentication │ ▼ Role + Priority │ ▼ Station Scope │ ▼ Resource Authorization │ ▼ Business Validation │ ▼ Transaction / Service │ ┌──────────────┼───────────────┐ ▼ ▼ ▼ PostgreSQL       Redis            MinIO │ ▼ 

Audit Records 

Security is therefore not a single feature. 

It is enforced across: 

Frontend ↓ 

Nginx ↓ Django/API ↓ 

Authorization 

↓ 

Business Logic 

↓ ↓ 

Database / Redis / MinIO 

Audit / Monitoring / Backup 

The system must remain secure even when a user attempts to bypass the frontend and interact directly with the API. 

That completes **`10-security.md`**. 

The next logical document is **`11-notification-and-sla.md`**, where we'll formalise the timing-sensitive parts of the system: **P1 immediate alerts, P2 10-minute escalation, P3 60-minute escalation, email/in-app notifications, Celery scheduling, working days, feedback deadlines, retries, and notification delivery rules.** 

