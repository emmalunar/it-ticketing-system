# **09-api-specification.md** 

# IT Ticketing System — API Specification 

- **Document:** 09-api-specification.md 

- **Status:** Approved API Contract 

**Version:** 1.0 

**Last Updated:** 2026-09-14 

## 1. Purpose 

This document defines the API contract between the Next.js frontend and Django REST Framework backend. 

It specifies: 

- API conventions 

- Authentication 

- Authorization 

- Request and response formats 

- Ticket endpoints 

- Queue endpoints 

- Messaging endpoints 

- Assignment and transfer endpoints 

- Notification endpoints 

- Feedback endpoints 

- Administrative endpoints 

- Reporting endpoints 

- Error handling 

- Pagination 

- Filtering 

- WebSocket endpoints 

The API must implement the business rules defined in: 

- `02-product-requirements.md` 

- `03-business-rules.md` 

- `04-user-roles-and-permissions.md` 

- `05-ticket-workflow.md` 

- `06-queue-and-priority-system.md` 

- `07-database-design.md` 

- `08-system-architecture.md` 

These documents are authoritative. 

- # 2. API Design Principles 

The API must follow these principles: 

1. Backend is the source of truth. 

2. Authorization is enforced server-side. 

3. Business rules are enforced server-side. 

4. API responses must not expose information the requesting user is not authorised to see. 

5. Internal agent messages must never be returned through user-visible endpoints. 

6. Ticket priority is determined by the authenticated user's priority level. 

7. Queue position is calculated dynamically. 

8. Important state-changing operations must be transactional. 

9. API operations must create audit records where required. 

10. API errors must be predictable and structured. 

11. Pagination must be used for potentially large collections. 

12. Sensitive information must never be returned unnecessarily. 

# 3. Base URL 

Production: 

