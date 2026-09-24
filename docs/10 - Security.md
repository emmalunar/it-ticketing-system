# **IT Ticketing System — Security** 

# **1. Document Purpose** 

This document defines the security requirements for the IT Ticketing System. 

The system handles: 

- Employee identities 

- IT support requests 

- Internal communications 

- Attachments 

- Ticket history 

- Agent notes 

- Administrative configuration 

- Feedback 

- Audit records 

- Notification data 

Security must therefore be enforced throughout the application, infrastructure, data layer, APIs, background services, and deployment process. 

The backend is the authoritative security boundary. 

# **2. Security Objectives** 

The system must protect: 

# **Confidentiality** 

Users must only access information they are authorized to see. 

# **Integrity** 

Tickets, assignments, messages, feedback, configuration, and audit records must not be altered improperly. 

# **Availability** 

The system should remain available to authorized employees and IT staff during normal operations. 

# **Accountability** 

Important actions must be attributable to the account that performed them. 

# **Least Privilege** 

Users and services must receive only the permissions required for their responsibilities. 

# **3. Security Principles** 

The application must follow: 

1. Deny by default. 

2. Validate on the backend. 

3. Never trust client-supplied authorization information. 

4. Enforce object-level authorization. 

5. Separate authentication from authorization. 

6. Separate user-visible communication from internal communication. 

7. Protect secrets. 

8. Protect uploaded files. 

9. Log security-relevant actions. 

- 10.Use secure transactions for critical state changes. 

- 11.Minimize sensitive information in responses and logs. 

- 12.Keep production configuration separate from development. 

- 13.Design for future AD/LDAP integration without requiring it for MVP. 

- 14.Keep infrastructure-specific assumptions outside application business logic. 

# **4. Threat Model** 

The system should consider threats including: 

- Compromised user accounts 

- Compromised agent accounts 

- Unauthorized ticket access 

- Unauthorized station access 

- Privilege escalation 

- IDOR/BOLA vulnerabilities 

- Ticket manipulation 

- Unauthorized assignment 

- Unauthorized ticket transfer 

- Exposure of internal agent messages 

- Malicious file uploads 

- Credential theft 

- Session theft 

- Brute-force login attempts 

- Cross-site scripting 

- Cross-site request forgery 

- SQL injection 

- API abuse 

- WebSocket authorization bypass 

- Feedback-token theft 

- Feedback-token replay 

- Email compromise 

- Database compromise 

- Redis compromise 

- Object-storage compromise 

- Accidental deletion 

- Unauthorized administrative changes 

- Background-task manipulation 

- Sensitive information leakage through logs or errors 

# **5. Authentication** 

The application must authenticate every protected request. 

MVP authentication must support application-managed accounts while remaining compatible with future AD/LDAP integration. 

Authentication must not be implemented in a way that prevents a future migration to: 

- Active Directory 

- LDAP 

- SSO 

- Other approved identity providers 

Authentication and authorization must remain separate concepts. 

# **6. Password Security** 

Where application-managed passwords are used: 

- Passwords must never be stored in plaintext. 

- Django's secure password hashing mechanisms must be used. 

- Password requirements must be configurable. 

- Password-reset tokens must be cryptographically secure. 

- Password-reset tokens must expire. 

- Password-reset tokens must not be reusable. 

- Authentication failures should be rate-limited. 

- Passwords must never appear in logs. 

The system must not implement custom password hashing. 

# **7. Account Security** 

Accounts must support: 

- Active/inactive state 

- Controlled creation 

- Controlled deactivation 

- Secure password management 

- Last-login tracking where appropriate 

- Administrative management 

Inactive accounts must not authenticate successfully. 

Consultant accounts must have an expiration date. 

When a consultant account reaches its expiration: 

Account expires 

↓ 

Authentication blocked 

↓ 

Historical records retained 

Expiration must not delete historical tickets, messages, assignments, or audit records. 

# **8. Roles** 

The application has three primary roles: 

USER 

AGENT 

ADMIN 

Roles determine general capabilities. 

Priority level is separate from role. 

Station scope is separate from role. 

Therefore: 

ROLE 

+ PRIORITY + STATION SCOPE + OBJECT ACCESS + CURRENT STATE 

must be considered when making authorization decisions. 

