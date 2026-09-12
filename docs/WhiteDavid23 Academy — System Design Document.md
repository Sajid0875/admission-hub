# WhiteDavid23 Academy
## Partner Portal / Admission CRM Platform
### System Design Document — Version 1.0

**Project:** `whitedavid23_academy`  
**System Type:** Multi-tenant Partner Portal / Admission CRM  
**Architecture:** Modular Monolith  
**Primary Users:** Super Admin, Partner Admin, Team Member/Counselor, Support  
**Document Status:** Development-ready system design  
**Date:** 2026-09-10

---

# 1. System Overview

`whitedavid23_academy` is a multi-tenant web-based CRM and admission management platform designed to connect WhiteDavid23 with partner academies, communities, counselors, and support personnel.

The platform manages the complete admission lifecycle:

```text
Partner
   ↓
Lead Capture
   ↓
Lead Assignment
   ↓
Contact / Follow-up
   ↓
Demo / Brochure
   ↓
Fee Discussion
   ↓
Admission
   ↓
Payment
   ↓
Commission
   ↓
Reporting
```

The system must provide:

- strict partner-level data isolation
- role-based authorization
- lead lifecycle management
- follow-up management
- admission conversion
- course management
- commission calculation
- reporting and analytics
- notifications
- marketing assets
- audit logging
- import/export
- future integration capabilities

---

# 2. Recommended Architecture

## 2.1 Architectural Style

### Recommended

**Modular Monolith + REST API + PostgreSQL**

```text
                    ┌─────────────────────────┐
                    │       End Users         │
                    │                         │
                    │ Super Admin             │
                    │ Partner Admin            │
                    │ Counselor               │
                    │ Support                 │
                    └────────────┬────────────┘
                                 │
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │       Frontend          │
                    │ Next.js + TypeScript    │
                    │ Tailwind CSS             │
                    └────────────┬────────────┘
                                 │
                              REST/JSON
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       Backend API        │
                    │ Node.js + Express        │
                    │                          │
                    │ Authentication           │
                    │ Authorization             │
                    │ Tenant Isolation         │
                    │ Business Logic           │
                    │ Validation               │
                    │ Reporting                │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
        │ PostgreSQL  │   │ Redis       │   │ Object      │
        │             │   │             │   │ Storage     │
        │ Primary DB  │   │ Cache/Queue │   │ Assets/docs  │
        └─────────────┘   └─────────────┘   └─────────────┘

                         Future Integrations
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          WhatsApp          Payments          Email/SMS
```

---

# 3. Why Modular Monolith?

Microservices are **not recommended for Phase 1**.

The application has tightly related business domains:

```text
Leads
  ↓
Follow-ups
  ↓
Admissions
  ↓
Payments
  ↓
Commissions
  ↓
Reports
```

Splitting these into independent services immediately would introduce:

- distributed transactions
- service discovery
- network failures
- additional deployment complexity
- duplicated authentication
- distributed logging
- eventual consistency problems

The project does not initially require that complexity.

Instead:

```text
One Backend
│
├── Auth Module
├── User Module
├── Partner Module
├── Lead Module
├── Follow-up Module
├── Admission Module
├── Course Module
├── Marketing Module
├── Commission Module
├── Notification Module
├── Reporting Module
├── Audit Module
└── Import/Export Module
```

Each module has its own:

```text
Controller
Service
Repository
Validation
DTO
Domain logic
```

This provides a clean migration path toward microservices later if scale actually demands it.

---

# 4. High-Level System Architecture

```text
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │ CDN / WAF      │
                    │ TLS / Security │
                    └───────┬───────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ Next.js Web App │           │ Static Assets  │
     │ React/TS        │           │ CDN            │
     └────────┬───────┘           └────────────────┘
              │
              │ HTTPS / REST
              ▼
     ┌────────────────────────────┐
     │ API Server                 │
     │ Node.js + Express          │
     │                            │
     │ ┌────────────────────────┐ │
     │ │ Auth / RBAC            │ │
     │ ├────────────────────────┤ │
     │ │ Tenant Context         │ │
     │ ├────────────────────────┤ │
     │ │ Lead                   │ │
     │ ├────────────────────────┤ │
     │ │ Follow-up              │ │
     │ ├────────────────────────┤ │
     │ │ Admission              │ │
     │ ├────────────────────────┤ │
     │ │ Course                 │ │
     │ ├────────────────────────┤ │
     │ │ Commission             │ │
     │ ├────────────────────────┤ │
     │ │ Marketing              │ │
     │ ├────────────────────────┤ │
     │ │ Notification           │ │
     │ ├────────────────────────┤ │
     │ │ Reporting              │ │
     │ ├────────────────────────┤ │
     │ │ Audit                  │ │
     │ └────────────────────────┘ │
     └──────────────┬─────────────┘
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
 PostgreSQL       Redis       Object Storage
       │            │             │
       │            │             └── Brochures
       │            │                 Posters
       │            │                 Documents
       │            │                 Marketing assets
       │            │
       │            └── Cache
       │                Queues
       │                Rate limiting
       │
       └── Application data
```

---

# 5. Multi-Tenant Architecture

This is one of the most important architectural requirements.

Each partner represents a tenant.

Example:

```text
WhiteDavid23
│
├── Partner A
│   ├── Users
│   ├── Leads
│   ├── Follow-ups
│   └── Admissions
│
├── Partner B
│   ├── Users
│   ├── Leads
│   ├── Follow-ups
│   └── Admissions
│
└── Partner C
    ├── Users
    ├── Leads
    ├── Follow-ups
    └── Admissions
```

## Tenant Identification

Most tenant-owned tables contain:

```text
partner_id
```

Example:

```text
leads
──────
id
partner_id
name
phone
email
...
```

A Partner Admin request:

```http
GET /api/leads
```

must automatically become logically equivalent to:

