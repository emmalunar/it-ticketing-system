We’ll move to `02-product-requirements.md` next. I’ll keep the original requirements intact while updating the deployment/environment assumptions to match the revised business context, especially the dedicated cPanel server, environment-dependent production stack, and future AD/LDAP compatibility. 

02-product-requirements.md 

# **IT Ticketing System — Product Requirements** 

## **1. Document Purpose** 

This document defines the functional and non-functional requirements for the internal IT Ticketing System. 

It describes what the system must provide to employees, IT agents, administrators, and other authorised users. 

This document should be read together with: 

- `01-business-context.md` — organisational context and project constraints 

- `03-business-rules.md` — authoritative business behaviour 

- `04-user-roles-and-permissions.md` — access control 

- `05-ticket-workflow.md` — ticket lifecycle 

- `06-queue-and-priority-system.md` — queue and priority behaviour 

- `07-database-design.md` — data model 

- `08-system-architecture.md` — technical architecture 

- `09-api-specification.md` — API contract 

- `10-security.md` — security requirements 

- `11-notification-and-sla.md` — notifications and SLA behaviour 

- `12-deployment.md` — deployment requirements 

- `13-development-roadmap.md` — implementation sequence 

- `14-claude-code-instructions.md` — implementation instructions for Claude 

- Code 

Where a conflict exists, the more specific business-rule or security document takes precedence. 

# **2. Product Overview** 

The IT Ticketing System is an internal web application that allows employees to report IT problems and enables the IT department to receive, prioritise, route, assign, communicate about, resolve, and report on those problems. 

The application is primarily intended for use within the organisation's internal network. 

The system must support: 

- Employee problem submission 

- Station-based ticket routing 

- Priority-based handling 

- Station-specific queues 

- Agent claiming and assignment 

- Ticket transfers between stations and agents 

- User-agent communication 

- Private agent-to-agent communication 

- Predefined agent notices 

- Ticket resolution 

- User feedback 

- Automatic reopening after negative feedback 

- Ticket closure 

- Notifications and escalation 

- Administration 

- Audit history 

- Reporting 

- Attachments 

- Search 

- Real-time updates 

The system should be designed as a maintainable business application rather than as a simple form-and-email system. 

# **3. Product Goals** 

The system should achieve the following goals: 

1. Provide employees with a simple way to report IT problems. 

2. Ensure tickets reach the appropriate IT support station. 

3. Ensure high-priority users receive appropriate priority handling. 

4. Give agents a clear view of tickets requiring attention. 

5. Reduce delays caused by untracked or forgotten support requests. 

6. Provide transparent communication between users and IT agents. 

7. Allow agents to coordinate privately without exposing internal discussions to users. 

8. Provide measurable information about IT support activity. 

9. Maintain a reliable history of ticket activity. 

10. Provide administrators with control over configurable system data. 

11. Improve accountability through audit trails. 

12. Provide a foundation that can be expanded with future integrations. 

# **4. Users** 

The system will support the following primary user groups. 

## **4.1 Standard Users** 

Employees who submit IT problems. 

They should be able to: 

- Log in 

- Create tickets 

- Select their station 

- Select a problem type 

- Describe their problem 

- Attach supporting files where permitted 

- View their tickets 

- View ticket status 

- Communicate with IT agents 

- Receive notifications 

- View relevant queue information 

- Respond to requests from agents 

- Provide feedback after resolution 

- View ticket history relevant to them 

Standard users normally have priority level P3. 

## **4.2 Managers and Consultants** 

Managers and consultants use the same core ticketing functionality as standard users but may have a higher priority level. 

Managers normally have P2 priority. 

Consultants may have P2 priority where configured by the organisation. 

Consultant accounts must support: 

- Activation 

- Expiration date 

- Automatic deactivation after expiration 

- Retention of historical records after deactivation 

A consultant's account status must not result in historical tickets, messages, or audit records being deleted. 

## **4.3 Executives** 

Executives, including CEOs and other designated executive users, have P1 priority. 

P1 users receive immediate handling and do not participate in the normal P2/P3 queue. 

The system must determine priority from the user's configured priority level rather than allowing the user to select their own priority. 

## **4.4 IT Agents** 