# **9. Priority Security** 

Ticket priority must not normally be controlled by the client. Priority is determined by the user's configured priority level: P1 → CEO / executive P2 → Manager / consultant P3 → Standard user A malicious client must not be able to submit: priority=P1 

and elevate an ordinary user's ticket. 

Priority changes, where permitted for administrators, must be validated and audited. 

# **10. Station Authorization** 

Agents are assigned to stations. 

An agent may initially access tickets belonging to stations to which the agent is authorized. For example: 

Agent A ├── Head Office └── Babylove - Tesano may access tickets from both stations. 

An agent assigned only to: Head Office 

must not automatically access tickets belonging exclusively to: Babylove - Tesano 

unless another authorization rule permits the access. 

Station authorization must be enforced server-side. 

# **11. Ticket Object Authorization** 

The backend must verify authorization for every ticket operation. 

The frontend must never be treated as the security boundary. 

For example, changing: 

/tickets/123/ 

to: 

/tickets/124/ 

must not allow unauthorized access. 

The backend must verify: 

- User identity 

- Role 

- Station authorization 

- Ticket ownership/access 

- Current ticket state 

- Requested action 

before processing the operation. 

# **12. User Ticket Access** 

A normal user should generally be able to: 

- Create tickets 

- View their own tickets 

- Send messages on their tickets 

- View user-visible ticket communication 

- Upload authorized attachments 

- Submit feedback for their resolved ticket 

A user must not access another employee's ticket simply by knowing its ticket number or ID. 

# **13. Agent Access** 

Agents may access tickets within their authorized station scope, subject to current authorization rules. 

Agents may: 

- View authorized tickets 

- Claim tickets 

- Accept assignments 

- Send user-visible messages 

- Add internal notes 

- Transfer tickets where permitted 

- Resolve tickets 

- Use predefined notices 

- View relevant queue information 

Agents must not gain administrative privileges merely because they can process tickets. 

# **14. Administrative Access** 

Administrators may manage system configuration and authorized administrative operations. 

Administrative capabilities include appropriate management of: 

- Users 

- Agents 

- Stations 

- Agent-station assignments 

- Problem categories 

- Problem types 

- Response templates 

- System configuration 

- Reports 

- Audit records 

Administrative operations must be separately authorized and audited. 

# **15. Internal Message Confidentiality** 

Internal agent communication is confidential. 

Messages marked: 

INTERNAL 

must never be returned to normal users. 

The backend must enforce message visibility. 

The frontend must not rely on simply hiding internal messages. 

For example, an API response to a user must not contain internal messages and expect the frontend to hide them. 

Internal messages should only be returned to authorized internal users. 

# **16. User-Agent Communication** 

User-visible messages must be explicitly identified as such. 

The system should distinguish: 

USER_VISIBLE 

INTERNAL 

SYSTEM 

The backend must enforce these visibility rules. 

An agent must not accidentally expose an internal note through an ordinary user conversation endpoint. 

# **17. WebSocket Security** 

WebSocket connections must be authenticated and authorized. 

A user connecting to: 

/ws/tickets/{id}/ 

must not automatically receive events for that ticket. 

The backend must verify that the authenticated user is authorized to access the ticket. 

The same authorization principles used by HTTP APIs must apply to WebSockets. 

# **18. API Security** 

All protected API endpoints must require appropriate authentication. 

The API must enforce: 

- Authentication 

- Authorization 

- Input validation 

- Object-level authorization 

- Rate limiting where appropriate 

- Secure error handling 

- Appropriate HTTP methods 

- Request-size limits 

Sensitive endpoints require additional protection. 

Examples include: 

- Login 

- Password reset 

- Feedback submission 

- File upload 

- Administrative operations 

- Search 

- Assignment 

- Transfer 

- Ticket status changes 

# **19. CSRF Protection** 

If cookie/session authentication is used, appropriate CSRF protection must be enabled. The application must correctly configure: 

- CSRF cookies 

- Trusted origins 

- Secure cookies 

- SameSite behaviour 

The exact configuration must reflect the final authentication architecture. 

CSRF protection must not simply be disabled to solve development or deployment problems. 

# **20. CORS** 

Cross-origin access must be restricted. 

The application should allow only approved frontend origins. 

Wildcard CORS configuration must not be used casually in production. 