```sql
SELECT *
FROM leads
WHERE partner_id = authenticated_user.partner_id;
```

The client must **not** be trusted to supply the partner ID.

Bad:

```http
GET /api/leads?partnerId=123
```

Good:

```text
JWT
 ↓
authenticated user
 ↓
user.partner_id
 ↓
tenant context
 ↓
database query
```

---

# 6. Tenant Isolation Rules

## Super Admin

```text
partner_id = NULL
```

or global administrative context.

Can access:

```text
ALL PARTNERS
ALL LEADS
ALL ADMISSIONS
ALL REPORTS
ALL COMMISSIONS
```

## Partner Admin

```text
partner_id = authenticated user's partner_id
```

Can access:

```text
ONLY THEIR PARTNER'S DATA
```

## Team Member / Counselor

```text
partner_id = authenticated user's partner_id
AND
assigned_to = authenticated user's id
```

## Support

Access should be explicitly scoped to permitted support operations.

---

# 7. Core Domain Model

Primary entities:

```text
User
Role
Permission
Partner
Lead
LeadActivity
FollowUp
Admission
Payment
Course
MarketingAsset
Campaign
CommissionRule
CommissionRecord
Notification
AuditLog
```

Potential supporting entities:

```text
PartnerMember
LeadAssignment
AdmissionDocument
Announcement
ImportJob
ExportJob
RefreshToken
SystemSetting
```

---

# 8. Entity Relationship Model

```text
                    ┌──────────────┐
                    │    Partner   │
                    └──────┬───────┘
                           │
            ┌──────────────┼───────────────┐
            │              │               │
            ▼              ▼               ▼
         Users           Leads          Commission
            │              │
            │              ├───────────────┐
            │              │               │
            ▼              ▼               ▼
          Roles        FollowUps       LeadActivities
                           │
                           ▼
                       Admission
                           │
                  ┌────────┼─────────┐
                  │        │         │
                  ▼        ▼         ▼
               Payments  Course   Commission
                                      │
                                      ▼
                              CommissionRecord
```

---

# 9. Database Design

## 9.1 users

```text
users
────────────────────────
id                  UUID PK
partner_id          UUID FK NULL
role_id             UUID FK
name                VARCHAR
email               VARCHAR UNIQUE
phone               VARCHAR
password_hash       TEXT
status              ENUM
last_login_at       TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 10. partners

```text
partners
────────────────────────
id                  UUID PK
academy_name        VARCHAR
partner_name        VARCHAR
owner_name          VARCHAR
email               VARCHAR
mobile              VARCHAR
address             TEXT
logo_url             TEXT
commission_type     VARCHAR
status              ENUM
joining_date        DATE
approved_at         TIMESTAMP
approved_by         UUID
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Statuses:

```text
PENDING
ACTIVE
SUSPENDED
REJECTED
```

---

# 11. roles

```text
roles
────────────────
id
name
description
```

Default roles:

```text
SUPER_ADMIN
PARTNER_ADMIN
COUNSELOR
SUPPORT
```

For fine-grained authorization, add:

```text
permissions
────────────────
id
code
description
```

Example permissions:

```text
LEAD_VIEW
LEAD_CREATE
LEAD_UPDATE
LEAD_DELETE
LEAD_ASSIGN

ADMISSION_VIEW
ADMISSION_CREATE
ADMISSION_UPDATE

COMMISSION_VIEW
COMMISSION_MANAGE

PARTNER_APPROVE
PARTNER_SUSPEND

REPORT_VIEW
REPORT_EXPORT

USER_MANAGE
AUDIT_VIEW
```

---

# 12. leads

```text
leads
────────────────────────
id                  UUID PK
partner_id          UUID FK
assigned_to         UUID FK
name                VARCHAR
phone               VARCHAR
whatsapp            VARCHAR
email               VARCHAR
city                VARCHAR
course_id           UUID FK
source              VARCHAR
budget              DECIMAL
priority            ENUM
status              ENUM
score               INTEGER
follow_up_date      TIMESTAMP
notes               TEXT
closed_reason       TEXT
created_by          UUID FK
created_at          TIMESTAMP
updated_at          TIMESTAMP
archived_at         TIMESTAMP NULL
```

Possible priority:

```text
LOW
MEDIUM
HIGH
HOT
```

---

# 13. Lead Status Model

Recommended state machine:

```text
NEW
 │
 ▼
CONTACTED
 │
 ▼
FOLLOW_UP
 │
 ├──────────────► LOST
 │
 ▼
DEMO_BOOKED
 │
 ▼
DEMO_COMPLETED
 │
 ▼
FEE_DISCUSSION
 │
 ▼
ADMISSION_PENDING
 │
 ▼
ADMITTED
```

Alternative terminal state:

```text
CLOSED / LOST
```

Invalid transitions must be rejected by the backend.

For example:

```text
NEW → ADMITTED
```

should not be allowed directly.

---

# 14. lead_activities

Every important lead interaction should be represented as an activity.

```text
lead_activities
────────────────────────
id
lead_id
user_id
type
description
metadata
created_at
```

Activity types:

```text
CREATED
ASSIGNED
STATUS_CHANGED
CALL
WHATSAPP
EMAIL
NOTE
DEMO_BOOKED
BROCHURE_SENT
FEE_DISCUSSION
ADMISSION_CREATED
```

This creates the lead timeline.

Example:

```text
Lead Created
     ↓
Assigned to Rahul
     ↓
Call — Connected
     ↓
Brochure Sent
     ↓
Demo Booked
     ↓
Fee Discussed
     ↓
Admission Confirmed
```

---

# 15. follow_ups

```text
follow_ups
────────────────────────
id
lead_id
assigned_to
due_at
priority
status
outcome
notes
completed_at
created_at
updated_at
```

Statuses:

```text
PENDING
COMPLETED
OVERDUE
SNOOZED
CANCELLED
```

Outcomes:

```text
CONNECTED
NO_RESPONSE
CALL_LATER
INTERESTED_LATER
DEMO_BOOKED
LOST
CONVERTED
```

---

# 16. admissions

```text
admissions
────────────────────────
id
lead_id
partner_id
course_id
student_name
fee
payment_status
payment_mode
joining_date
remarks
verification_status
created_by
created_at
updated_at
```

Payment status:

```text
UNPAID
PARTIAL
PAID
REFUNDED
CANCELLED
```

Verification:

```text
PENDING
VERIFIED
REJECTED
```

---

# 17. payments

Although the MVP can keep payment fields inside Admission, a dedicated Payment entity is recommended if multiple payments are expected.

```text
payments
────────────────────────
id
admission_id
amount
payment_mode
transaction_reference
payment_date
status
created_by
created_at
```

This allows:

```text
Admission Fee = ₹50,000

Payment 1 = ₹10,000
Payment 2 = ₹15,000
Payment 3 = ₹25,000

Total = ₹50,000
```

instead of overwriting a single payment field.

---

# 18. courses

```text
courses
────────────────────────
id
title
description
duration
fee
syllabus_url
brochure_url
demo_url
benefits
faq
status
created_at
updated_at
```

Course status:

```text
ACTIVE
INACTIVE
ARCHIVED
```

---

# 19. Marketing Assets

```text
marketing_assets
────────────────────────
id
course_id
title
type
file_url
thumbnail_url
language
campaign_id
status
created_by
created_at
updated_at
```

Asset types:

```text
POSTER
BANNER
VIDEO
REEL
CAPTION
WHATSAPP_TEMPLATE
BROCHURE
TESTIMONIAL
```

---

# 20. Campaigns

```text
campaigns
────────────────────────
id
name
description
course_id
status
start_date
end_date
created_by
created_at
updated_at
```

Campaign analytics can later include:

```text
sent
delivered
opened
clicked
converted
```

---

# 21. Commission Architecture

Commission rules should not be hard-coded into controllers.

Recommended structure:

```text
CommissionRule
       │
       ▼
Admission
       │
       ▼
CommissionCalculator
       │
       ▼
CommissionRecord
```

Example:

```text
Course A
Partner Type = Academy
Commission = 20%
```

Admission:

```text
Fee = ₹50,000
Commission = ₹10,000
```

Commission record:

```text
commission_records
────────────────────────
id
partner_id
admission_id
rule_id
base_amount
commission_rate
commission_amount
status
payout_id
created_at
paid_at
```

Statuses:

```text
PENDING
APPROVED
PAID
CANCELLED
```

---

# 22. Notification Architecture

Notifications should be treated as their own domain.

```text
notifications
────────────────────────
id
user_id
partner_id
type
title
message
reference_type
reference_id
read_at
created_at
```

Notification examples:

```text
Follow-up due
Follow-up overdue
New lead assigned
Partner approved
Admission created
Payment received
Commission updated
Announcement published
```

---

# 23. Audit Logging

Sensitive actions must create audit events.

```text
audit_logs
────────────────────────
id
user_id
partner_id
action
entity_type
entity_id
old_value
new_value
ip_address
user_agent
created_at
```

Examples:

```text
PARTNER_APPROVED
PARTNER_SUSPENDED
ROLE_CHANGED
LEAD_TRANSFERRED
ADMISSION_UPDATED
COMMISSION_APPROVED
PAYOUT_APPROVED
USER_CREATED
USER_DEACTIVATED
```

Audit logs should be append-only.

Normal users must not be able to modify or delete them.

---

# 24. Authentication Architecture

Recommended:

```text
Email + Password
       ↓
Password verification
       ↓
JWT access token
       +
Refresh token
       ↓
Authenticated API requests
```

Passwords:

```text
Plain password
      ↓
Argon2id / bcrypt
      ↓
Password hash
```

Never store plaintext passwords.

---

# 25. JWT Payload

Keep JWT payload small.

Example conceptual structure:

```json
{
  "sub": "user-id",
  "role": "PARTNER_ADMIN",
  "partnerId": "partner-id",
  "sessionId": "session-id"
}
```

Do not place sensitive business data inside JWT.

---

# 26. Authentication Flow

```text
Browser
   │
   │ POST /auth/login
   ▼
Auth Controller
   │
   ▼
Auth Service
   │
   ├── Find user
   ├── Check account status
   ├── Verify password
   └── Create tokens
   │
   ▼
Access Token + Refresh Token
   │
   ▼
Browser
```

Authenticated request:

```text
Browser
   │
   │ Authorization: Bearer <token>
   ▼
JWT Middleware
   │
   ▼
User Context
   │
   ▼
RBAC Middleware
   │
   ▼
Tenant Middleware
   │
   ▼
Controller
   │
   ▼
Service
```

---

# 27. Authorization Architecture

Authorization must exist at multiple levels.

```text
Authentication
      ↓
Who are you?
      ↓
Authorization
      ↓
What role do you have?
      ↓
Permission
      ↓
What operation can you perform?
      ↓
Tenant Scope
      ↓
Which records can you access?
      ↓
Ownership / Assignment
      ↓
Which specific records can you modify?
```

Example:

```text
Counselor
  ↓
LEAD_UPDATE permission
  ↓
Same partner?
  ↓
Lead assigned to counselor?
  ↓
Allow update
```

---

# 28. API Architecture

Base API:

```text
/api/v1
```

Authentication:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

---

# 29. Partner APIs

```text
GET    /api/v1/partners
POST   /api/v1/partners
GET    /api/v1/partners/:id
PATCH  /api/v1/partners/:id
POST   /api/v1/partners/:id/approve
POST   /api/v1/partners/:id/reject
POST   /api/v1/partners/:id/suspend
```

