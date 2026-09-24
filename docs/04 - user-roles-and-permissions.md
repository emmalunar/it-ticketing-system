Next is `04-user-roles-and-permissions.md` . This version makes the access-control model explicit: **role, priority, and station scope are separate** , and every permission is enforced on the backend. 

04-user-roles-and-permissions.md 

# **IT Ticketing System — User Roles and Permissions** 

## **1. Document Purpose** 

This document defines the user roles, priority levels, station scope, permissions, and access-control rules for the IT Ticketing System. 

The system uses three separate concepts: 

1. **Role** — what a user is authorised to do. 

2. **Priority level** — how the user's tickets are handled. 

3. **Station scope** — which station-related tickets an agent is authorised to access. 

These concepts must not be treated as interchangeable. 

For example, a P1 user does not automatically become an administrator, and an agent assigned to a station does not automatically gain access to every station. 

# **2. Access-Control Principles** 

The system must follow these principles: 

- Deny access by default. 

- Grant only the permissions required for the user's role and scope. 

- Enforce authorization on the backend. 

- Do not rely on frontend visibility controls for security. 

- Apply object-level authorization to tickets and messages. 

- Apply the same authorization principles to REST APIs and WebSockets. Maintain audit records for important permission and administrative actions. Keep role, priority, and station scope separate. 

# **3. Application Roles** 

The initial application roles are: 

```
USER
AGENT
ADMIN
```

These roles define the user's functional permissions. 

# **4. USER Role** 

The `USER` role represents an employee who uses the system to request IT support. 

A USER may: 

- Log in 

- View their own profile information 

- Create tickets 

- View their own tickets 

- View relevant ticket status 

- View applicable queue information 

- Send user-visible messages on their own tickets 

- Read user-visible agent responses on their own tickets 

- Upload permitted attachments to their own tickets 

- Respond to agent requests 

- Receive notifications 

- Submit feedback for their resolved tickets 

A USER may not: 

- View another user's tickets 

- View internal agent messages 

- Claim tickets 

- Assign tickets 

- Transfer tickets 

- Modify another user's ticket 

- Change ticket priority 

- Access administrative functions 

- Manage stations 

- Manage problem types 

- Manage response templates 

- View unrestricted audit records 

# **5. AGENT Role** 

The `AGENT` role represents an IT support staff member responsible for handling tickets. 

An AGENT may perform support actions only within their authorised scope. 

An AGENT may: 

- View tickets within authorised station scope 

- View their assigned tickets 

- Claim eligible tickets 

- Accept responsibility for tickets 

- Communicate with users 

- Add internal notes/messages 

- Send predefined notices 

- Upload permitted attachments 

- Assign tickets where authorised 

- Reassign tickets where authorised 

- Transfer tickets where authorised 

- Place tickets in `WAITING_USER` 

- Resume tickets 

- Resolve tickets 

- Receive relevant notifications 

- Search tickets within authorised scope 

- View applicable queue information 

An AGENT may not automatically: 

- Access every station 

- Access every ticket 

- Change another user's priority 

- Manage system-wide configuration 

- Manage users unless separately authorised 

- Modify audit records 

- Access tickets outside their authorised scope merely by knowing the ticket number 

# **6. ADMIN Role** 

The `ADMIN` role provides system administration capabilities. 

#### An ADMIN may: 

- View tickets across authorised system scope 

- Manage users 

- Manage roles where permitted 

- Manage priority levels 

- Manage stations 

- Manage agent-station assignments 

- Manage problem categories 

- Manage problem types 

- Manage response templates 

- Manage consultant expiration 

- View system-wide reports 

- View audit records 

- Perform authorised administrative ticket interventions 

- Configure supported system settings 

- Activate/deactivate configurable records 

Administrative actions must be audited. 

Administrator access must still follow security controls. Being an administrator does not justify unrestricted access to secrets, infrastructure credentials, or unrelated system resources. 

# **7. Role and Priority Separation** 

Role and priority must remain independent. 

For example: 

|**User**|**Role**|**Priority**|
|---|---|---|
|Executive|USER|P1|
|Manager|USER|P2|
|Standard employee|USER|P3|
|IT support employee|AGENT|Organisation-configured|
|System administrator|ADMIN|Organisation-configured|



The exact priority assigned to individual users is configurable by authorised administrators. 

A user's priority determines the handling priority of tickets they create. 

It does not determine what actions they are authorised to perform. 

# **8. Priority Levels** 

The system supports: 

```
P1
```