Agents are responsible for handling IT support tickets. 

Agents should be able to: 

- View tickets within their authorised station scope 

- Claim tickets 

- Accept responsibility for tickets 

- Be assigned tickets 

- Reassign tickets where authorised 

- Transfer tickets between stations 

- Communicate with users 

- Add internal notes/messages 

- Use predefined notices 

Attach files 

Change ticket status where permitted 

- Resolve tickets 

- Receive notifications 

View relevant queue information 

- Search tickets within their authorised scope 

Agents must not automatically have access to tickets outside their authorised station scope. 

## **4.5 Administrators** 

Administrators manage the system and have broader access. 

Administrators should be able to: 

- Manage users 

- Manage roles and priorities 

- Manage stations 

- Manage agent-station assignments 

- Manage problem categories 

- Manage problem types 

- Manage response templates 

- Manage consultant expiration 

- View tickets across stations 

- View audit records 

- Access reports 

- Configure system behaviour where supported 

- Perform authorised administrative interventions 

Administrative actions must be audited. 

# **5. Authentication and Account Requirements** 

## **5.1 Authentication** 

The MVP must provide secure application authentication. 

Authentication must be implemented independently of the company's existing Active Directory unless AD/LDAP integration is explicitly included in the MVP scope. 

The authentication design must remain compatible with future AD/LDAP integration. 

The system must not hard-code assumptions that would make future directory integration difficult. 

## **5.2 Account Status** 

User accounts must support: 

- Active 

- Inactive 

Inactive accounts must not be able to authenticate normally. 

Consultant accounts may additionally have an expiration date. 

When the expiration date is reached, the consultant account must automatically become inactive. 

## **5.3 Password Security** 

Where local authentication is used: 

- Passwords must never be stored in plaintext. 

- Password hashing must use Django's supported secure password hashing mechanisms. 

- Login attempts must be protected against brute-force abuse. Sessions must be securely managed. 

- Password reset functionality must follow secure procedures. 

# **6. User Dashboard** 

After authentication, users should have access to a dashboard showing relevant support information. 

The dashboard should include: 

- Open tickets 

- Recently updated tickets 

- Ticket status 

- Ticket number 

- Problem type 

- Station 

- Priority where appropriate 

- Last update 

- Notifications 

Feedback requests where applicable 

The interface should make it clear when action is required from the user. 

# **7. Ticket Creation** 

Users must be able to create an IT ticket through a simple form. 

The minimum ticket creation information is: 

1. Station 

2. Problem type 

3. Brief description 

The system automatically determines the user's priority from their account. 

Users must not be allowed to select or modify their own priority. 

## **7.1 Station Selection** 

The user must select the station associated with the problem. 

Current stations include: 

- Head Office 

Babylove - Tesano 

The station list must be database-driven. 

Inactive stations must not normally appear as selectable options for new tickets. 

## **7.2 Problem Type Selection** 

Problem types must be configurable through the administration interface. 

The initial catalogue includes: 

### **Support** 

- SAP 

- Microsoft Excel 

- Microsoft Word 

- HR System 

- Other Support 

### **Laptop** 

- Faulty Laptop (Software) 

- Faulty Laptop (Hardware) 

### **Laptop Accessories** 

### **Printer** 

### **Scanner** 

### **Monitor** 

The system must not require source-code changes to add, deactivate, rename, reorder, or otherwise manage normal problem catalogue entries. 

## **7.3 Description** 

Users must provide a brief description of the problem. 

The backend must validate submitted content. 

The system should support sufficiently detailed descriptions without imposing unnecessarily restrictive limits. 

## **7.4 Attachments** 

Users should be able to attach relevant files where permitted. 

Examples may include: 

- Screenshots 

Error messages 

Documents 

- Photos 

Attachments must be subject to: 

- File type restrictions 

- File size limits 

- Security validation 

- Access control 

- Appropriate storage controls 

The actual files should be stored in the configured file-storage system rather than directly inside PostgreSQL. 

# **8. Ticket Number** 

Every ticket must have a unique human-readable ticket number. 

Recommended format: 

```
IT-YYYY-XXXXXX
```

Example: 

```
IT-2026-000125
```

The human-readable ticket number must be separate from the database primary key. 

The ticket number should be: 

