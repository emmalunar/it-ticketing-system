# **IT Ticketing System — Business Context** 

# **1. Document Purpose** 

This document defines the organisational context, business problem, purpose, users, operating environment, goals, constraints, and overall context of the Internal IT Ticketing System. 

It provides the foundation for the product and technical requirements that follow. 

This document describes **why the system is being developed and the business environment in which it will operate** . Detailed system behaviour is defined in the subsequent project documents. 

# **2. Business Context** 

The organisation's IT department provides technical support to employees across different offices or stations. IT-related problems currently need to be received, communicated, assigned, tracked, resolved, and followed up by the IT support team. 

As the number of users, IT issues, and operating locations increases, relying on informal communication and manual tracking can make it difficult to maintain a consistent support process. 

The proposed IT Ticketing System will provide a central platform through which employees can report IT problems and the IT department can manage those problems from initial submission through resolution and closure. 

The system will primarily operate on the organisation's internal network (intranet). 

# **3. Business Problem** 

The organisation needs a structured way to manage internal IT support requests. 

Without a central ticketing system, common challenges can include: 

- Difficulty tracking reported IT problems. 

- Limited visibility into the current status of a support request. 

- Unclear ownership of tickets. 

- Difficulty routing problems to the appropriate IT support station. 

- Delays in responding to unattended requests. 

- Difficulty distinguishing urgent requests from normal requests. 

- Limited visibility into the number of requests waiting for support. 

- Difficulty maintaining a history of actions taken on a ticket. 

- Limited separation between communication with employees and private communication between IT personnel. 

- Difficulty measuring IT support activity and performance. 

- Limited ability to collect user feedback after a problem has been resolved. 

The system is intended to address these operational challenges by introducing a centralised and traceable support workflow. 

# **4. Business Purpose** 

The primary purpose of the system is to provide a centralised IT support platform that enables the organisation to: 

1. Receive IT problems from employees. 

2. Route problems to the appropriate IT station. 

3. Prioritise requests according to the user's priority level. 

4. Provide IT agents with a structured queue of pending work. 

5. Allow agents to claim, assign, transfer, and manage tickets. 

6. Allow users and IT agents to communicate through the ticket. 

7. Allow IT agents to communicate privately through internal notes/messages. 

8. Notify IT agents when urgent or unattended tickets require attention. 

9. Track the complete lifecycle of each ticket. 

- 10.Collect user feedback after resolution. 

- 11.Automatically reopen tickets when users indicate that a problem has not been satisfactorily resolved. 

- 12.Maintain historical records and audit trails. 

13.Provide administrative management and reporting capabilities. 

# **5. Operating Environment** 

The system is intended primarily for internal organisational use. 

The initial deployment environment will be an **intranet application** , with employees and IT personnel accessing the system through the organisation's internal network. 

The proposed deployment architecture will use: 

- Ubuntu Server LTS 

- Docker Compose 

- Nginx 

- Next.js 

- Django 

- Django REST Framework 

- PostgreSQL 

- Redis 

- Celery 

- Django Channels 

- MinIO 

- Company SMTP infrastructure 

The detailed technical architecture and deployment configuration are defined in: 

- 08-system-architecture.md 

- 12-deployment.md 

# **6. Initial Operating Locations** 

The system initially supports the following IT support stations: 

# **6.1 Head Office** 

The Head Office is one of the initial stations supported by the IT department. 

# **6.2 Babylove - Tesano** 

Babylove - Tesano is the second initial IT support station. 

The system must be designed so that additional stations can be added later without requiring changes to the application's core business logic. 

# **7. Station-Based Support Model** 

IT support is organised around stations. 

When an employee creates a ticket, the employee selects the station where the problem is located. 

The selected station determines the ticket's initial support scope. 

Initially: 

- Agents assigned to the selected station can see the ticket. 

- Agents at other stations should not normally see the ticket. 

- An authorised agent may transfer the ticket to another station when the issue requires support from that location or team. 

- After transfer, the receiving station becomes the ticket's current support station. 

The system must support the possibility that an IT agent may eventually be assigned to more than one station. 

# **8. Users of the System** 

The system has three primary application roles: 

# **8.1 User** 

A user is an employee who reports an IT problem. 