```
P2
```

```
P3
```

## **P1** 

Normally used for CEOs and designated executives. 

P1 tickets: 

- Receive immediate handling. Notify agents at the selected station immediately. Bypass the normal queue. Do not receive a normal queue position. 

## **P2** 

Normally used for managers and configured consultants. 

P2 tickets: 

- Enter the station queue. Are handled ahead of P3 tickets. Trigger escalation after 10 minutes if unattended. 

## **P3** 

Normally used for standard users. 

P3 tickets: 

Enter the station queue. Follow P2 tickets in queue ordering. Trigger escalation after 60 minutes if unattended. 

# **9. Priority Does Not Grant Permissions** 

Priority must never be used as an authorization mechanism. 

For example: 

- A P1 user cannot access another employee's ticket simply because they are P1. 

- A P2 user cannot view internal agent messages. 

- A P3 user cannot access administrative functions. 

- An agent's priority level does not determine which stations the agent can access. 

Authorization is determined separately through role and scope. 

# **10. Station Scope** 

Station scope determines which station-related tickets an agent can access. 

#### The initial stations are: 

- Head Office 

- Babylove - Tesano 

An agent may be assigned to one or more stations. 

The system must therefore support a many-to-many relationship between: 

```
Agents ↔ Stations
```

# **11. Agent Station Assignment** 

An agent-station assignment should contain information such as: 

- Agent 

- Station 

- Active/inactive status 

- Assignment start date 

- Assignment end date where applicable 

- Created/assigned timestamp 

An inactive assignment must not grant current station access. 

Historical assignments should remain available for audit and reporting purposes. 

# **12. Single-Station Agent** 

If an agent is assigned only to: 

`Head Office` the agent may access eligible Head Office tickets. The agent must not automatically access: `Babylove - Tesano` tickets. 

# **13. Multi-Station Agent** 

If an agent is assigned to: `Head Office Babylove - Tesano` the agent may access eligible tickets at both stations. 

The agent's access remains subject to: 

Ticket status Role permissions Assignment rules Message visibility Other applicable authorization controls 

# **14. Station Transfer and Access** 

When a ticket is transferred from one station to another: `Station A → Station B` 

the receiving station becomes the ticket's current station. 

Agents assigned to Station B become eligible to access the ticket according to normal rules. 

Agents who only have access to Station A should no longer have access through Station A station scope. 

Historical transfer information must remain visible to authorised users. 

# **15. User Ticket Ownership** 

A standard USER may access their own tickets. 

This includes tickets that have been: 

- Created 

- Queued 

- Assigned Transferred 

- Resolved 

- Reopened Closed 

The user's ability to view the ticket does not depend on the current station. 

However, users must not gain access to other users' tickets simply because those tickets belong to the same station. 

# **16. Agent Ticket Access** 

An agent may access a ticket when the agent has a valid authorization path. 

For ordinary station-based support, the primary authorization path is: 

```
AGENT role
+
Active station assignment
+
Ticket belongs to that station
```

Additional access may be granted where explicitly supported by the application, such as access to a ticket currently assigned to the agent. 

The implementation must not create unrestricted ticket access merely because an agent knows a ticket ID or ticket number. 

# **17. Assigned Ticket Access** 

An agent assigned to a ticket must retain the access required to handle that ticket. Assignment does not automatically grant broader access to all tickets in the system. 

If a ticket is transferred to another station or agent, access must be recalculated according to the current authorization state. 

# **18. Internal Message Permissions** 

Internal messages are restricted to authorised internal users. 

They must not be visible to: 

- Standard users 

- The ticket owner 

- External users 

- Unauthorised agents 

An agent may view internal messages only when the agent is authorised to access the relevant ticket. 

Administrators may access internal messages where their system permissions permit it. 

# **19. User-Visible Messages** 

User-visible messages may be accessed by: 

- The ticket owner 

- Authorised agents handling the ticket 

- Authorised administrators 

The system must ensure that an internal message cannot accidentally be returned through a user-facing API endpoint. 

# **20. Attachment Permissions** 

Attachment access must follow the visibility of the associated ticket/message. 

A user may access attachments associated with their own user-visible ticket content. 

An agent may access attachments where the agent is authorised to access the associated ticket. 

Internal attachments must not be exposed to users. 

Attachment download authorization must be checked on every protected download request. 

# **21. Ticket Claim Permissions** 

An AGENT may claim a ticket only when: 

- The agent is authenticated. 

- The agent has appropriate station access. 