- Unique 

- Stable 

- Searchable 

- Suitable for email communication 

- Suitable for user and agent reference 

# **9. Ticket Routing** 

When a ticket is created: 

1. The selected station is recorded. 

2. The user's configured priority is applied. 

3. The ticket is placed into the appropriate handling flow. 

4. Agents authorised for the selected station become eligible to handle it. 

Initial visibility must be station-based. 

A ticket should not be visible to unrelated station agents unless it has been transferred or the agent has broader authorised access. 

# **10. Agent Dashboard** 

Agents should have a dashboard designed around their support responsibilities. 

The dashboard should provide: 

- Tickets awaiting attention 

- P1 tickets requiring immediate handling 

- P2 queue 

- P3 queue 

- Assigned/in-progress tickets 

- Tickets waiting for users 

- Recently resolved tickets 

- Notifications 

- Ticket search 

- Queue information 

- Station context 

The exact dashboard presentation may evolve during implementation, but the underlying business rules must remain unchanged. 

# **11. Ticket Queue** 

The system must provide station-specific queues for P2 and P3 tickets. 

P1 tickets bypass the normal queue. 

The queue must: 

- Be station-specific 

- Place P2 tickets ahead of P3 tickets 

Maintain FIFO ordering within the same priority 

- Exclude tickets already being handled 

- Exclude resolved and closed tickets 

- Exclude P1 tickets 

- Return tickets to the appropriate queue after reopening where applicable 

Queue position must be calculated dynamically rather than treated as permanent ticket data. 

Users should be able to see the number of applicable tickets ahead of their ticket where the business rules permit. 

# **12. Priority Handling** 

The system supports three priority levels. 

|**Priority**|**User Group**|**Queue Behaviour**|**Escalation**|
|---|---|---|---|
|P1|Executives|Bypasses normal<br>queue|Immediate<br>notification|
|P2|Managers / configured<br>consultants|Normal queue|10 minutes<br>unattended|
|P3|Standard users|Normal queue|60 minutes<br>unattended|



Priority is determined by the user's account configuration. 

Priority must be enforced by the backend. 

The frontend must never be treated as the authority for priority. 

# **13. P1 Handling** 

When a P1 ticket is created: 

- The ticket must receive immediate priority handling. 

- Agents at the selected station must receive immediate notification. The ticket must not receive a normal queue position. 

- It must not wait behind P2 or P3 tickets. 

The ticket otherwise follows the standard ticket lifecycle. 

# **14. P2 and P3 Escalation** 

P2 and P3 tickets enter the applicable station queue. 

If a ticket remains unattended: 

- P2: escalation after 10 minutes 

- P3: escalation after 60 minutes 

Unattended means that no agent has accepted, claimed, or otherwise been assigned responsibility for the ticket. 

Once an agent has claimed or been assigned the ticket, unattended escalation must stop even if the ticket remains unresolved. 

The escalation mechanism must be idempotent so that the same escalation does not repeatedly generate duplicate notifications. 

# **15. Ticket Claiming and Assignment** 

Agents must be able to claim tickets they are authorised to handle. 

Claiming must be atomic so that two agents cannot successfully claim the same ticket simultaneously. 

The system should record: 

- Agent 

- Timestamp 

- Assignment type 

- Initiating user where applicable 

- Previous assignment where applicable 

- Reason where required 

Assignment history must be retained. 

The current assignee should represent the current state while the assignment history preserves the historical record. 

# **16. Ticket Transfers** 

Authorised agents must be able to transfer tickets to another station or agent where required. 

A transfer must record: 

- Previous station 

- New station 

- Previous agent where applicable 

- New agent where applicable 

- Initiating agent 

- Timestamp 

- Reason 

After a station transfer, the ticket must follow the queue and visibility rules of the receiving station. 

Transfers must not expose tickets to unauthorised users. 

# **17. Ticket Communication** 

The system must support communication between users and IT agents through the ticket. 

Users should be able to: 

- Send messages 

- Read agent responses 

- Respond to requests 

- Provide additional information 

- Receive system notices 

Agents should be able to: 

- Respond to users 

- Request additional information 

- Provide support instructions 

- Send predefined notices 

**18. Internal Agent Communication** 