Super Admin only for administrative partner operations.

---

# 30. User APIs

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
PATCH  /api/v1/users/:id/status
PATCH  /api/v1/users/:id/role
```

---

# 31. Lead APIs

```text
GET    /api/v1/leads
POST   /api/v1/leads
GET    /api/v1/leads/:id
PATCH  /api/v1/leads/:id
DELETE /api/v1/leads/:id

POST   /api/v1/leads/:id/assign
POST   /api/v1/leads/:id/status
POST   /api/v1/leads/:id/archive

GET    /api/v1/leads/:id/activities
POST   /api/v1/leads/:id/activities

GET    /api/v1/leads/:id/follow-ups
POST   /api/v1/leads/:id/follow-ups
```

---

# 32. Admission APIs

```text
GET    /api/v1/admissions
POST   /api/v1/admissions
GET    /api/v1/admissions/:id
PATCH  /api/v1/admissions/:id

POST   /api/v1/admissions/:id/verify
POST   /api/v1/admissions/:id/cancel

GET    /api/v1/admissions/:id/payments
POST   /api/v1/admissions/:id/payments
```

---

# 33. Course APIs

```text
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:id
PATCH  /api/v1/courses/:id
DELETE /api/v1/courses/:id
```

---

# 34. Commission APIs

```text
GET    /api/v1/commissions
GET    /api/v1/commissions/:id

GET    /api/v1/commission-rules
POST   /api/v1/commission-rules
PATCH  /api/v1/commission-rules/:id

POST   /api/v1/payouts
POST   /api/v1/payouts/:id/approve
POST   /api/v1/payouts/:id/process
```

---

# 35. Reporting APIs

```text
GET /api/v1/reports/dashboard
GET /api/v1/reports/leads
GET /api/v1/reports/admissions
GET /api/v1/reports/revenue
GET /api/v1/reports/commission
GET /api/v1/reports/conversion
GET /api/v1/reports/partners
GET /api/v1/reports/courses
GET /api/v1/reports/sources
```

Common query parameters:

```text
from
to
partnerId
courseId
status
source
city
assignedTo
page
limit
sort
```

---

# 36. Dashboard Architecture

Dashboard should not perform dozens of independent frontend queries.

Instead:

```text
GET /api/v1/dashboard
```

or:

```text
GET /api/v1/reports/dashboard
```

returns aggregated information.

Example:

```json
{
  "leads": {
    "total": 1200,
    "hot": 145,
    "new": 82
  },
  "followUps": {
    "today": 24,
    "overdue": 8
  },
  "admissions": {
    "total": 145,
    "thisMonth": 21
  },
  "revenue": {
    "thisMonth": 1250000
  },
  "commission": {
    "pending": 175000,
    "paid": 425000
  }
}
```

---

# 37. Lead Creation Workflow

```text
User
 │
 ▼
Add Lead Form
 │
 ▼
Frontend Validation
 │
 ▼
POST /leads
 │
 ▼
Authentication
 │
 ▼
RBAC
 │
 ▼
Tenant Resolution
 │
 ▼
Backend Validation
 │
 ▼
Duplicate Detection
 │
 ├── Duplicate → Flag / reject according to policy
 │
 └── Unique
       │
       ▼
Create Lead
       │
       ▼
Create Activity
       │
       ▼
Create Follow-up
       │
       ▼
Notification
       │
       ▼
Response
```

---

# 38. Duplicate Detection

Initial duplicate strategy:

```text
phone exact match
OR
email exact match
```

Scoped primarily to the relevant tenant unless Super Admin is intentionally performing global detection.

Potential future enhancement:

```text
phone
email
name similarity
city
course
historical records
```

AI/fuzzy duplicate detection belongs in a future phase.

---

# 39. Lead Assignment Workflow

```text
Super Admin / Partner Admin
            │
            ▼
       Select Lead
            │
            ▼
       Select Counselor
            │
            ▼
      Validate Same Tenant
            │
            ▼
       Update assigned_to
            │
            ▼
      Create Lead Activity
            │
            ▼
        Notification
            │
            ▼
       Audit Log
```

A counselor must never be assignable across unrelated partners.

---

# 40. Lead-to-Admission Workflow

```text
Lead
 │
 ▼
Qualified
 │
 ▼
Fee Discussion
 │
 ▼
Admission Pending
 │
 ▼
Create Admission
 │
 ▼
Payment
 │
 ├── Partial
 │
 └── Full
 │
 ▼
Verification
 │
 ▼
Confirmed Admission
 │
 ├──────────────┐
 ▼              ▼
Commission      Reports
Calculation
```

Important invariant:

```text
Lead status = ADMITTED
```

should only occur when:

```text
Admission record exists
```

---

# 41. Admission Transaction

Admission creation should be atomic.

Conceptually:

```text
BEGIN TRANSACTION

1. Validate lead
2. Validate course
3. Validate tenant
4. Verify admission doesn't already exist
5. Create admission
6. Update lead status
7. Create activity
8. Calculate commission
9. Create commission record
10. Create notification
11. Create audit log

COMMIT
```

If a critical operation fails:

```text
ROLLBACK
```

This prevents situations such as:

```text
Lead = ADMITTED
but
Admission = missing
```

---

# 42. Commission Workflow

```text
Admission Confirmed
        │
        ▼
Commission Rule Lookup
        │
        ▼
Determine Partner Rule
        │
        ▼
Determine Course Rule
        │
        ▼
Calculate Commission
        │
        ▼
Create Commission Record
        │
        ▼
PENDING
        │
        ▼
APPROVED
        │
        ▼
PAID
```

Commission calculation must be implemented in a dedicated service.

Example:

```text
calculateCommission(admission)
```

not:

```text
controller.calculateCommission()
```

---

# 43. Follow-up Reminder Architecture

For Phase 1:

```text
Scheduled Worker
       │
       ▼