The final CORS configuration must correspond to the actual deployment topology. 

# **21. Session Security** 

Sessions must be protected against: 

- Session theft 

- Session fixation 

- Insecure transmission 

- Excessive lifetime 

- Unauthorized reuse 

Production sessions should use secure cookie settings appropriate to the deployment. Authentication state must not be exposed unnecessarily to frontend JavaScript. 

# **22. Brute-Force Protection** 

Authentication endpoints must be protected against repeated failed attempts. Controls may include: 

- Rate limiting 

- Temporary throttling 

- Account protection 

- Monitoring 

- Appropriate logging 

The implementation must avoid creating an easy denial-of-service mechanism against legitimate users. 

# **23. Input Validation** 

All user-controlled input must be validated server-side. 

Examples include: 

- Ticket descriptions 

- Messages 

- Search terms 

- Names 

- Email addresses 

- Configuration values 

- Transfer reasons 

- Resolution notes 

- Feedback comments 

- Uploaded filenames 

Client-side validation may improve usability but must never replace backend validation. 

# **24. SQL Injection Protection** 

The application must use Django's ORM and parameterized database operations. 

Raw SQL should only be used where necessary and must be safely parameterized. 

User input must never be concatenated directly into SQL statements. 

# **25. Cross-Site Scripting Protection** 

User-generated content must be treated as untrusted. 

The system must protect against stored and reflected XSS. 

This applies particularly to: 

- Ticket descriptions 

- Messages 

- Feedback comments 

- User names 

- File names 

- Administrative configuration fields 

The frontend must not render untrusted HTML unless it has been deliberately sanitized. 

# **26. File Upload Security** 

Attachments represent a significant security risk. 

The application must enforce: 

- Allowed file types 

- Maximum file size 

- Filename normalization 

- Secure storage 

- Authorization checks 

- Unique storage keys 

- Controlled downloads 

Files must not be executed as application code. 

Uploaded files must not be placed directly into executable application directories. 

Where infrastructure permits, malware/antivirus scanning should be introduced. 

# **27. File Download Authorization** 

Possession of a file URL must not automatically grant access. 

Before serving or generating access to an attachment, the backend must verify: 

- Authenticated user 

- Ticket access 

- Message/attachment visibility 

- Appropriate role 

- Current authorization 

Users must not access attachments belonging to unauthorized tickets. 

# **28. Feedback Token Security** 

Feedback links use secure tokens. 

Tokens must: 

- Be cryptographically random 

- Be sufficiently long 

- Be difficult to guess 

- Have a defined expiry 

- Be associated with the correct ticket 

- Be associated with the intended feedback flow 

- Be one-time-use 

Where practical, only a secure hash of the token should be stored in the database. 

The raw token should be delivered through the intended feedback link rather than stored unnecessarily. 

# **29. Feedback Expiration** 

Feedback tokens must follow the defined business rule. 

The token expires at: 

17:00 GMT 

on the applicable working day. 

If the ticket is resolved after 17:00 GMT, the token expires at: 

17:00 GMT 

on the next applicable working day. 

The implementation must use timezone-aware date/time handling. 

The system must not implement the rule as: 

resolution time + 9 hours 

# **30. Feedback Replay Protection** 

After successful feedback submission: 

Token 

↓ 

Validated 

↓ 

Feedback recorded 

↓ 

Token invalidated 

A second submission must fail. 

The operation must be atomic so that concurrent requests cannot submit the same token successfully twice. 

# **31. Ticket State Security** 

Ticket status changes must be controlled by the backend. 

The client must not directly set arbitrary statuses. 

For example, the client must not simply submit: 

status=CLOSED 

and bypass the feedback workflow. 

Valid state transitions must be enforced by business logic. 

# **32. Claim and Assignment Security** 

Claiming a ticket must be atomic. 

The system must prevent two agents from successfully claiming the same unassigned ticket simultaneously. 

The backend should use appropriate transaction/concurrency controls. 

Assignment operations must verify: 

- Agent authorization 

- Station scope 

- Ticket state 

- Current assignment 

- Appropriate permissions 

# **33. Transfer Security** 

Ticket transfers must verify: 

- Initiating user's authorization 

- Destination station 

- Destination agent where applicable 

- Ticket state 