Agents must be able to communicate privately with other authorised agents through internal notes/messages. 

Internal communication must: 

- Be associated with the relevant ticket 

- Be visible only to authorised internal users 

- Never be exposed through the user-facing conversation 

- Be protected by backend authorization 

- Be included in appropriate audit/history mechanisms 

Internal communication and user-agent communication must remain logically separate. 

# **19. Predefined Agent Notices** 

Agents should be able to send predefined notices to users. 

The initial notices include: 

- **“I am coming”** 

- **“Please bring your PC”** 

Predefined notices should be manageable by administrators so that new notices can be added or existing notices changed without requiring application code changes. 

The system should identify predefined notices separately from ordinary messages. 

# **20. Ticket Status** 

The system should use the following primary ticket statuses: 

- `QUEUED` 

- `IN_PROGRESS` 

- `WAITING_USER` 

- `RESOLVED` 

- `CLOSED` 

- `REOPENED` 

Assignment is separate from status. 

There should not be a long-lived `ASSIGNED` status. 

`IN_PROGRESS` indicates that an agent has taken responsibility for handling the ticket. 

# **21. Ticket Resolution** 

When an agent resolves a ticket: 

1. The ticket status becomes `RESOLVED` . 

2. Resolution information is recorded. 

3. The user is notified. 

4. A feedback request is generated. 

5. A secure feedback link/token is created. 

The ticket should not automatically become permanently closed merely because the agent marked it as resolved. 

Closure depends on the feedback process and applicable system rules. 

# **22. Feedback** 

After resolution, the user receives a feedback request. 

The feedback mechanism must support: 

- Positive feedback Negative feedback Optional comments where configured 

The feedback link must use a secure token. 

The token must: 

- Be cryptographically generated Be securely stored Have a fixed expiry Be usable only once Become invalid immediately after successful submission 

**22.1 Feedback Expiry** 

Feedback expiry is based on the applicable working day rather than a fixed number of hours. 

The current rule is: 

- If the ticket is resolved before 5:00 PM GMT, the feedback token expires at 5:00 PM GMT on that applicable working day. 

- If the ticket is resolved after 5:00 PM GMT, the token expires at 5:00 PM GMT on the next applicable working day. 

Initially, working days are Monday to Friday. 

Holiday/non-working-day configuration may be introduced later. 

## **22.2 Feedback Outcome** 

Positive feedback: 

```
RESOLVED → CLOSED
```

Negative feedback: 

```
RESOLVED → REOPENED
```

A reopened ticket must return to the appropriate active handling flow. 

P2/P3 tickets return to the relevant station queue. 

P1 tickets return to immediate-priority handling. 

# **23. Notifications** 

The system must provide notifications for important events. 

Notifications may be delivered through: 

In-app notifications 

Email 

Real-time WebSocket updates 

Important events include: 

New P1 ticket 

- P2 escalation 

- P3 escalation 

- Ticket assignment 

- Ticket transfer 

- User message 

- Agent response 

- Ticket resolution 

- Negative feedback 

- Ticket reopening 

- Other configured system notifications 

Notification delivery must not change the underlying ticket state unless explicitly required by a business rule. 

# **24. Real-Time Updates** 

The application should support real-time updates for relevant events. 

Examples include: 

- New tickets 

- Queue changes 

- New ticket messages 

- Notifications 

- Assignment changes 

- Transfers 

- Status changes 

Real-time communication must respect the same authorization rules as the REST API. 

A user must never receive real-time information about a ticket they are not authorised to access. 

# **25. Consultant Account Management** 

The system must support temporary consultant accounts. 

A consultant account may include: 

- Start/activation date 

- Expiration date 

- Assigned priority 

- Station access where applicable 

- Active/inactive state 

When the expiration date is reached: 

- The account becomes inactive. 

- The user can no longer authenticate normally. 

- Existing records remain available for historical and audit purposes. 

Account expiration should be handled automatically by the system. 

# **26. Administration** 

Administrators should have an administration interface for managing configurable system information. 

The administration area should include: 

### **Users** 

- Create users 

- Update users 

- Activate/deactivate users 

- Configure roles 

- Configure priority 

- Manage consultant expiry 

### **Stations** 

- Create stations 