Find due follow-ups
       │
       ▼
Create notifications
       │
       ▼
Mark reminder generated
```

Future:

```text
Worker
 │
 ├── In-app notification
 ├── Email
 ├── WhatsApp
 └── SMS
```

---

# 44. Notification Flow

```text
Business Event
      │
      ▼
Event / Service
      │
      ▼
Notification Service
      │
      ├── Database notification
      │
      ├── Email [future]
      │
      ├── WhatsApp [future]
      │
      └── SMS [future]
```

The core CRM should not directly depend on WhatsApp.

Instead:

```text
CRM
 ↓
Notification abstraction
 ↓
Provider
```

This makes future provider changes easier.

---

# 45. Reporting Architecture

Reporting should use optimized database queries.

Example:

```text
Lead table
     +
Admission table
     +
Payment table
     +
Partner table
     +
Course table
     ↓
Aggregation Queries
     ↓
Report Service
     ↓
Dashboard / Export
```

Reports:

```text
Lead Funnel
Conversion Rate
Revenue
Admission Count
Partner Performance
Course Performance
Source Performance
City Performance
Commission
```

---

# 46. Conversion Funnel

Example:

```text
1200 Leads
   │
   ▼
800 Contacted
   │
   ▼
500 Interested
   │
   ▼
300 Demo
   │
   ▼
180 Fee Discussion
   │
   ▼
120 Admissions
```

Conversion:

```text
Admissions / Total Leads × 100
```

---

# 47. Export Architecture

For small datasets:

```text
Request
 ↓
Generate CSV/XLSX/PDF
 ↓
Return download
```

For large datasets:

```text
Export Request
      ↓
Create Export Job
      ↓
Queue
      ↓
Worker
      ↓
Generate File
      ↓
Object Storage
      ↓
Notification
      ↓
Download
```

---

# 48. Import Architecture

Lead import:

```text
CSV/XLSX
   │
   ▼
Upload
   │
   ▼
Validate headers
   │
   ▼
Validate rows
   │
   ▼
Duplicate detection
   │
   ▼
Preview errors
   │
   ▼
Confirm import
   │
   ▼
Batch insert
   │
   ▼
Import summary
```

Example result:

```text
1000 rows processed

Valid:       920
Duplicates:   55
Invalid:      25
Imported:    920
```

---

# 49. Frontend Architecture

Recommended:

```text
Next.js
TypeScript
Tailwind CSS
React
TanStack Query
React Hook Form
Zod
```

Conceptual structure:

```text
app/
│
├── (auth)/
│   ├── login/
│   └── forgot-password/
│
├── dashboard/
│
├── leads/
│   ├── page
│   ├── [id]/
│   └── new/
│
├── follow-ups/
├── admissions/
├── courses/
├── marketing/
├── commissions/
├── reports/
├── notifications/
├── settings/
│
└── admin/
    ├── partners/
    ├── users/
    └── audit-logs/
```

---

# 50. Frontend Feature Organization

Avoid putting all logic into pages.

Preferred:

```text
features/
├── auth/
├── leads/
├── followups/
├── admissions/
├── courses/
├── commissions/
├── reports/
├── notifications/
└── partners/
```

Each feature can contain:

```text
components/
hooks/
api/
schemas/
types/
utils/
```

---

# 51. Backend Architecture

Recommended structure:

```text
src/
│
├── config/
│
├── middleware/
│
├── modules/
│   │
│   ├── auth/
│   ├── users/
│   ├── partners/
│   ├── leads/
│   ├── followups/
│   ├── admissions/
│   ├── payments/
│   ├── courses/
│   ├── marketing/
│   ├── commissions/
│   ├── notifications/
│   ├── reports/
│   ├── audit/
│   └── imports/
│
├── database/
├── jobs/
├── shared/
│   ├── errors/
│   ├── validation/
│   ├── pagination/
│   └── utilities/
│
├── app.ts
└── server.ts
```

---

# 52. Backend Module Pattern

Example:

```text
modules/leads/

lead.controller.ts
lead.service.ts
lead.repository.ts
lead.routes.ts
lead.schema.ts
lead.types.ts
```

Responsibilities:

### Controller

HTTP concerns only.

```text
Request
Response
Status codes
```

### Service

Business logic.

```text
Duplicate detection
Status transitions
Assignment rules
Tenant validation
```

### Repository

Database interaction.

```text
findLead()
createLead()
updateLead()
```

### Schema

Input validation.

```text
phone
email
course
priority
status
```

---

# 53. API Error Architecture

Consistent error format:

```json
{
  "timestamp": "2026-09-10T10:30:00Z",
  "status": 400,
  "message": "Validation failed",
  "fieldErrors": {
    "phone": "Invalid phone number"
  },
  "path": "/api/v1/leads"
}
```

Common status codes:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

# 54. Security Architecture

Security layers:

```text
HTTPS
 │
 ▼
WAF / Rate limiting
 │
 ▼
Authentication
 │
 ▼
RBAC
 │
 ▼
Tenant Isolation
 │
 ▼
Input Validation
 │
 ▼
Business Rules
 │
 ▼
Database Constraints
 │
 ▼
Audit Logging
```

---

# 55. Security Requirements

Implement:

- secure password hashing
- JWT expiration
- refresh-token rotation
- HTTPS
- input validation
- output encoding
- SQL injection protection through parameterized ORM/query APIs
- XSS protection
- CSRF protection where applicable
- rate limiting
- login throttling
- secure cookies where applicable
- environment-based secrets
- audit logging
- least-privilege database credentials
- controlled exports
- account suspension
- session invalidation

Never trust:

```text
partnerId
role
userId
permissions
```

supplied by the frontend.

---

# 56. Database Constraints

Application validation is not enough.

Important database constraints:

```text
users.email UNIQUE