Users can: 

- Create tickets. 

- Select the relevant station. 

- Select a problem type. 

- Provide a description of the problem. 

- View their own tickets. 

- Communicate with IT agents through tickets. 

- Receive ticket updates and notifications. 

- View applicable queue information. 

- Respond to support requests. 

- Receive resolution feedback requests. 

- Submit positive or negative feedback. 

Users cannot access private internal communication between IT agents. 

# **8.2 Agent** 

An agent is an IT support employee responsible for handling tickets. Agents can: 

- View tickets within their authorised station scope. 

- Claim tickets. 

- Accept responsibility for tickets. 

- Assign or reassign tickets where permitted. 

- Transfer tickets to another station. 

- Communicate with users. 

- Add internal notes/messages visible only to authorised IT personnel. 

- Use predefined response notices. 

- Change ticket status. 

- Resolve tickets. 

- Receive notifications and escalations. 

- View relevant queue information. 

Agent access is controlled by station assignment and role permissions. 

# **8.3 Administrator** 

An administrator manages the ticketing system and its configuration. 

Administrators can: 

- Manage users. 

- Manage agents. 

- Manage stations. 

- Assign agents to stations. 

- Manage problem categories and problem types. 

- Manage response templates. 

- Manage consultant accounts. 

- View system-wide tickets. 

- Access reports. 

- Review audit records. 

- Perform authorised administrative interventions. 

Administrative permissions are separate from user priority levels. 

# **9. User Priority Model** 

Users are assigned one of three priority levels: 

|**Priori**|**ty User Group**|**General Handling**|
|---|---|---|
|P1|CEOs / Executives|Immediate handling; bypasses normal queue|
|P2|Managers /<br>Consultants|Queue-based handling with 10-minute unattended<br>escalation|
|P3|Standard users|Queue-based handling with 60-minute unattended<br>escalation|



Priority is associated with the user account. 

Users should not manually select their own priority when creating a ticket. 

The backend must determine the ticket priority from the authenticated user's configured priority level. 

# **10. IT Support Workflow** 

The intended business workflow is: 

Employee reports problem 

↓ 

Ticket is created 

↓ 

Station is identified 

↓ 

Priority is determined 

↓ 

Ticket enters appropriate handling path 

↓ 

IT agent claims/accepts responsibility 

↓ 

Agent communicates with user 

↓ 

Agent investigates and resolves problem 

↓ 

Ticket is marked resolved 

↓ 

User receives feedback request 

↓ 

Positive feedback → Ticket closed 

Negative feedback → Ticket reopened 

P1 tickets follow the same overall lifecycle but bypass the normal P2/P3 queue. 

Detailed ticket states and transitions are defined in: 

05-ticket-workflow.md 

# **11. Queue and Priority Context** 

The system must provide a station-specific queue for tickets that are waiting for IT support. 

P1 tickets do not participate in the normal queue. 

P2 and P3 tickets enter the queue. 

Within a station: 

- P2 tickets are handled ahead of P3 tickets. 

- Tickets of the same priority follow a first-in, first-out order. 

- Claimed or assigned tickets are removed from the waiting queue. 

- Tickets that are waiting for the user are not considered waiting for an agent. 

- Resolved and closed tickets are not part of the active queue. 

- Reopened tickets return to the appropriate active queue. 

Users with P2 or P3 priority should be able to see the applicable number of tickets ahead of their ticket. 

The queue is dynamic rather than a permanently stored position. 

Detailed queue rules are defined in: 

06-queue-and-priority-system.md 

# **12. Unattended Ticket Context** 

The organisation requires escalation when tickets remain unattended. 

For this system, an **unattended ticket** is a ticket that is eligible for agent handling but has not yet been claimed, accepted, or assigned to an agent. 

The initial escalation thresholds are: 

- **P1:** immediate notification. 

- **P2:** notification after 10 minutes without agent attention. 

- **P3:** notification after 60 minutes without agent attention. 

Once an agent claims or is assigned responsibility for a ticket, unattended escalation stops even if the ticket remains unresolved. 

This distinction allows the system to separate response/attention time from the total time required to resolve a problem. 

# **13. Communication Context** 

The system must support two distinct forms of communication. 