- Update stations 

- Activate/deactivate stations 

### **Agent Station Assignments** 

- Assign agents to stations 

- Remove station assignments 

- Support agents assigned to multiple stations 

### **Problem Categories** 

Create 

Update 

- Activate/deactivate 

Reorder 

### **Problem Types** 

- Create 

- Update 

- Activate/deactivate 

- Reorder 

- Associate with categories 

### **Response Templates** 

- Create 

- Update 

- Activate/deactivate 

Administrative changes must be audited. 

# **27. Audit History** 

The system must maintain an audit history for important actions. 

Auditable events should include, where applicable: 

- Ticket creation 

- Ticket assignment 

- Ticket claiming 

- Ticket reassignment 

- Ticket transfer 

- Status changes 

- Resolution 

- Reopening 

- Closure 

- Feedback submission 

- User/account changes 

- Station changes 

- Problem catalogue changes 

- Response-template changes 

#### Administrative actions 

Audit records should contain sufficient information to identify: 

- Who performed the action 

- What action occurred 

- What object was affected 

- When it occurred 

- Relevant previous state 

- Relevant new state 

- Additional contextual information where necessary 

Audit records should be append-only during normal operation. 

# **28. Attachments** 

Attachments must be supported where relevant. 

The system must maintain metadata for each attachment, including: 

- Original filename 

- Storage identifier 

- Content type 

- File size 

- Uploader 

- Related ticket/message 

- Visibility 

- Creation timestamp 

Attachment access must follow the visibility and authorization rules of the associated ticket/message. 

# **29. Search** 

The system must provide search functionality appropriate to the user's permissions. Search may include: 

- Ticket number 

- User 

- Problem type 

- Station 

- Status 

- Priority 

- Assignee 

- Date range 

Relevant ticket content 

Users must only receive search results for objects they are authorised to access. 

Agents must not be able to bypass station restrictions through search. 

Administrators may have broader search access. 

# **30. Reporting** 

The system should provide reporting capabilities for authorised users. 

Initial reporting areas include: 

### **Ticket Summary** 

- Number of tickets 

- Tickets by status 

- Tickets by priority 

- Tickets by problem type 

- Tickets by station 

- Tickets over selected periods 

### **Agent Reports** 

- Tickets handled 

- Tickets resolved 

- Resolution activity 

- Workload indicators 

### **Station Reports** 

- Ticket volume 

- Priority distribution 

- Escalations 

- Resolution activity 

### **SLA/Support Metrics** 

Where applicable: 

- Ticket age 

- Unattended time 

- Response time 

- Resolution time 

- Closure time 

- Escalation count 

- Feedback results 

Reports must respect access-control requirements. 

# **31. Responsive Interface** 

The application should provide a usable interface on: 

- Desktop computers 

- Laptops 

- Tablets 

- Mobile-sized screens where practical 

The primary interface is intended for internal desktop/laptop use, but responsive design should be maintained to avoid unnecessary device restrictions. 

# **32. Accessibility and Usability** 

The application should follow practical accessibility and usability principles. 

The interface should provide: 

- Clear labels 

- Logical navigation 

- Keyboard-accessible controls where practical 

- Clear validation messages 

- Consistent layouts 

- Readable text 

- Appropriate feedback after actions 

- Distinct status and priority indicators 

- Confirmation for sensitive actions 

The system should avoid unnecessary complexity for standard users creating tickets. 

# **33. Data Storage** 

PostgreSQL will be the authoritative persistent database for application data. 

The system must not depend on individual employee computers for permanent application data. 

Persistent ticket information must be centrally stored. 

Redis may be used for: 

- Background task coordination 

- Queue/task support 

- Temporary caching 

- Real-time infrastructure support 

Redis must not be treated as the authoritative permanent store for tickets. 

Attachments should be stored using the configured object/file storage system, initially MinIO where appropriate. 

# **34. Backup and Recovery** 

The system must support regular automated backups. 

Backups should include, as applicable: 

- PostgreSQL database 

- Attachment/object storage 

- Important application configuration 

Backups must be stored separately from the primary application data. 

Backup restoration must be tested periodically. 

The implementation should define: 

- Backup frequency 

- Retention 

- Recovery procedures 