partner membership valid

foreign keys enforced

required fields NOT NULL

commission amounts non-negative

payment amounts non-negative
```

For tenant-sensitive uniqueness, consider composite indexes such as:

```text
(partner_id, phone)
(partner_id, email)
```

depending on the finalized duplicate policy.

---

# 57. Database Indexing

Important indexes:

```text
users.email

leads.partner_id
leads.assigned_to
leads.status
leads.phone
leads.email
leads.follow_up_date
leads.course_id
leads.created_at

follow_ups.lead_id
follow_ups.assigned_to
follow_ups.due_at
follow_ups.status

admissions.partner_id
admissions.course_id
admissions.payment_status
admissions.created_at

payments.admission_id

commission_records.partner_id
commission_records.status

audit_logs.user_id
audit_logs.partner_id
audit_logs.created_at
```

Do not blindly index every column.

Indexes should follow actual query patterns.

---

# 58. Caching

Redis is optional for the earliest MVP but useful as the platform grows.

Good cache candidates:

```text
Course catalog
Course FAQs
System settings
Permission metadata
Dashboard aggregates
```

Avoid caching highly volatile transactional data unnecessarily.

Example:

```text
Lead status
Payment state
Commission state
```

should primarily come from PostgreSQL.

---

# 59. Background Jobs

Use a worker/queue architecture for operations that don't need to block an HTTP request.

Candidates:

```text
Follow-up reminders
Email notifications
WhatsApp messages
Bulk lead imports
Large report generation
Export generation
Marketing campaign processing
Analytics aggregation
```

Conceptually:

```text
API
 │
 ▼
Queue
 │
 ▼
Worker
 │
 ▼
Task
```

---

# 60. Observability

The system should provide:

```text
Application logs
Error logs
Audit logs
Request IDs
Performance metrics
Health checks
```

Example:

```text
GET /api/v1/leads/123
requestId = req_abc123
userId = usr_456
partnerId = partner_789
duration = 142ms
status = 200
```

Sensitive information such as passwords and tokens must never be logged.

---

# 61. Health Checks

Recommended endpoints:

```text
GET /health
GET /health/live
GET /health/ready
```

Example:

```text
/liveness
    API process running?

/readiness
    API + database + required dependencies ready?
```

---

# 62. Deployment Architecture

Recommended production arrangement:

```text
                     INTERNET
                         │
                         ▼
                 ┌──────────────┐
                 │ CDN / WAF    │
                 └──────┬───────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
       Next.js App             API Server
       Vercel                  Node/Express
                                    │
                       ┌────────────┼────────────┐
                       ▼            ▼            ▼
                  PostgreSQL      Redis      Object Storage
```

Possible providers:

```text
Frontend:
Vercel

Backend:
AWS / Render / Railway / VPS

Database:
Managed PostgreSQL

Storage:
S3-compatible object storage
```

The exact provider can be selected after deployment requirements and budget are finalized.

---

# 63. Environment Separation

Maintain:

```text
development
staging
production
```

Never use production credentials locally.

Example:

```text
.env.local
.env.staging
.env.production
```

Secrets should preferably be stored in the hosting provider's secret/environment management system.

---

# 64. CI/CD Pipeline

```text
Developer
   │
   ▼
Git Push
   │
   ▼
Pull Request
   │
   ├── Lint
   ├── Type Check
   ├── Unit Tests
   ├── Integration Tests
   └── Build
          │
          ▼
      Code Review
          │
          ▼
       Merge
          │
          ▼
       Staging
          │
          ▼
   Smoke / E2E Tests
          │
          ▼
      Production
```

---

# 65. Testing Strategy

Testing pyramid:

```text
             E2E
            /   \
           /     \
      Integration
        /       \
       /         \
     Unit Tests
```

## Unit Tests

Test:

```text
Commission calculation
Lead status transitions
Duplicate detection
Permission checks
Validation
```

## Integration Tests

Test:

```text
API + PostgreSQL
Authentication
Tenant isolation
Lead creation
Admission conversion
Commission creation
```

## E2E Tests

Test critical workflows:

```text
Login
 ↓
Partner Dashboard
 ↓
Create Lead
 ↓
Assign Lead
 ↓
Schedule Follow-up
 ↓
Convert Admission
 ↓
Payment
 ↓
Commission
 ↓
Report
```

---

# 66. Critical Security Test

One of the most important tests:

```text
Partner A logs in
        ↓
Attempts to request Partner B lead
        ↓
API checks tenant
        ↓
403 Forbidden
```

The system must never depend solely on frontend route hiding.

---

# 67. Role Matrix

| Feature | Super Admin | Partner Admin | Counselor | Support |
|---|---:|---:|---:|---:|
| Global Dashboard | ✓ | — | — | — |
| Own Dashboard | ✓ | ✓ | ✓ | ✓ |
| Partner Management | ✓ | — | — | Limited |
| Lead View | All | Own | Assigned | Limited |
| Lead Create | ✓ | ✓ | ✓ | — |
| Lead Assignment | ✓ | ✓ | Limited | — |
| Follow-ups | ✓ | ✓ | Assigned | — |
| Admissions | ✓ | ✓ | Limited | — |
| Courses | ✓ | View | View | View |
| Marketing | ✓ | ✓ | ✓ | Limited |
| Commission | ✓ | Own | — | — |
| Reports | All | Own | Limited | Limited |
| Export | ✓ | Permission-based | — | — |
| User Management | ✓ | Own team | — | — |
| Audit Logs | ✓ | — | — | — |
| System Settings | ✓ | — | — | — |

The final permission matrix should be implemented through permissions rather than hard-coding role names throughout the application.

---

# 68. Frontend Navigation

## Super Admin

```text
Dashboard

Partners
├── All Partners
├── Pending Approval
└── Partner Performance

Leads
├── All Leads
├── Unassigned
└── Duplicate Leads