- The ticket is eligible for claiming. 

- The ticket has not already been claimed or assigned. 

- The ticket is in an appropriate state. 

The claim operation must be atomic. 

A USER may never claim a ticket. 

An ADMIN may perform authorised administrative assignment/intervention where supported. 

# **22. Assignment Permissions** 

Assignment functionality must be restricted to authorised internal users. 

At minimum: 

- Agents may claim eligible tickets. 

- Authorised agents may assign or reassign tickets according to their permissions. Administrators may perform administrative assignments. 

- Users cannot assign tickets. 

Assignment operations must be validated against current ticket state and station authorization. 

# **23. Transfer Permissions** 

Transfers may be performed by authorised agents and administrators. 

An agent must not be able to use transfer functionality to bypass station restrictions or gain unrestricted access to unrelated tickets. 

A transfer must: 

1. Validate the current agent's authority. 

2. Validate the target station. 

3. Validate the target agent where one is specified. 

4. Update the current ticket state. 

5. Record transfer history. 

6. Update applicable access/queue behaviour. 

7. Generate appropriate notifications. 

# **24. Ticket Status Permissions** 

The ability to change a ticket status depends on role and the current ticket state. 

#### Typical permissions include: 

|**Action**|**USER**|**AGENT**|**ADMIN**|
|---|---|---|---|
|Create ticket|✓|✓where applicable|✓|
|Claim ticket|✗|✓|✓|
|Assign ticket|✗|Authorised|✓|
|Transfer ticket|✗|Authorised|✓|
|Wait for user|✗|✓|✓|
|Resume ticket|✗|✓|✓|
|Resolve ticket|✗|✓|✓|



Reopen ticket Limited by feedback flow Authorised ✓ Close ticket Through feedback process Authorised where applicable ✓ 

The backend must validate each transition. 

The table represents the intended permission model and does not override more specific workflow rules. 

# **25. Feedback Permissions** 

A user may submit feedback only for an applicable ticket resolution associated with that user. 

A valid feedback token is required. 

The user must not be able to: 

- Submit feedback for another user's ticket 

- Change another user's feedback 

- Reuse an already-consumed token Bypass token expiration 

Feedback submission must be transaction-safe. 

# **26. Administration Permissions** 

Only authorised administrators may manage system configuration. 

Administrative configuration includes: 

- Users 

- Roles 

- Priority levels 

- Stations 

- Agent-station assignments 

- Problem categories 

- Problem types 

- Response templates 

- Consultant expiration 

Relevant system settings 

All significant administrative changes must be audited. 

# **27. User Management Permissions** 

Administrators may: 

- Create users 

- Update user information 

- Activate users 

- Deactivate users 

- Configure role 

- Configure priority 

- Configure consultant expiry 

- Manage agent station assignments 

Normal users and agents must not be able to modify their own authorization level. A user must not be able to promote themselves from: 

```
USER → AGENT
```

or: 

```
AGENT → ADMIN
```

through any client-side or API manipulation. 

# **28. Consultant Permissions** 

A consultant is normally represented as a temporary USER account. 

A consultant may: 

- Log in while active 

- Create tickets 

- View their own tickets 

- Communicate with agents Receive notifications 

- Provide feedback 

Their priority may be configured, normally P2 where applicable. 

A consultant must not receive agent or administrator permissions merely because they have P2 priority. 

# **29. Account Expiration** 

When a consultant reaches their expiration date: 

- The account becomes inactive. 

- Authentication is denied. 

- Existing tickets remain. 

- Historical messages remain. 

- Audit records remain. 

- Previous assignments or interactions remain available according to authorization rules. 

Account expiration must not physically delete historical records. 

# **30. Search Permissions** 

Search results must use the same authorization rules as normal ticket access. 

A USER should normally search only their own accessible tickets. 

An AGENT should search tickets within their authorised support scope. 

An ADMIN may search across the broader system according to administrative permissions. 

Search must not become an indirect mechanism for bypassing station-based access. 

# **31. Notification Permissions** 

Notifications must only be delivered to authorised recipients. 

Examples: 

### **P1 Ticket** 

Notification goes to authorised agents handling the selected station. 

### **P2/P3 Escalation** 

Notification goes to the appropriate station's authorised agents according to the escalation rules. 

### **User Message** 

Notification goes to the appropriate ticket participants. 

### **Internal Message** 

Notification must not expose the content of an internal message to a user. 

# **32. WebSocket Permissions** 

WebSocket connections must enforce the same authorization principles as REST API access. 