```text https://<internal-ticketing-domain>/api/v1/ 

Development: 

http://localhost/api/v1/ 

The actual production hostname must be supplied through environment configuration. The frontend must not hard-code environment-specific URLs. 

# **4. API Versioning** 

The initial API version is: 

/api/v1/ 

Example: 

GET /api/v1/tickets/ 

Breaking API changes should result in a new API version rather than silently changing the existing contract. 

# **5. HTTP Methods** 

The API uses standard HTTP methods. 

# **Method Purpose** 

GET Retrieve resource POST Create resource or execute action PATCH Partially update resource 

PUT Full replacement where required 

DELETE Delete/deactivate where explicitly permitted 

Most ticket workflow actions should use explicit action endpoints rather than allowing arbitrary status changes through PATCH. 

For example: 

POST /tickets/{ticket_id}/claim/ 

is preferred over: 

PATCH /tickets/{ticket_id}/ 

{ "status": "IN_PROGRESS" } 

This allows the backend to enforce the correct workflow. 

# **6. Authentication** 

All protected endpoints require an authenticated user. 

The exact authentication mechanism will be configured during implementation. 

The architecture must support secure browser-based authentication. 

Authentication must protect against: 

- Session theft 

- CSRF where applicable 

- Credential exposure 

- Unauthorized API access 

Public endpoints should be limited to resources that genuinely need public access. 

The feedback endpoint is a controlled exception because users must be able to access feedback without logging into the application. 

# **7. Authentication Endpoints** 

# **7.1 Login** 

POST /api/v1/auth/login/ 

# **Request** 

{ 

"username": "user@example.com", 

"password": "********" 

} 

# **Response** 

{ 

"user": { 

"id": "uuid", 

"username": "user@example.com", "first_name": "John", "last_name": "Doe", "role": "USER", "priority_level": "P3" } } 

Authentication credentials/tokens must not be returned unnecessarily. 

# **7.2 Logout** 

POST /api/v1/auth/logout/ 

# **Response** 

{ "detail": "Logged out successfully." } 

# **7.3 Current User** 

GET /api/v1/auth/me/ 

Returns the authenticated user's current profile and permissions relevant to the frontend. Example: 

{ "id": "uuid", "username": "john.doe", "first_name": "John", "last_name": "Doe", "role": "AGENT", 

"priority_level": "P3", "is_active": true, "stations": [ { "id": "uuid", "name": "Head Office", "code": "HEAD" } ] } 

# **8. Common Response Format** 

Successful responses should use predictable structures. For a single resource: { "data": { "id": "uuid" } } For a collection: { "data": [], "pagination": { "page": 1, "page_size": 20, "total": 100, 

"total_pages": 5 

} } 

The implementation may simplify this where Django REST Framework conventions provide a better standard, but the frontend contract must remain consistent. 

# **9. Error Response Format** 

Errors should follow a predictable structure. 

Example: 

{ "error": { "code": "TICKET_NOT_CLAIMABLE", "message": "This ticket has already been claimed by another agent." } } Validation errors may include field-level information: { 

"error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid.", 

"fields": { "description": [ "This field is required." ] } } 

} 

# **10. HTTP Status Codes** 

The API should use standard HTTP status codes. 

# **Status Meaning** 

- 200 Successful request 

- 201 Resource created 

- 204 Successful request with no response body 

- 400 Invalid request 

- 401 Unauthenticated 

- 403 Authenticated but not authorised 

- 404 Resource not found or inaccessible 

- 409 Conflict 

- 422 Validation/business rule failure where appropriate 

- 429 Too many requests 

- 500 Unexpected server error 

- 503 Service temporarily unavailable 

The API should avoid revealing whether a resource exists when the requesting user is not authorised to access it, where doing so could create an information disclosure risk. 

# **11. Pagination** 

Large collections must be paginated. 

Recommended default: 

page_size = 20 

The API may allow clients to request another page size subject to a server-defined maximum. 

Example: 

GET /api/v1/tickets/?page=2&page_size=20 

The backend must enforce the maximum page size. 

# **12. Ticket API** 

# **12.1 Create Ticket** 

POST /api/v1/tickets/ 

# **Request** 

{ "station_id": "uuid", "problem_type_id": "uuid", "description": "My laptop cannot connect to the office network." } 

Priority must **not** be supplied by the client. 

The backend determines priority from the authenticated user's current priority level. 

# **Response** 

{ "data": { "id": "uuid", "ticket_number": "IT-2026-000125", "station": { "id": "uuid", "name": "Head Office" }, "problem_type": { "id": "uuid", 

"name": "Faulty Laptop (Software)" 

}, "priority": "P3", "status": "QUEUED", "description": "My laptop cannot connect to the office network.", "created_at": "2026-09-14T10:30:00Z" } } 

# **13. List User Tickets** 

GET /api/v1/tickets/ 

For a normal user, this endpoint returns only tickets belonging to the authenticated user. Example: 

GET /api/v1/tickets/?status=QUEUED 

Supported filters may include: 

status priority station problem_type created_after 

created_before 

Agents and administrators receive different results based on authorization scope. 

# **14. Retrieve Ticket** 

GET /api/v1/tickets/{ticket_id}/ 

The response must contain only information the authenticated user is authorised to see. 

User-visible ticket details may include: 

Ticket number 

Station 

Problem type Priority Status Description Current assigned agent where appropriate User-visible conversation Created time Updated time Resolution information where appropriate Feedback status where appropriate Internal notes must not be returned to normal users. 

# **15. Update Ticket** 

General ticket PATCH operations should be restricted. 

PATCH /api/v1/tickets/{ticket_id}/ Only fields explicitly permitted by the role and workflow may be updated. The following must not be freely client-editable: 

priority status current_assignee station ticket_number created_at 

closed_at 

Workflow actions should use dedicated endpoints. 

# **16. Claim Ticket** 

POST /api/v1/tickets/{ticket_id}/claim/ 

Agent only. 

The backend must: 

1. Verify the agent is authorised for the ticket's station. 

2. Verify the ticket is claimable. 

3. Prevent another agent from claiming it simultaneously. 

4. Create assignment history. 

5. Set the current assignee. 

6. Change the ticket to IN_PROGRESS. 

7. Record the claim timestamp. 

8. Create an audit record. 

9. Notify relevant parties where required. 

# **Success** 

{ 

"data": { 

"ticket_id": "uuid", 

"status": "IN_PROGRESS", 

"current_assignee": { 

"id": "uuid", 

"name": "Agent Name" 

} } 

} 

# **Conflict** 

{ 

"error": { "code": "TICKET_NOT_CLAIMABLE", "message": "This ticket is no longer available to claim." } } HTTP status: 409 Conflict 

# **17. Assign Ticket** 

POST /api/v1/tickets/{ticket_id}/assign/ 

Agent/admin permissions depend on the final role policy. 

# **Request** 

{ 

"agent_id": "uuid", "reason": "Requires specialist support." } 

The backend validates that the selected agent is eligible to receive the ticket. 

Assignment history must be recorded. 

# **18. Reassign Ticket** 

POST /api/v1/tickets/{ticket_id}/reassign/ 

# **Request** 

{ 

"agent_id": "uuid", 

"reason": "Current agent is unavailable." 

} 

The previous assignment must be closed in assignment history before the new assignment becomes active. 

# **19. Transfer Ticket** 

POST /api/v1/tickets/{ticket_id}/transfer/ 

# **Request** 

{ 

"station_id": "uuid", 

"agent_id": "uuid", 

"reason": "Hardware support required at another station." 

} 

agent_id may be optional if the ticket is being transferred only to a station. 

The backend must: 

- Validate the destination station. 

- Validate the receiving agent if supplied. 

- Update current station. 

- Update current assignment where applicable. 

- Record transfer history. 

- Record audit history. 

- Notify the receiving station/agent. 

# **20. Change Ticket Status** 

Direct status modification should be restricted. 

Instead, workflow actions should be exposed individually. Supported actions: claim assign reassign transfer start wait-for-user resume resolve reopen close Examples: POST /api/v1/tickets/{ticket_id}/wait-for-user/ POST /api/v1/tickets/{ticket_id}/resume/ POST /api/v1/tickets/{ticket_id}/resolve/ POST /api/v1/tickets/{ticket_id}/reopen/ **21. Wait for User** POST /api/v1/tickets/{ticket_id}/wait-for-user/ The ticket becomes: WAITING_USER The action must be authorised and audited. 

# **22. Resume Ticket** 

POST /api/v1/tickets/{ticket_id}/resume/ 

Moves a ticket from: 

WAITING_USER 

to: 

IN_PROGRESS 

# **23. Resolve Ticket** 

POST /api/v1/tickets/{ticket_id}/resolve/ 

# **Request** 

{ 

"resolution_notes": "Network adapter driver was updated and connectivity restored." 

- } 

The backend must: 

1. Verify the agent is authorised. 

2. Validate the current workflow state. 

3. Save resolution information. 

4. Set status to RESOLVED. 

5. Record resolution timestamp. 

6. Generate a secure feedback token. 

7. Set feedback token expiration according to the business rule. 

8. Create feedback notification. 

9. Record audit information. 

# **24. Reopen Ticket** 

POST /api/v1/tickets/{ticket_id}/reopen/ 

This may occur because of: 

- Negative feedback 

#  Authorised support action 

For negative feedback, the system should automatically perform the reopening operation. A reopened ticket must return to the appropriate active workflow. 

P2/P3: 

REOPENED → queue 

P1: 

REOPENED → immediate handling 

# **25. Close Ticket** 

POST /api/v1/tickets/{ticket_id}/close/ 

Normal closure occurs after positive feedback. 

The backend must prevent unauthorised closure. 

# **26. Ticket Messages** 

**List User-Visible Messages** 

GET /api/v1/tickets/{ticket_id}/messages/ 

This endpoint returns only messages visible to the requesting user. 

# **Send User-Visible Message** 

POST /api/v1/tickets/{ticket_id}/messages/ 

# **Request** 

{ "body": "I will be available in the office this afternoon.", "message_type": "USER_MESSAGE" } 

The backend determines the correct sender and visibility. 

Clients must not be trusted to set: 

sender_id 

visibility 

# **27. Internal Agent Notes** 

Internal communication requires a separate permission-controlled endpoint. POST /api/v1/tickets/{ticket_id}/internal-messages/ 

# **Request** 

{ 

"body": "The user may need a replacement network adapter." } 

The message must be stored as: 

visibility = INTERNAL 

Normal users must never receive these messages. 

# **28. Predefined Notices** 

# **List Templates** 

GET /api/v1/response-templates/ 

Agent receives active templates they are authorised to use. 

# **Send Template** 

POST /api/v1/tickets/{ticket_id}/predefined-notice/ 

# **Request** 

{ 

"template_id": "uuid" } 

The backend retrieves the current template content and creates a ticket message. 

The frontend must not be trusted to submit arbitrary template content while claiming it is an official template. 

# **29. Attachments** 

# **Upload Attachment** 

POST /api/v1/tickets/{ticket_id}/attachments/ 

Multipart form data should be used. 

The backend must: 

- Authenticate user 

- Authorise ticket access 

- Validate file size 

- Validate content type 

- Generate safe storage key 

- Store file in MinIO 

- Store metadata in PostgreSQL 

- Associate attachment with ticket/message 

- Audit the upload 

# **Download Attachment** 

GET /api/v1/attachments/{attachment_id}/ 

The backend must verify access before returning or redirecting to the file. 

Storage keys must not provide unrestricted public access. 

# **30. Queue API** 

# **Station Queue** 

GET /api/v1/queue/ 

For an agent, returns tickets in stations they are authorised to handle. Possible filters: station priority The queue order must follow the documented rules: P2 before P3 FIFO within each priority P1 excluded from normal queue 

# **31. User Queue Position** 

GET /api/v1/tickets/{ticket_id}/queue-position/ Applicable to P2/P3 users. 

Example: { "data": { "ticket_id": "uuid", "tickets_ahead": 3, "position": 4 } } For P1: { "data": { "ticket_id": "uuid", "queue_applicable": false, 

"reason": "P1 tickets bypass the normal queue." 

} } 

Queue position must be calculated dynamically. 

# **32. Queue Summary** 

GET /api/v1/queue/summary/ Possible response: { "data": { "station": { "id": "uuid", "name": "Head Office" }, "p1_count": 1, "p2_count": 4, "p3_count": 8 } } Agents should only receive data within their authorised station scope. 

# **33. Stations API** 

**List Stations** 

GET /api/v1/stations/ 

Normal users may receive active stations available for ticket creation. 

# **Retrieve Station** 

GET /api/v1/stations/{station_id}/ 

# **Create Station** 

POST /api/v1/admin/stations/ 

Admin only. 

# **Update Station** 

PATCH /api/v1/admin/stations/{station_id}/ 

Admin only. 

Stations should normally be deactivated rather than physically deleted. 

# **34. Problem Categories API** 

# **List Categories** 

GET /api/v1/problem-categories/ 

Only active categories should normally be returned for ticket creation. 

# **35. Problem Types API** 

**List Problem Types** 

GET /api/v1/problem-types/ Optional category filter: 

GET /api/v1/problem-types/?category_id=uuid 

Only active problem types should normally be available to users. 

# **36. Administrative Problem Type Management** 

**Create** 

POST /api/v1/admin/problem-types/ 

# **Update** 

PATCH /api/v1/admin/problem-types/{problem_type_id}/ 

# **Deactivate** 

POST /api/v1/admin/problem-types/{problem_type_id}/deactivate/ 

The frontend must not hard-code the problem catalogue. 

# **37. Notification API** 

# **List Notifications** 

GET /api/v1/notifications/ 

Returns notifications belonging to the authenticated user. 

# **Mark Notification Read** 

POST /api/v1/notifications/{notification_id}/read/ 

# **Mark All Read** 

POST /api/v1/notifications/read-all/ 

Users must not be able to modify another user's notifications. 

# **38. Feedback API** 

Feedback is a controlled public-facing workflow. 

# **Validate Feedback Token** 

GET /api/v1/feedback/{token}/ 

The server checks: 

- Token exists 

- Token has not been used 

- Token has not expired 

- Ticket is eligible for feedback 

The API must not expose the raw token in logs. 

# **Submit Feedback** 

POST /api/v1/feedback/{token}/ 

# **Request** 

{ 

"rating": "POSITIVE", 

"comment": "The issue was resolved quickly." 

} 

or: 

{ 

"rating": "NEGATIVE", 

"comment": "The problem has returned." 

} 

The operation must be atomic. 

The backend must: 

1. Validate token. 

2. Lock the token/feedback record where necessary. 

3. Verify it is unused. 

4. Verify it is not expired. 

5. Save feedback. 

6. Mark token used. 

7. Make the token immediately invalid. 

8. Close or reopen the ticket. 

9. Create audit record. 10.Trigger relevant notifications. 

# **39. Feedback Expiration** 

Feedback expiration is determined by business rules. 

The API must not calculate expiration using: resolution time + 9 hours Instead: Resolution before 17:00 GMT ↓ 5:00 PM GMT same applicable working day Resolution after 17:00 GMT ↓ 5:00 PM GMT next applicable working day The working-day calendar must be centralised in backend logic. 

# **40. Audit API** 

Audit logs are generally not exposed to normal users. Administrators may have controlled access. GET /api/v1/admin/audit-logs/ Filters may include: actor action entity_type ticket 

date range 

Audit logs must not be editable through the API. 

# **41. Reporting API** 

Reports are administrator-facing unless otherwise authorised. 

# **Ticket Summary** 

GET /api/v1/reports/tickets/summary/ Possible filters: date_from date_to station priority problem_type status Example: { "data": { "total_created": 150, "total_resolved": 137, "total_closed": 120, "total_reopened": 12, "p1": 4, "p2": 38, "p3": 108 } } 

# **42. Agent Performance Report** 

GET /api/v1/reports/agents/ 

Possible metrics: 

- Tickets handled 

- Tickets resolved 

- Average resolution time 

- Escalated tickets 

- Reopened tickets 

- Feedback results 

The system should avoid presenting misleading performance metrics where the underlying data is insufficient. 

# **43. Station Report** 

GET /api/v1/reports/stations/ 

Possible metrics: 

- Tickets created 

- Tickets resolved 

- Tickets reopened 

- P1/P2/P3 distribution 

- Average resolution time 

- Escalation count 

# **44. User Management API** 

Admin only. 

# **List Users** 

GET /api/v1/admin/users/ 

# **Retrieve User** 

GET /api/v1/admin/users/{user_id}/ 

# **Create User** 

POST /api/v1/admin/users/ 

# **Update User** 

PATCH /api/v1/admin/users/{user_id}/ 

# **Deactivate User** 

POST /api/v1/admin/users/{user_id}/deactivate/ User records should normally be retained for historical integrity. 

# **45. Consultant Account Management** 

Consultant accounts may have an expiration date. Example: { "role": "USER", "priority_level": "P2", "expires_at": "2026-12-31T23:59:59Z" } When the expiration time is reached: Account becomes inactive Historical tickets and messages remain intact. 

A background task should handle expiration reliably. 

# **46. Agent Station Management** 

Admin endpoint: 

POST /api/v1/admin/agents/{agent_id}/stations/ 

# **Request** 

{ "station_id": "uuid" } Agent station assignments must support an agent belonging to multiple stations. Deactivation of a station assignment must preserve historical assignment information. 

# **47. Search API** 

GET /api/v1/search/ Search must respect the requesting user's permissions. Possible search targets: ticket number ticket description problem type station message content user Not all fields should necessarily be searchable by every role. Search results must never bypass ticket authorization. 

# **48. WebSocket API** 

The system uses WebSockets for real-time updates. 

Example endpoint: /ws/notifications/ Ticket-specific connection: /ws/tickets/{ticket_id}/ Agent queue connection: 

/ws/queue/ 

The exact routing structure may be refined during implementation. 

# **49. WebSocket Events** 

Possible event types: 

TICKET_CREATED 

TICKET_UPDATED 

TICKET_CLAIMED TICKET_ASSIGNED 

TICKET_TRANSFERRED TICKET_MESSAGE_CREATED INTERNAL_MESSAGE_CREATED 

TICKET_RESOLVED TICKET_REOPENED TICKET_CLOSED 

NOTIFICATION_CREATED 

QUEUE_UPDATED 

Each event must contain only information appropriate to the connected user. Example: 

{ 

"event": "TICKET_UPDATED", 

"ticket_id": "uuid", 

"data": { 

"status": "IN_PROGRESS" 

} } 

# **50. API Authorization Matrix** 

|**Endpoint Category**|**USER**|**AGENT**|**ADMIN**|
|---|---|---|---|
|Own tickets|Yes|Yes|Yes|
|Station queue|No|Scoped|Yes|
|Claim ticket|No|Scoped|Yes/Scoped|
|Assign ticket|No|Controlled|Yes|
|Transfer ticket|No|Yes|Yes|
|Internal messages|No|Yes|Yes|
|User-visible messages|Own tickets|Authorised tickets|Yes|
|Feedback|Token|Token where applicable|Controlled|
|Problem types|Read|Read|Manage|
|Stations|Read|Read|Manage|
|Notifications|Own|Own|Own|
|Reports|No|Limited if later enabled|Yes|
|Audit logs|No|No|Yes|
|User management|No|No|Yes|
|Final endpoint-level pe|rmissions m|ust always be enforced b|y the backend.|



# **51. Idempotency** 

Operations that may be retried must be designed carefully. 

Important examples: 

Feedback submission 

Escalation processing Notification creation 

Background email processing 

Feedback is especially important. 

If the same feedback request reaches the server twice, only the first valid submission may succeed. 

# **52. Rate Limiting** 

Rate limiting should be applied to sensitive or abuse-prone endpoints. Examples: 

Login 

Feedback validation Feedback submission Password-related operations 

Search 

File uploads 

The limits should be configurable. 

Rate limiting must not prevent legitimate normal ticket activity. 

# **53. API Validation** 

Backend validation must include: 

- Required fields 

- UUID validity 

- Station validity 

- Problem type validity 

- Active/inactive state 

- Ticket workflow state 

- User permissions 

- File limits 

- Message length 

- Feedback values 

- Assignment eligibility 

Client-side validation improves user experience but does not replace backend validation. 

# **54. API Audit Requirements** 

The following API actions should create audit records: 

Ticket creation 

Ticket claim 

Ticket assignment 

Ticket reassignment 

Ticket transfer 

Ticket resolution 

Ticket reopening 

Ticket closure 

Feedback submission 

User creation 

User modification 

User deactivation 

Station modification 

Problem type modification Response template modification Agent-station modification 

Administrative configuration changes 

Read-only operations generally do not require audit entries unless required by security policy. 

# **55. API Transaction Requirements** 

The following operations must be implemented transactionally: 

Claim Assign Reassign Transfer Resolve Reopen Close 

Submit feedback 

Administrative state changes 

The goal is to prevent partial state changes. 

Example: 

A successful transfer must update: ticket.current_station ticket.current_assignee transfer history assignment history 

audit log 

as one logical operation. 

# **56. API Security Rules** 

The API must: 

- Require authentication for protected endpoints. 

- Enforce authorization on every protected resource. 

- Validate all input. 

- Avoid trusting client-supplied role/priority. 

- Avoid exposing internal messages. 

- Avoid exposing secrets. 

- Avoid exposing database errors directly. 

- Avoid unrestricted file URLs. 

- Avoid insecure direct object references. 

- Protect feedback tokens. 

- Use secure transport in production. 

- Log security-relevant failures appropriately. 

# **57. API Implementation Structure** 

Recommended Django structure: 

backend/ 

└── apps/ 

- ├── accounts/ 

- │   ├── models.py 

- │   ├── serializers.py 

- │   ├── views.py 

- │   ├── urls.py 

- │   └── services.py │ 

├── stations/ 

- │   ├── models.py 

- │   ├── serializers.py 

- │   ├── views.py │   └── urls.py │ 

- ├── tickets/ 

- │   ├── models.py 

- │   ├── serializers.py 

- │   ├── views.py 

- │   ├── urls.py 

- │   ├── services.py 

- │   └── selectors.py │ 

- ├── messaging/ 

- ├── notifications/ 

- ├── feedback/ 

- ├── reports/ 

- └── audit/ 

Recommended separation: serializers.py 

Input/output validation 

views.py 

HTTP/API handling 

services.py 

Business operations 

selectors.py 

Complex read/query logic 

models.py 

Database models 

This prevents API views from becoming large containers for business logic. 

# **58. Frontend API Layer** 

The Next.js application should centralise API communication. 

Recommended structure: 

frontend/ 

└── lib/ └── api/ ├── client.ts ├── auth.ts ├── tickets.ts ├── queue.ts 

├── messages.ts 

- ├── notifications.ts 

├── feedback.ts 

- ├── stations.ts 

└── admin.ts 

React components should not repeatedly construct raw API URLs throughout the application. 

# **59. API Contract Testing** 

Critical API behaviour must have automated tests. 

Examples: 

User cannot access another user's ticket. 

Agent cannot access an unauthorised station ticket. 

Agent cannot claim the same ticket simultaneously with another agent. 

P1 ticket does not receive normal queue position. 

P2 escalation occurs after 10 unattended minutes. 

P3 escalation occurs after 60 unattended minutes. 

Resolved ticket generates feedback token. 

Expired feedback token is rejected. 

Used feedback token cannot be reused. 

Positive feedback closes ticket. 

Negative feedback reopens ticket. 

Internal messages are invisible to users. 

Transferred tickets follow the destination station's visibility rules. 

# **60. Claude Code API Implementation Rules** 

Claude Code must treat this document as the API contract. 

It must: 

- Implement API endpoints consistently with this specification. 

- Follow the documented HTTP methods. 

- Enforce permissions server-side. 

- Keep business logic in service layers. 

- Use serializers for validation. 

- Use selectors for complex reads where appropriate. 

- Use transactions for state-changing operations. 

- Write automated tests for business-critical endpoints. 

- Avoid exposing internal data. 

- Maintain API versioning. 

- Keep response structures predictable. 

- Document any necessary deviation. 

Claude Code must not: 

- Invent undocumented ticket states. 

- Add arbitrary priority levels. 

- Allow clients to set their own priority. 

- Allow direct unrestricted status manipulation. 

- Allow normal users to access internal messages. 

- Allow unauthorised station access. 

- Store queue position permanently. 

- Bypass transaction requirements. 

- silently change the API contract. 

If an implementation requirement conflicts with this document, the conflict must be identified before implementation. 

# **61. API Evolution** 

The API should evolve incrementally. 

Non-breaking changes may include: 

- Adding optional response fields 

- Adding new optional filters 

- Adding new endpoints 

Breaking changes should require: 

/api/v2/ 

or another explicitly documented versioning strategy. 

Existing clients should not unexpectedly break because of backend changes. 

# **62. Final API Architecture** 

The final communication model is: 

┌─────────────────┐ 

│   Next.js UI    │ └────────┬────────┘ │ REST API │ WebSocket │ ▼ ┌─────────────────┐ │ Django / DRF    │ └────────┬────────┘ │ ┌──────────────┼──────────────┐ │              │              │ ▼ ▼ ▼ PostgreSQL        Redis          MinIO │              │ │ ▼ │           Celery │              │ │ ▼ │             SMTP │ ▼ 

Persistent State 

The API is therefore the controlled boundary between the frontend and all backend services. 

The backend remains responsible for all security-sensitive and business-critical decisions. 

That completes **`09-api-specification.md`**. 

**Next:** `10-security.md` — this will define the application's security model in detail before we move into notification/SLA and deployment. 