Admissions

Courses

Marketing

Commissions

Reports

Notifications

Users & Roles

Audit Logs

Settings
```

## Partner Admin

```text
Dashboard

Leads
├── All Leads
├── Add Lead
└── Follow-ups

Admissions

Courses

Marketing

Commissions

Reports

Team

Notifications

Settings
```

## Counselor

```text
Dashboard

My Leads

Follow-ups

Admissions

Courses

Marketing

Notifications

Profile
```

---

# 69. Dashboard Design

Super Admin dashboard:

```text
┌──────────────────────────────────────────────┐
│ Total Partners │ Leads │ Admissions │ Revenue│
└──────────────────────────────────────────────┘

┌───────────────────┐ ┌────────────────────────┐
│ Lead Funnel       │ │ Admission Trend        │
│                   │ │                        │
└───────────────────┘ └────────────────────────┘

┌───────────────────┐ ┌────────────────────────┐
│ Partner Rankings  │ │ Course Performance     │
└───────────────────┘ └────────────────────────┘

┌──────────────────────────────────────────────┐
│ Urgent Follow-ups                            │
└──────────────────────────────────────────────┘
```

Partner dashboard:

```text
Total Leads
Hot Leads
Today's Follow-ups
Admissions
Conversion Rate
Pending Commission
Paid Commission
```

---

# 70. Data Flow — Complete Admission Lifecycle

```text
                 PARTNER
                    │
                    ▼
              CREATE LEAD
                    │
                    ▼
            DUPLICATE CHECK
                    │
                    ▼
               ASSIGNMENT
                    │
                    ▼
                CONTACT
                    │
                    ▼
             FOLLOW-UP TASK
                    │
                    ▼
              DEMO / BROCHURE
                    │
                    ▼
              FEE DISCUSSION
                    │
                    ▼
           ADMISSION PENDING
                    │
                    ▼
             CREATE ADMISSION
                    │
                    ▼
                 PAYMENT
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       PARTIAL               FULL
          │                   │
          └─────────┬─────────┘
                    ▼
               VERIFICATION
                    │
                    ▼
              CONFIRMED
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      COMMISSION            REPORTS
          │
          ▼
       PENDING
          │
          ▼
       APPROVED
          │
          ▼
         PAID
```

---

# 71. System Boundaries

## Inside Phase 1

```text
Authentication
RBAC
Partners
Users
Leads
Follow-ups
Admissions
Courses
Basic Reports
Dashboard
Audit
```

## Phase 2

```text
Marketing
Commission
Notifications
Import/Export
Advanced Reports
```

## Phase 3

```text
WhatsApp
Email automation
Payment gateway
Automated reminders
Campaigns
```

## Phase 4

```text
AI Lead Scoring
Prediction
Next-best action
Smart recommendations
```

## Phase 5

```text
LMS
Quizzes
Certificates
Mobile application
Franchise management
```

---

# 72. Future AI Architecture

AI should not be embedded directly into core transactional services.

Recommended future architecture:

```text
CRM Database
      │
      ▼
Analytics / Feature Pipeline
      │
      ▼
AI Service
      │
      ├── Lead Score
      ├── Conversion Probability
      ├── Next Best Action
      └── Follow-up Recommendation
      │
      ▼
CRM
```

Example:

```text
Lead
 │
 ├── Recent activity
 ├── Course interest
 ├── Response rate
 ├── Follow-up history
 ├── Source
 └── Engagement
        │
        ▼
 AI Model
        │
        ▼
 Score = 87/100
        │
        ▼
 "High-intent lead — contact today"
```

AI must augment the CRM rather than become the source of truth for transactional state.

---

# 73. Future WhatsApp Architecture

Do not make the Lead service directly dependent on WhatsApp.

Use:

```text
Lead Service
     │
     ▼
Communication Service
     │
     ▼
WhatsApp Adapter
     │
     ▼
WhatsApp Business API
```

Later:

```text
Communication Service
        │
        ├── WhatsApp
        ├── Email
        ├── SMS
        └── Push
```

---

# 74. Future Payment Architecture

```text
Admission
   │
   ▼
Payment Service
   │
   ▼
Payment Gateway
   │
   ▼
Webhook
   │
   ▼
Verify Transaction
   │
   ▼
Update Payment
   │
   ▼
Admission
   │
   ▼
Commission
```

Payment gateway callbacks must be independently verified rather than trusting the browser.

---

# 75. Key Architectural Invariants

The following rules must always remain true:

### Invariant 1

```text
Partner user cannot access another partner's records.
```

### Invariant 2

```text
Lead marked ADMITTED
→ admission record must exist.
```

### Invariant 3

```text
Admission commission
→ must reference a valid commission rule/calculation.
```

### Invariant 4

```text
Audit records are append-only.
```

### Invariant 5

```text
Unauthorized frontend actions must also fail at the API.
```

### Invariant 6

```text
A suspended user cannot authenticate into the system.
```

### Invariant 7

```text
Counselor can operate only on permitted assigned records.
```

### Invariant 8

```text
Financial records should never be silently overwritten.
```

Use payment records/history instead of destructive updates.

---

# 76. Recommended MVP Architecture

For the first production version:

```text
Next.js
      │
      ▼
Node.js + Express
      │
      ▼
PostgreSQL
      │
      ├── Redis [optional initially]
      │
      └── Object Storage