# **13.1 User-Agent Communication** 

This is communication between the employee who reported the ticket and the IT support agent handling it. 

Messages in this channel may include: 

- Questions from the agent. 

- Responses from the user. 

- Troubleshooting instructions. 

- Requests for additional information. 

- Updates about the progress of the ticket. 

This communication is part of the ticket record. 

# **13.2 Internal Agent Communication** 

IT agents must also be able to communicate privately about tickets. 

Examples include: 

- Technical observations. 

- Internal troubleshooting discussions. 

- Handover information. 

- Recommendations to another agent. 

- Internal investigation notes. 

These messages must remain private to authorised IT personnel and must never be exposed to the user. 

The application must therefore maintain a clear distinction between user-visible messages and internal messages. 

# **14. Predefined Agent Notices** 

Agents may need to send common operational messages quickly. 

The initial predefined notices include: 

- **“I am coming”** 

- **“Please bring your PC”** 

These notices should be manageable through system configuration so that administrators can add, modify, deactivate, or maintain additional templates without changing application code. 

# **15. Ticket Resolution and Feedback** 

When an agent resolves a ticket, the system sends the user a feedback request. 

The feedback process allows the user to indicate whether the problem was satisfactorily resolved. 

The initial outcomes are: 

# **Positive Feedback** 

A positive response results in the ticket being closed. 

# **Negative Feedback** 

A negative response results in the ticket being reopened for further support. 

The feedback mechanism uses a secure, one-time token. 

The feedback link: 

- Has a defined expiration time. 

- Expires at **5:00 PM GMT on the applicable working day** . 

- If resolution occurs after 5:00 PM GMT, the feedback deadline moves to 5:00 PM GMT on the next applicable working day. 

- Becomes immediately invalid after successful submission. 

- Cannot be reused after successful submission. 

The initial working-day definition is Monday to Friday, with the ability to support configurable holidays/non-working days later. 

# **16. Consultant Accounts** 

Consultants may receive temporary system accounts. 

A consultant account has an expiration date. 

When the expiration date is reached: 

- The account is automatically deactivated. 

- The consultant can no longer authenticate or use the application. 

- Historical tickets, messages, assignments, feedback, and audit records associated with the account remain available according to system retention rules. 

Account expiration must therefore affect current access without destroying historical records. 

# **17. Problem Classification** 

When creating a ticket, the user selects the relevant problem type and provides a brief description. 

The initial problem catalogue is: 

# **Support** 

- SAP 

- Microsoft Excel 

- Microsoft Word 

- HR System 

- Other Support 

# **Laptop** 

- Faulty Laptop (Software) 

- Faulty Laptop (Hardware) 

# **Other Categories** 

- Laptop Accessories 

- Printer 

- Scanner 

- Monitor 

Problem categories and problem types must be database/configuration-driven. 

Administrators should be able to: 

- Add problem types. 

- Modify problem types. 

- Deactivate problem types. 

- Organise problem types into categories. 

- Control their display order. 

The application should not require source-code changes for normal problem-catalogue administration. 

# **18. Ticket Identification** 

Each ticket should have: 

1. A system-generated database identifier, preferably a UUID. 

# 2. A human-readable ticket number. 

The recommended ticket-number format is: 

IT-YYYY-XXXXXX 

Example: 

IT-2026-000125 

The human-readable ticket number is intended for communication, searching, reporting, and user reference. 

The database identifier remains the technical primary key. 

# **19. Record Keeping and Accountability** 

Every ticket should maintain a history of relevant actions. 

The system should be able to establish: 

- Who created a ticket. 

- When it was created. 

- Which station it was created for. 

- Its priority. 

- Who claimed or was assigned the ticket. 

- When ownership changed. 

- Whether it was transferred. 

- Which stations were involved. 

- Messages exchanged. 

- Internal notes. 

- Status changes. 

- Escalations. 

- Resolution information. 

- Feedback submitted. 

- Reopening events. 

- Closure. 

- Relevant administrative actions. 

Audit information is important for operational accountability, reporting, troubleshooting, and future review. 

Tickets should not normally be physically deleted during ordinary operations. 

# **20. Reporting and Management Context** 

The system should provide management visibility into IT support activity. 

Reports should be capable of providing information such as: 