A client must not be able to subscribe to: 

- Another user's private notifications 

- An unauthorized ticket 

- An unauthorized station queue 

- Internal messages outside the user's scope 

The server must validate access when establishing subscriptions and when delivering relevant events. 

# **33. API Authorization** 

Every protected API endpoint must perform appropriate authorization. 

The backend must validate: 

1. Authentication 

2. Role 

3. Station scope where applicable 

4. Ticket ownership or assignment where applicable 

5. Current ticket state 

6. Requested operation 

#### 7. Object-level access 

The API must not assume that a request is safe because it originated from the application's frontend. 

# **34. Object-Level Authorization** 

Authorization must be applied to individual objects. 

For example, knowing: 

```
/tickets/{id}
```

must not automatically provide access to that ticket. 

The backend must determine whether the requesting user is authorized to access the specific ticket. 

The same principle applies to: 

- Messages 

- Attachments 

- Notifications 

- Audit records 

- Reports 

- User records 

- Station records 

- Configuration records 

# **35. Administrative Visibility** 

Administrators have broader visibility than normal users and agents. 

However, administrative visibility should still be implemented through explicit permissions rather than an assumption that administrators can bypass all application security. 

Sensitive infrastructure credentials, secrets, and unrelated server resources are outside normal ticketing-system permissions. 

# **36. Audit Requirements for Permission Changes** 

The following actions must be audited: 

- Role changes 

- Priority changes 

- Station assignments 

- Station assignment removals 

- Account activation 

- Account deactivation 

- Consultant expiration changes 

- Administrative privilege changes 

- Configuration changes affecting authorization 

Audit information should include: 

- Actor 

- Affected account/object 

- Action 

- Previous value 

- New value 

- Timestamp 

- Relevant metadata 

# **37. Least-Privilege Principle** 

Users should receive only the permissions required to perform their responsibilities. 

Examples: 

A standard user should not receive: 

- Agent permissions 

- Administrative permissions 

- Internal message access 

An agent should not automatically receive: 

- System-wide administrative permissions 

- Access to unrelated stations 

- User-management permissions 

An administrator should receive only the administrative capabilities required by the configured role. 

# **38. Backend Enforcement Principle** 

The frontend may: 

- Hide unavailable buttons 

- Disable unavailable controls 

- Display only relevant navigation 

- Show station-specific information 

However, these are usability features, not security controls. 

The backend must independently reject unauthorized operations. 

For example, hiding an "Assign" button from a USER is not sufficient. 

If the USER manually submits the assignment API request, the backend must reject it. 

# **39. Future Active Directory / LDAP Integration** 

The company uses Windows Active Directory. 

AD/LDAP integration is not required for the initial MVP unless explicitly added to scope. 

The current authorization model should nevertheless remain compatible with future directory integration. 

Future integration may provide: 

- User authentication 

- User provisioning 

- Account synchronization 

- Group-based role mapping 

- Account status synchronization 

However, external directory membership must not automatically bypass the application's authorization model. 

The application should retain its own authorization concepts for: 

- Role 

- Priority 

- Station scope 

Application-specific permissions 

# **40. Permission Model** 

The recommended conceptual model is: 

```
USER ACCOUNT
    │
    ├── ROLE
    │     ├── USER
    │     ├── AGENT
    │     └── ADMIN
    │
    ├── PRIORITY
    │     ├── P1
    │     ├── P2
    │     └── P3
    │
    └── STATION SCOPE
          ├── Station A
          ├── Station B
          └── Additional stations
```

These dimensions should be evaluated independently. 

# **41. Authorization Decision Model** 

For a protected operation, the backend should conceptually evaluate: 

```
Is the user authenticated?
       ↓
Does the user's role permit the operation?
       ↓
Does the user have the required station/object scope?
       ↓
```

```
Is the requested object accessible?
```

```
       ↓
```

```
Is the current ticket state compatible with the operation?
```

```
       ↓
       ↓
ALLOW
```

```
Is the requested action permitted?
```

If any required authorization condition fails: 

```
DENY
```

# **42. Access-Control Examples** 

## **Example 1 — Standard User** 

A P3 employee at Head Office creates a ticket. 

The employee can: 

View their ticket. 

Communicate with the agent. 

View its status. 

- Submit feedback. 

The employee cannot: 

View another employee's ticket. 

View internal notes. 

Claim the ticket. 

Change its priority. 

## **Example 2 — P1 Executive** 

A CEO creates a P1 ticket for Head Office. 