Recovery objectives Responsible personnel/process 

# **35. Security Requirements** 

The system must implement security as a core requirement. 

At minimum: 

- Backend authorization 

- Role-based access control 

- Station-based object authorization 

- Secure authentication 

- Secure password storage 

- HTTPS in deployed environments 

- CSRF protection where applicable 

- Input validation 

- Protection against SQL injection 

- XSS protection 

- Secure file handling 

- Secure feedback tokens 

- Rate limiting for sensitive operations 

- Audit logging 

- Secure secrets management 

- Secure WebSocket authorization 

- Secure session handling Restricted administrative access 

Security requirements are defined in greater detail in `10-security.md` . 

# **36. Performance and Reliability** 

The system should remain responsive under normal organisational usage. 

The implementation should: 

- Use database queries efficiently 

- Avoid unnecessary loading of large datasets Use pagination for large result sets 

- Use appropriate indexes 

Process scheduled tasks asynchronously Avoid duplicate escalation processing 

- Handle temporary email failures 

Handle temporary real-time connection failures 

Maintain database integrity during concurrent operations 

The system should fail safely where external services are temporarily unavailable. 

# **37. Deployment Environment** 

The application is intended to operate on the company's dedicated server environment. 

The current deployment environment includes a company-managed cPanel hosting environment. 

However, cPanel must not be treated as an application-level dependency. 

The application must remain portable and should not rely on undocumented features of the existing HRMS deployment. 

The exact production operating system, web server, application runtime configuration, and supported deployment mechanism must be confirmed during deployment preparation. 

Therefore: 

Ubuntu is not a mandatory production requirement. 

Nginx is not a mandatory production requirement. 

- Docker is preferred for reproducible development but is not automatically mandatory for production. 

The production web server/reverse proxy is environment-dependent. 

- The production deployment method must be selected based on the capabilities and policies of the company's server environment. 

The application architecture must preserve separation between the application and the hosting/control-panel environment. 

# **38. Existing Company Systems** 

The company already operates systems within its server environment, including an existing HRMS web application. 

The IT Ticketing System must be deployed independently and must not interfere with existing applications. 

The implementation must avoid assumptions about the internal technology stack of those applications unless that stack is formally confirmed. 

Windows Active Directory is available within the company environment. 

AD/LDAP integration is considered a future integration point rather than an MVP requirement unless explicitly added to scope. 

The application's authentication and user model should therefore remain compatible with future directory integration. 

# **39. Configuration Requirements** 

Configuration that is expected to change during normal administration should not be hard-coded unnecessarily. 

This includes: 

- Stations 

- Problem categories 

- Problem types 

- Response templates 

- User priority 

- Consultant expiration 

- Active/inactive status 

- Relevant notification settings 

Business-critical rules defined in the specifications must not be changed casually through user-controlled configuration. 

Configuration changes must be validated and audited. 

# **40. MVP Scope** 

The MVP should include: 

### **Authentication** 

- Local application authentication 

- Secure sessions 

- User account management 

### **Users** 

- Standard users 

- Agents 

- Administrators 

- Consultant accounts with expiration 

### **Ticketing** 

- Ticket creation 

- Ticket numbers 

- Problem catalogue 

- Station selection 

- Priority inheritance 

- Ticket visibility 

- Ticket status 

- Ticket history 

### **Queue** 

- P1 immediate handling 

- P2 queue 

- P3 queue 

- Station-specific queues 

- Queue positions 

- P2/P3 escalation 

### **Agent Handling** 

- Claiming 

- Assignment 

- Reassignment 

- Transfer 

- Resolution 

### **Communication** 

- User-agent messages 

- Internal agent messages 

- Predefined notices 

- Attachments 

### **Feedback** 

- Secure feedback tokens 

- Expiration rules 

- One-time submission 

- Positive/negative feedback 

- Automatic closure/reopening 

### **Notifications** 

- In-app notifications 

- Email notifications 

- Real-time updates where implemented 

### **Administration** 

- Users 

- Stations 

- Problem categories/types 

- Agent-station assignments 

- Response templates 

### **Audit and Reporting** 

- Audit logs 

- Ticket reports 

- Agent reports 

- Station reports 

- Basic SLA metrics 