```

Core modules:

```text
Auth
Users
Partners
Leads
Follow-ups
Admissions
Courses
Dashboard
Reports
Audit
```

Do not build these prematurely:

```text
Microservices
Kubernetes
AI infrastructure
Event streaming platform
Complex workflow engine
Real-time collaboration
Mobile app
Payment gateway
WhatsApp automation
```

Build the transactional core first.

---

# 77. Suggested Development Phases

## Phase 0 — Foundation

```text
Repository
Environment configuration
Database
Migrations
API framework
Frontend framework
CI/CD
Error handling
Logging
```

## Phase 1 — Identity

```text
Authentication
Users
Roles
Permissions
Partner tenancy
Session management
```

## Phase 2 — CRM Core

```text
Partners
Leads
Assignments
Lead activities
Follow-ups
Lead timeline
```

## Phase 3 — Admissions

```text
Admission
Payment tracking
Course integration
Admission verification
```

## Phase 4 — Business Intelligence

```text
Dashboard
Reports
Conversion funnel
Partner performance
Course performance
```

## Phase 5 — Commercial

```text
Commission rules
Commission records
Payouts
```

## Phase 6 — Operations

```text
Marketing
Notifications
Import
Export
```

## Phase 7 — Integrations

```text
WhatsApp
Email
Payments
```

## Phase 8 — Intelligence

```text
AI scoring
Predictions
Recommendations
Automation
```

---

# 78. Recommended Repository Structure

A monorepo is appropriate:

```text
whitedavid23_academy/
│
├── apps/
│   │
│   ├── web/
│   │   └── Next.js application
│   │
│   └── api/
│       └── Express backend
│
├── packages/
│   │
│   ├── types/
│   ├── validation/
│   ├── ui/
│   └── config/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── workflows/
│
├── .github/
│   └── workflows/
│
├── docker/
│
├── README.md
└── package.json
```

A simpler two-repository architecture is also valid:

```text
whitedavid23-web
whitedavid23-api
```

The choice can depend on team size and deployment workflow.

---

# 79. Architecture Decision Summary

| Area | Decision |
|---|---|
| Architecture | Modular Monolith |
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma / Drizzle / equivalent |
| Authentication | JWT + Refresh Token |
| Authorization | RBAC + Permission checks |
| Tenancy | Shared DB + `partner_id` isolation |
| Cache | Redis when required |
| Queue | Redis-backed worker/queue |
| File Storage | S3-compatible object storage |
| API | REST `/api/v1` |
| Validation | Zod / equivalent |
| Reporting | SQL aggregation |
| Logging | Structured application logs |
| Audit | Append-only audit records |
| Frontend Hosting | Vercel or equivalent |
| Backend Hosting | AWS / Render / equivalent |
| Database | Managed PostgreSQL |
| CI/CD | GitHub Actions |
| Testing | Unit + Integration + E2E |
| AI | Separate future service |
| WhatsApp | Adapter/integration layer |
| Payments | Dedicated payment service |
| Deployment Style | Container/cloud compatible |

---

# 80. Final Architecture

The resulting system can be visualized as:

```text
                         ┌───────────────────────┐
                         │       USERS           │
                         │                       │
                         │ Admin / Partner /     │
                         │ Counselor / Support   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │       NEXT.JS         │
                         │     Web Frontend      │
                         └───────────┬───────────┘
                                     │
                                  HTTPS
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │         EXPRESS API             │
                    │                                │
                    │ Authentication                 │
                    │ RBAC                           │
                    │ Tenant Isolation               │
                    │                                │
                    │ ┌────────────────────────────┐ │
                    │ │ Partner                    │ │
                    │ │ User                       │ │
                    │ │ Lead                       │ │
                    │ │ Follow-up                  │ │
                    │ │ Admission                  │ │
                    │ │ Payment                    │ │
                    │ │ Course                     │ │
                    │ │ Marketing                  │ │
                    │ │ Commission                 │ │
                    │ │ Notification               │ │
                    │ │ Reporting                  │ │
                    │ │ Audit                      │ │
                    │ └────────────────────────────┘ │
                    └───────────────┬────────────────┘
                                    │
                   ┌────────────────┼─────────────────┐
                   │                │                 │
                   ▼                ▼                 ▼
          ┌────────────────┐ ┌─────────────┐ ┌──────────────┐
          │  PostgreSQL    │ │    Redis    │ │ Object Store │
          │                │ │             │ │              │
          │ Source of      │ │ Cache       │ │ Brochures    │
          │ Truth          │ │ Queue       │ │ Posters      │
          │                │ │ Jobs        │ │ Documents    │
          └────────────────┘ └─────────────┘ └──────────────┘
                   │
                   │
                   ▼
          ┌──────────────────────┐
          │ Analytics / Reports  │
          └──────────────────────┘


                 FUTURE INTEGRATION LAYER
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
         WhatsApp        Payments       Email/SMS
             │             │              │
             └─────────────┼──────────────┘
                           ▼
                    Automation Layer
                           │
                           ▼
                      AI Services
```

---

# 81. Final Engineering Recommendation

The most important architectural principle for `whitedavid23_academy` is:

> **Build the CRM transactionally and modularly first; add automation and AI around the stable core later.**

The first version should therefore optimize for:

```text
Correctness
   ↓
Security
   ↓
Tenant Isolation
   ↓
Maintainability
   ↓
Testability
   ↓
Performance
   ↓
Scalability
```

rather than prematurely optimizing for microservices or AI.

The **PostgreSQL database should remain the authoritative source of truth** for partners, users, leads, follow-ups, admissions, payments, commissions, and audit history.

The application should expose those capabilities through a versioned REST API, while the frontend remains a consumer of that API rather than containing business rules.

The architecture should consequently be capable of evolving:

```text
                    TODAY
                      │
                      ▼
             Modular Monolith
                      │
             ┌────────┴────────┐
             ▼                 ▼
        Automation          Analytics
             │                 │
             ▼                 ▼
        Integrations        AI Layer
             │                 │
             └────────┬────────┘
                      ▼
               FUTURE SCALE
                      │
                      ▼
          Extract services only when
          actual scale/ownership/
          operational requirements
          justify doing so.
```

This gives WhiteDavid23 a **production-oriented foundation without over-engineering the MVP**.