- Valid assignment relationships 

Every transfer should record: 

- Previous station 

- New station 

- Previous agent 

- New agent 

- Initiator 

- Timestamp 

- Reason where required 

# **34. Queue Security** 

Queue information must respect authorization. 

Users may see only the queue information permitted by the business rules. 

Agents must only see queues within their authorized station scope. 

P1 tickets must not be exposed as ordinary queue positions. 

Queue calculations must be performed by the backend. 

The client must not calculate authoritative queue positions. 

# **35. Escalation Security** 

P2 and P3 escalation is processed by background tasks. 

Before sending an escalation notification, the task must re-check the current ticket state. 

For example, an escalation task must verify that the ticket is still: 

- Active 

- Eligible for escalation 

- Unattended 

- Within the relevant station scope 

If an agent has already claimed the ticket, the escalation must not proceed. 

Escalation processing must be idempotent to prevent duplicate notifications. 

# **36. Notification Security** 

Notifications must not expose unnecessary sensitive information. 

Email notifications should contain only information necessary for the recipient to understand the event. 

Internal notes must never be included in user notifications. 

Sensitive ticket information should not be placed in notification previews unless required. Notification links must still require appropriate authorization. 

# **37. Email Security** 

SMTP credentials must be stored securely. 

Email content should be generated by controlled application templates. 

The system must avoid placing: 

- Passwords 

- Secrets 

- Internal credentials 

- Internal agent notes 

in emails. 

Feedback links must use secure HTTPS URLs in production. 

# **38. Audit Logging** 

Security-relevant actions must be auditable. 

Examples include: 

- Login 

- Logout where relevant 

- Account creation 

- Account deactivation 

- Role changes 

- Priority changes 

- Station assignment changes 

- Ticket creation 

- Ticket assignment 

- Ticket transfer 

- Status changes 

- Resolution 

- Feedback 

- Administrative configuration changes 

- Internal-message activity where appropriate 

- Attachment actions where required 

Audit records should include information such as: 

- Actor 

- Action 

- Target object 

- Timestamp 

- Relevant metadata 

- Previous value where appropriate 

- New value where appropriate 

# **39. Audit Log Integrity** 

Audit records should be append-oriented. 

Normal application users must not be able to modify or delete audit records. Administrative access to audit logs must itself be controlled and logged. 

Audit logs should not contain unnecessary secrets or sensitive authentication information. 

# **40. Error Handling** 

Production errors must not reveal: 

- Database credentials 

- Stack traces to ordinary users 

- Secret keys 

- Internal filesystem paths 

- Infrastructure credentials 

- Internal service addresses where unnecessary 

Users should receive safe error messages. 

Detailed diagnostic information should remain in controlled server logs. 

# **41. Secrets Management** 

Production secrets must never be committed to Git. 

This includes: 

- Django secret key 

- Database passwords 

- Redis credentials 

- MinIO credentials 

- SMTP credentials 

- API keys 

- Authentication secrets 

Use environment variables or an approved server-side secrets mechanism. 

.env.example may contain placeholders but must not contain real credentials. 

# **42. Database Security** 

PostgreSQL must: 

- Use strong credentials 

- Be accessible only to authorized services 

- Not be publicly exposed 

- Use appropriate access controls 

- Receive security updates 

- Be backed up 

- Be monitored 

The application's database account should have only the required privileges. 

# **43. Redis Security** 

Redis must be treated as an internal service. 

It should not be publicly accessible. 

Redis credentials and network restrictions should be configured according to the production environment. 

Redis must not be treated as the authoritative source of permanent business records. 

# **44. Object Storage Security** 

Object storage must: 

- Require authentication 

- Restrict administrative access 

- Avoid unnecessary public buckets 

- Use unique object keys 

- Enforce application-level authorization 

- Be backed up 

- Be monitored 

Direct public access to ticket attachments should not be enabled unless explicitly required and secured. 

# **45. Infrastructure Security** 

The application must not assume a particular production infrastructure. 

The company currently intends to use a dedicated server with cPanel. 

Security requirements therefore apply regardless of whether the production environment uses: 

- Native processes 

- Containers 

- A cPanel-managed runtime 

- Another approved deployment mechanism 

The application must not hard-code assumptions about: 

Ubuntu 

Nginx 