### **Infrastructure** 

- PostgreSQL 

- Redis 

- Celery 

- Django Channels 

- Configured file storage 

- Secure deployment 

Backup and recovery procedures 

# **41. Future Scope** 

The following features are outside the initial MVP unless explicitly approved: 

- Active Directory/LDAP integration 

- Single Sign-On 

- Advanced analytics 

- Asset management 

- Knowledge base 

- AI-assisted ticket handling 

- Mobile application 

- Enterprise service integrations 

- Advanced workflow automation 

- Advanced reporting and business intelligence 

- Automated malware scanning of attachments 

- Additional external identity providers 

The architecture should avoid preventing these capabilities from being introduced later. 

# **42. Success Criteria** 

The MVP should be considered successful when: 

1. Employees can reliably submit IT tickets. 

2. Tickets are routed to the correct station. 

3. Priority rules are correctly enforced. 

4. P1 tickets receive immediate notification. 

5. P2/P3 queues operate according to the defined rules. 

6. Unattended escalation operates correctly. 

7. Agents can safely claim and handle tickets. 

8. Tickets can be transferred between stations. 

9. Users and agents can communicate through tickets. 

10. Internal agent communication remains private. 

11. Agents can resolve tickets and users can provide feedback. 

12. Positive feedback closes tickets. 

13. Negative feedback reopens tickets. 

14. Feedback tokens expire according to the defined working-day rule. 

15. Closed tickets are removed from active handling. 

16. Reopened tickets return to the appropriate handling flow. 

17. Consultant accounts automatically expire. 

18. Administrative changes are controlled and audited. 

19. Search respects authorization. 

20. Reports provide useful operational information. 

21. Ticket history remains available. 

22. Application data is centrally stored and backed up. 

23. Security controls are enforced by the backend. 

24. The application can be deployed within the company's available server environment without requiring undocumented infrastructure assumptions. 

25. The system remains capable of future AD/LDAP integration. 

# **43. Requirements Traceability** 

The following documents provide detailed specifications for the major product requirements: 

|**Requirement Area**|**Primary Specification**|
|---|---|
|Business context|`01-business-context.md`|
|Product requirements|`02-product-requirements.md`|
|Business rules|`03-business-rules.md`|
|Roles and permissions|`04-user-roles-and-permissions.md`|
|Ticket workflow|`05-ticket-workflow.md`|
|Queue and priority|`06-queue-and-priority-system.md`|
|Database|`07-database-design.md`|
|Architecture|`08-system-architecture.md`|
|API|`09-api-specification.md`|
|Security|`10-security.md`|
|Notifications and SLA|`11-notification-and-sla.md`|



|Deployment|`12-deployment.md`|
|---|---|
|Development roadmap|`13-development-roadmap.md`|
|Claude Code implementation|`14-claude-code-instructions.md`|



These documents collectively form the project specification. 

# **44. Change Control** 

Changes to product requirements should be documented before implementation when they affect: 

- Business rules 

- Ticket lifecycle 

- Priority behaviour 

- Queue behaviour 

- Access control 

- Data model 

- API contracts 

- Security 

- Notification behaviour 

- Deployment architecture 

Claude Code must not silently change a requirement because a different implementation appears easier. 

If a requirement is unclear or conflicts with another authoritative document, implementation should pause for clarification rather than inventing a rule. 

# **45. Implementation Principle** 

The application should be developed as a modular, maintainable business system. 

The implementation must distinguish between: 

- Business requirements 

- Business rules 

- Current application state 

- Historical records 

- Configuration 

- Infrastructure 

- User-interface behaviour 

The frontend should provide the user experience, but the backend must remain the authoritative source for: 

- Permissions 

- Priority 

- Queue position 

- Ticket state 

- Assignment 

- Transfers 

- Feedback validity 

- Business rules 

- Security decisions 

The production environment should be treated as an infrastructure concern rather than embedded into application business logic. 

The application must remain portable enough to operate within the company's current dedicated-server/cPanel environment while allowing future deployment changes without major architectural redesign. 

This version is now aligned with the revised **Business Context** . The next document should be `03-business-rules.md` , where we preserve the authoritative behavioural rules and make sure there are no remaining assumptions that conflict with the new deployment model. 