- Number of tickets received. 

- Number of active tickets. 

- Number of resolved tickets. 

- Number of closed tickets. 

- Number of reopened tickets. 

- Ticket volumes by station. 

- Ticket volumes by priority. 

- Ticket volumes by problem type. 

- Agent activity. 

- Escalation activity. 

- Response and resolution timing. 

- Feedback results. 

- Ticket trends over time. 

Reporting must respect the user's authorisation scope. 

Administrators may have system-wide reporting access, while agents should only receive reports or operational information permitted by their role and station scope. 

# **21. Security and Confidentiality Context** 

The system will contain internal organisational information and therefore requires appropriate access control. 

Important business-security requirements include: 

- Users should only access their own tickets. 

- Agents should only access tickets within their authorised station scope. 

- Administrators may access system-wide information according to their privileges. 

- Internal agent communication must remain private. 

- Priority must not be controlled by the client. 

- Ticket ownership and status changes must be validated by the backend. 

- WebSocket access must follow the same authorisation rules as API access. 

- Attachments must follow the visibility rules of the associated ticket/message. 

- Sensitive actions must be auditable. 

- Inactive and expired accounts must not retain active access. 

- The system must protect against unauthorised access to tickets and organisational information. 

Detailed security requirements are defined in: 

10-security.md 

# **22. Data and Infrastructure Context** 

The application will use a central server-side architecture. 

The authoritative application database will be PostgreSQL. 

The system should not use separate local databases on individual employee computers. 

The main data and infrastructure components are: 

**Component Business/Technical Purpose** 

PostgreSQL Authoritative application data 

|**Component**|**Business/Technical Purpose**|
|---|---|
|Redis|Queue/cache and task coordination|
|Celery|Background jobs and scheduled processing|
|MinIO|Ticket attachment storage|
|Django|Core application and business logic|
|Django REST Framew|ork API|
|Django Channels|Real-time communication|
|Next.js|User interface|
|Nginx|Reverse proxy and web entry point|
|SMTP|Organisational email delivery|



# **23. Backup and Continuity Context** 

Ticket records represent organisational support history and should be protected against data loss. 

The system therefore requires: 

- Automated database backups. 

- Backup of relevant attachment storage. 

- Storage of backups separately from the primary application data. 

- Monitoring of backup jobs. 

- Restoration testing. 

- Documented recovery procedures. 

The objective is not simply to create backups but to ensure that the organisation can recover the system and its data when required. 

Detailed deployment, backup, and recovery requirements are defined in: 12-deployment.md 

# **24. Project Goals** 

The system should achieve the following business goals: 

# **Goal 1 — Centralise IT Support** 

Provide one central location for employees and IT personnel to manage support requests. 

# **Goal 2 — Improve Ticket Visibility** 

Allow users and IT personnel to understand the current state and ownership of support requests. 

# **Goal 3 — Improve Response Management** 

Use priority levels, station-specific queues, and unattended-ticket escalation to structure response handling. 

# **Goal 4 — Improve Accountability** 

Maintain an auditable history of important ticket activities and ownership changes. 

# **Goal 5 — Improve Communication** 

Provide a structured communication channel between users and IT personnel while maintaining private internal IT communication. 

# **Goal 6 — Improve Resolution Follow-up** 

Collect feedback after resolution and automatically reopen tickets when users indicate that further assistance is required. 

# **Goal 7 — Support Multiple Stations** 

Provide station-based routing and access control while allowing the organisation to add more stations as it grows. 

# **Goal 8 — Support Management Decisions** 

Provide reliable reporting on IT support activity, workload, response, resolution, and feedback. 

# **Goal 9 — Provide a Maintainable Foundation** 

Build the system so that common organisational changes—such as adding stations, users, problem types, or response templates—can be managed through configuration rather than unnecessary code changes. 

# **25. Initial Scope** 

The initial system is focused on internal IT support ticket management. 

The MVP includes: 

- User authentication. 

- User and agent roles. 

- Priority levels. 

- Station-based ticket routing. 

- Configurable problem types. 

- Ticket creation. 

- Ticket queues. 

- Ticket claiming and assignment. 

- Ticket transfers. 

- User-agent communication. 

- Internal agent communication. 