Docker 

Specific filesystem paths 

Specific server IP addresses 

# **46. cPanel Security** 

cPanel is treated as part of the hosting environment. 

Where cPanel is used: 

- Administrative access must be restricted. 

- Strong authentication should be used. 

- SSL/TLS should be properly configured. 

- Application credentials must remain protected. 

- Existing applications must not be modified unnecessarily. 

- The IT Ticketing System must remain isolated from the existing HRMS. 

cPanel-specific configuration should remain in deployment documentation rather than application business logic. 

# **47. Docker Security** 

Docker Compose is preferred for development and reproducible environments. 

If Docker is approved for production: 

- Use trusted images. 

- Pin important versions. 

- Do not run unnecessary services as root. 

- Avoid exposing internal ports. 

- Protect environment files. 

- Restrict container privileges. 

- Keep images updated. 

- Do not place production secrets in images. 

Docker is not a mandatory production dependency. 

# **48. Web Server / Reverse Proxy Security** 

The production web-server layer is environment-dependent. 

Regardless of the specific product used, it must provide appropriate: 

- HTTPS handling 

- Request routing 

- Header handling 

- Request-size controls 

- Connection controls 

- WebSocket routing where required 

- Access restrictions 

The application must not rely on a particular web-server product for core authorization. 

# **49. Network Segmentation** 

Where infrastructure permits, the system should separate: 

User access 

↓ 

Web/application layer 

↓ 

Internal services 

↓ 

Database/storage 

PostgreSQL, Redis, and object-storage administration should not be directly accessible to ordinary employees. 

# **50. Rate Limiting** 

Rate limiting should be applied to security-sensitive endpoints. 

Priority areas include: 

- Login 

- Password reset 

- Feedback submission 

- Search 

- File upload 

- Administrative endpoints 

- Other abuse-sensitive operations 

Limits must be configured carefully to avoid disrupting legitimate internal users. 

# **51. Data Protection** 

The system should collect only information required for its purpose. 

Sensitive information should not be unnecessarily duplicated. 

Access to personal information must be controlled according to role and business need. Data retention should follow company policy. 

Tickets should not be physically deleted during normal operations where historical records are required. 

# **52. Backup Security** 

Backups must be: 

- Access-controlled 

- Protected from unauthorized modification 

- Stored separately where practical 

- Encrypted where required by company policy 

- Regularly tested 

- Monitored for successful completion 

Backup credentials must be protected separately from ordinary application credentials. 

# **53. Disaster Recovery Security** 

Recovery procedures must preserve security controls. 

A restored environment must not accidentally: 

- Expose PostgreSQL publicly 

- Expose Redis publicly 

- Disable authentication 

- Use development credentials 

- Disable HTTPS 

- Enable debug mode 

- Expose internal storage 

- Reuse compromised secrets 

After recovery, credentials should be reviewed and rotated where appropriate. 

# **54. Dependency Security** 

Dependencies must be reviewed and kept reasonably current. 

The development process should include: 

- Dependency vulnerability checks 

- Controlled upgrades 

- Automated testing 

- Review of security advisories 

- Removal of unnecessary packages 

A dependency should not be added merely for convenience when the functionality can be implemented safely using existing approved components. 

# **55. Secure Development** 

Development must include security testing for: 

- Authentication 

- Authorization 

- Object-level access 

- Station restrictions 

- Internal message confidentiality 

- Priority enforcement 

- Queue manipulation 

- Ticket state transitions 

- Feedback tokens 

- File uploads 

- API access 

- WebSocket access 

- Rate limiting 

- Administrative functions 

Security tests should be automated where practical. 

# **56. Testing Security-Critical Operations** 

The following scenarios must have automated tests. 

# **Authorization** 

- User cannot access another user's ticket. 

- User cannot access internal notes. 

- Agent cannot access an unauthorized station. 

- Agent cannot perform administrator operations. 

# **Priority** 

- User cannot self-promote to P1. 

- P1 behaviour is determined by server-side user priority. 

# **Ticket State** 

- Invalid status transitions are rejected. 

- Users cannot bypass the resolution workflow. 

# **Claiming** 

- Two agents cannot successfully claim the same ticket simultaneously. 

# **Transfer** 

- Unauthorized transfers are rejected. 

- Transfer history is recorded. 