The CEO receives P1 handling because of their priority. 

The CEO does not receive: 

Agent permissions 

Administrative permissions 

Access to other employees' tickets 

Priority changes ticket handling, not authorization. 

## **Example 3 — Head Office Agent** 

An agent is assigned only to Head Office. 

The agent can handle eligible Head Office tickets. 

The agent cannot automatically browse Babylove - Tesano tickets. 

## **Example 4 — Multi-Station Agent** 

An agent is assigned to: 

Head Office 

Babylove - Tesano 

The agent may handle tickets at both stations. 

The agent still cannot access restricted administrative functions unless their role permits them. 

## **Example 5 — Transferred Ticket** 

A ticket moves from Head Office to Babylove - Tesano. 

An agent who only has Head Office access should no longer gain ordinary stationbased access through Head Office. 

An authorised Babylove - Tesano agent becomes eligible to handle the ticket. 

## **Example 6 — Internal Message** 

An agent adds: 

```
Internal note
```

The note is visible to authorised internal users. 

The ticket owner must not receive the internal note through the user-facing interface or API. 

## **Example 7 — Expired Consultant** 

A consultant's expiration date is reached. 

The account becomes inactive. 

The consultant cannot log in. 

The consultant's previous tickets remain in the system. 

# **43. Permission Testing Requirements** 

The implementation must include authorization tests covering at least: 

### **USER** 

- Can create a ticket. 

- Can view own ticket. 

- Cannot view another user's ticket. 

- Cannot claim a ticket. 

- Cannot assign a ticket. 

- Cannot transfer a ticket. 

- Cannot view internal messages. 

- Cannot access administration endpoints. 

- Cannot change priority. 

### **AGENT** 

- Can view authorised station tickets. 

- Cannot view unauthorized station tickets. 

- Can claim eligible tickets. 

- Cannot claim an already claimed ticket. 

- Can communicate with users. 

- Can create internal messages. 

- Cannot expose internal messages to users. 

- Can perform permitted ticket transitions. 

- Can transfer tickets when authorized. 

### **ADMIN** 

- Can access administrative functions. 

- Can manage users. 

- Can manage stations. 

- Can manage problem types. 

- Can manage templates. 

- Can view appropriate reports. 

- Administrative actions are audited. 

### **Consultants** 

- Can authenticate while active. 

- Cannot authenticate after expiration. 

- Historical records remain available. 

### **WebSockets** 

- Unauthorized ticket subscriptions are rejected. 

- Unauthorized station subscriptions are rejected. 

- Private notifications are not leaked. 

# **44. Security Acceptance Criteria** 

The permission system is acceptable only when: 

1. Authorization is enforced server-side. 

2. Role permissions cannot be bypassed through API manipulation. 

3. Station restrictions cannot be bypassed through direct ticket IDs. 

4. Internal messages cannot be accessed by users. 

5. Unauthorized attachments cannot be downloaded. 

6. Search cannot reveal unauthorized tickets. 

7. WebSockets cannot bypass API authorization. 

8. Users cannot change their own priority or role. 

9. Users cannot promote themselves to agents or administrators. 

10. Permission changes are audited. 

11. Expired consultant accounts cannot authenticate. 

12. Historical records remain intact after account deactivation. 

# **45. Implementation Guidance** 

The permission system should be implemented centrally rather than duplicated inconsistently across individual API endpoints. 

Recommended authorization components may include: 

- Role checks 

- Station-scope checks 

- Object-level permission checks 

- Ticket-state checks 

- Message-visibility checks 

- Administrative permission checks 

Django permissions and application-level authorization services may be used together. 

The implementation should avoid scattering complex authorization logic throughout frontend components. 

# **46. Final Principle** 

The IT Ticketing System must treat authorization as a combination of: 

```
ROLE
+
PRIORITY
+
STATION SCOPE
+
OBJECT ACCESS
+
CURRENT STATE
```

These dimensions must remain separate. 

The user's role determines what the user may do. 

The user's priority determines how their tickets are handled. 

The user's station scope determines which station-related support tickets an agent may access. 

Object-level authorization determines whether the user may access a specific ticket, message, attachment, report, or other protected resource. 

The current ticket state determines whether a requested action is valid at that point in the workflow. 

No single dimension should be used as a substitute for the others. 

**Next:** `05-ticket-workflow.md` . That document will define the exact ticket lifecycle and valid state transitions, including claiming, waiting for the user, resolution, feedback, reopening, closure, and station transfers. 