- Predefined response notices. 

- Ticket status management. 

- P1 immediate notifications. 

- P2 and P3 unattended escalation. 

- Email and in-app notifications. 

- Real-time updates. 

- Ticket resolution. 

- Feedback. 

- Automatic reopening after negative feedback. 

- Ticket closure. 

- Consultant account expiry. 

- Attachments. 

- Audit logging. 

- Administration. 

- Search. 

- Reporting. 

- Backup and recovery capability. 

# **26. Future Expansion** 

The system should be designed so that additional capabilities can be introduced later without requiring a complete rewrite. 

Potential future features include: 

- Active Directory/LDAP integration. 

- Single Sign-On (SSO). 

- Advanced analytics. 

- Asset management. 

- Knowledge base. 

- AI-assisted support. 

- Mobile application. 

- Enterprise system integrations. 

- Additional organisational stations. 

- Configurable organisational holidays and non-working days. 

These features are outside the initial MVP unless they are explicitly added through the project's change process. 

# **27. Key Business Constraints** 

The system must operate within the following constraints: 

1. It is primarily an internal organisational application. 

2. The initial deployment is intended for the intranet. 

3. The system must support multiple stations. 

4. Ticket visibility must be controlled by station and role. 

5. P1, P2, and P3 handling must follow defined business rules. 

6. Users must not be able to manipulate their own priority. 

7. Internal agent communication must remain confidential. 

8. Ticket history must be retained. 

9. Critical state-changing operations must be safe against concurrent actions. 

- 10.Background escalation and notification processes must not create duplicate events. 

- 11.Administrative configuration should be possible without modifying source code where the requirement is configuration-driven. 

- 12.Security controls must be enforced on the backend. 

- 13.The system must be deployable using the approved technology stack. 

- 14.The application must remain maintainable as stations, agents, and ticket volume increase. 

# **28. Business Success Criteria** 

The system will be considered successful when the IT department can use it as the central mechanism for internal IT support and can reliably: 

- Receive employee IT problems. 

- Route them to the correct station. 

- Apply the correct priority automatically. 

- Present P2/P3 tickets in the correct queue order. 

- Immediately notify the relevant agents of P1 tickets. 

- Escalate unattended P2/P3 tickets according to the defined thresholds. 

- Allow agents to take ownership of tickets safely. 

- Transfer tickets between stations when necessary. 

- Communicate with users while keeping internal discussions private. 

- Resolve tickets and collect user feedback. 

- Reopen tickets following negative feedback. 

- Close tickets following positive feedback. 

- Maintain an accurate history of ticket activity. 

- Manage system configuration through authorised administrative functions. 

- Produce useful operational reports. 

- Protect organisational data through appropriate security, backup, and accesscontrol mechanisms. 

# **29. Relationship to Other Documents** 

This document establishes the business context and should be read together with the remaining project documentation. 

The documentation hierarchy is: 

01 Business Context 

↓ 

02 Product Requirements 

↓ 

03 Business Rules 

↓ 

# 04 User Roles & Permissions 

↓ 

05 Ticket Workflow 

↓ 

# 06 Queue & Priority System 

↓ 

07 Database Design 

↓ 

08 System Architecture 

↓ 

09 API Specification 

↓ 

10 Security 

↓ 

11 Notification & SLA 

↓ 

12 Deployment 

↓ 

13 Development Roadmap 

↓ 

14 Claude Code Instructions 

Where a later document defines more detailed behaviour, that document provides the detailed specification for its subject area while remaining consistent with the business context established here. 

# **30. Implementation Principle** 

The system should solve the organisation's actual IT support workflow rather than introduce unnecessary complexity. 

The implementation must therefore: 

- Follow the documented business requirements. 

- Preserve the defined ticket lifecycle. 

- Enforce business rules on the backend. 

- Keep current state separate from historical records where appropriate. 

- Maintain clear separation between user-visible and internal communication. 

- Use configuration for organisational data that is expected to change. 

- Avoid unnecessary features outside the approved scope. 

- Preserve maintainability and security as the system develops. 

Any ambiguity or conflict discovered during implementation should be identified and resolved against the project documentation before introducing new business behaviour. The project must not silently invent business rules that have not been approved. 