# **Feedback** 

- Invalid token rejected. 

- Expired token rejected. 

- Used token rejected. 

- Concurrent submissions cannot produce multiple successful feedback records. 

# **Files** 

- Unauthorized attachment access is rejected. 

- Disallowed file types are rejected. 

- File-size limits are enforced. 

# **57. Security Monitoring** 

Security-relevant events should be monitored where practical. 

Examples include: 

- Repeated failed logins 

- Unexpected authorization failures 

- Administrative changes 

- Repeated invalid feedback-token attempts 

- Unusual file-upload activity 

- Repeated API failures 

- Background-task failures 

Monitoring should support investigation without collecting unnecessary sensitive information. 

# **58. Production Security Configuration** 

Production must not run with development security settings. 

At minimum: 

DEBUG = False 

Production must use: 

- HTTPS 

- Secure cookies 

- Proper allowed-host configuration 

- Proper CSRF configuration 

- Restricted CORS 

- Protected secrets 

- Production database 

- Controlled file storage 

- Appropriate logging 

# **59. Security Review Before Release** 

Before production release, verify: 

- Authentication works securely 

- Authorization is enforced server-side 

- Station restrictions work 

- P1/P2/P3 priority cannot be manipulated by clients 

- Internal messages remain private 

- Ticket object authorization works 

- Ticket state transitions are enforced 

- Claiming is atomic 

- Transfers are authorized 

- Feedback tokens are secure 

- Feedback tokens expire correctly 

- Feedback tokens cannot be reused 

- File uploads are restricted 

- File downloads are authorized 

- Rate limiting is configured 

- CSRF protection is configured 

- CORS is restricted 

- Production secrets are protected 

- Debug mode is disabled 

- Security headers are configured 

- Database is protected 

- Redis is protected 

- Object storage is protected 

- Audit logging works 

- Backups work 

- Recovery has been tested 

# **60. Claude Code Security Instructions** 

Claude Code must: 

1. Treat the backend as the security authority. 

2. Never trust client-supplied role, priority, station, status, assignment, or authorization information. 

3. Never expose internal messages to unauthorized users. 

4. Enforce object-level authorization. 

5. Enforce station-level authorization. 

6. Keep authentication separate from authorization. 

7. Use Django's established security mechanisms where applicable. 

8. Never store plaintext passwords. 

9. Never commit secrets. 

- 10.Never disable CSRF or security controls simply to solve development problems. 

11.Never bypass authorization for convenience. 12.Use transactions for security-critical state changes. 13.Protect feedback tokens against guessing and replay. 14.Validate uploaded files. 15.Protect attachment downloads. 16.Apply authorization to WebSocket connections. 17.Keep audit records append-oriented. 18.Avoid sensitive information in logs. 

- 19.Never allow the client to determine authoritative ticket priority. 

- 20.Never allow the client to bypass ticket-state rules. 

21.Never assume a particular production operating system. 

- 22.Never assume Nginx, Ubuntu, or Docker is mandatory. 

- 23.Treat cPanel as a deployment environment, not an application dependency. 

- 24.Review security implications before adding dependencies. 

- 25.Add automated tests for security-critical functionality. 

- 26.Flag security ambiguities instead of inventing behaviour. 

# **61. Security Acceptance Principle** 

A feature is not considered complete merely because the intended user interface works. For every protected operation: 

Request 

↓ 

Authentication 

↓ 

Authorization 

↓ 

Object/Station/State Validation 

↓ 

Business Logic 

↓ 

Database Transaction 

↓ 

Audit/Notification where required 

↓ 

Response 

Security must be enforced throughout this flow. 

# **62. Final Security Principle** 

The IT Ticketing System must operate on the assumption that: 

The client cannot be trusted to enforce business rules. 

The frontend improves usability. 

The backend enforces: 

- Identity 

- Permissions 

- Station scope 

- Priority 

- Ticket state 

- Assignment 

- Transfers 

- Message visibility 

- Feedback security 

- File access 

 Administrative actions 

The system should therefore follow: 

Authenticate 

↓ 

Authorize 

↓ 

Validate 

↓ 

Execute safely 

↓ 

Record important actions 

↓ 

Protect the result 

Security must remain part of the architecture and development process rather than being added only before production deployment. 

