# WhiteDavid23 Academy
## Frontend System Design
### Partner Portal / Admission CRM Platform

**Frontend:** Next.js + TypeScript  
**UI:** Tailwind CSS  
**Architecture:** Feature-oriented modular frontend  
**API:** REST `/api/v1`  
**Primary Target:** Desktop + Android/mobile responsive web

---

# 1. Frontend Responsibilities

The frontend is responsible for:

- user interface
- navigation
- responsive layouts
- forms
- client-side validation
- API communication
- loading states
- error states
- table/filter interfaces
- dashboard visualization
- permission-aware UI
- notifications
- user interactions
- accessibility
- responsive mobile experience

The frontend is **not responsible for enforcing security**.

Backend authorization remains authoritative.

---

# 2. Frontend Architecture

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Next.js        │
                    │      App Router     │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
       UI Components       Feature Modules     Layouts
            │                  │
            └──────────────────┼──────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ API / Query Layer   │
                    │ TanStack Query      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ REST Backend API    │
                    └─────────────────────┘
```

---

# 3. Recommended Frontend Stack

```text
Next.js
TypeScript
Tailwind CSS

TanStack Query
React Hook Form
Zod

Recharts
Lucide Icons

Axios or fetch wrapper

Vitest/Jest
Testing Library
Playwright
```

---

# 4. Frontend Directory Structure

```text
frontend/
│
├── src/
│   │
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   ├── follow-ups/
│   │   │   ├── admissions/
│   │   │   ├── courses/
│   │   │   ├── marketing/
│   │   │   ├── commissions/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   │
│   │   └── admin/
│   │       ├── partners/
│   │       ├── users/
│   │       └── audit-logs/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── followups/
│   │   ├── admissions/
│   │   ├── courses/
│   │   ├── marketing/
│   │   ├── commissions/
│   │   ├── reports/
│   │   ├── partners/
│   │   └── users/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── tables/
│   │   ├── forms/
│   │   ├── charts/
│   │   └── feedback/
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── permissions/
│   │   └── utilities/
│   │
│   ├── hooks/
│   ├── types/
│   ├── schemas/
│   └── constants/
│
├── public/
├── tests/
└── package.json
```

---

# 5. Application Layout

Authenticated users enter:

```text
┌─────────────────────────────────────────────────┐
│ Topbar                              Notifications│
├───────────────┬─────────────────────────────────┤
│               │                                 │
│ Sidebar       │             Main                │
│               │             Content             │
│ Dashboard     │                                 │
│ Leads         │                                 │
│ Follow-ups    │                                 │
│ Admissions    │                                 │
│ Courses       │                                 │
│ Marketing     │                                 │
│ Commission    │                                 │
│ Reports       │                                 │
│ Settings      │                                 │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

On mobile:

```text
┌──────────────────────┐
│ ☰   WhiteDavid23  🔔 │
├──────────────────────┤
│                      │
│      Content         │
│                      │
│                      │
├──────────────────────┤
│ Dashboard Leads ...  │
└──────────────────────┘
```

---

# 6. Role-Aware Navigation

Navigation is generated from permissions.

Example:

```text
SUPER_ADMIN
 ├── Dashboard
 ├── Partners
 ├── Leads
 ├── Admissions
 ├── Courses
 ├── Marketing
 ├── Commissions
 ├── Reports
 ├── Users
 └── Audit Logs
```

Partner:

```text
PARTNER_ADMIN
 ├── Dashboard
 ├── Leads
 ├── Follow-ups
 ├── Admissions
 ├── Courses
 ├── Marketing
 ├── Commissions
 ├── Reports
 └── Team
```

Counselor:

```text
COUNSELOR
 ├── Dashboard
 ├── My Leads
 ├── Follow-ups
 ├── Admissions
 ├── Courses
 └── Marketing
```

Hiding a navigation item is UX.

It is **not security**.

---

# 7. Authentication State

Frontend authentication should maintain:

```text
user
role
permissions
partner
session
```

Conceptual:

```text
AuthProvider
     │
     ├── user
     ├── role
     ├── permissions
     └── session state
```

On startup:

```text
Browser
 ↓
Restore session
 ↓
GET /auth/me
 ↓
Load user
 ↓
Load permissions
 ↓
Render application
```

---

# 8. Route Protection

Protected routes:

```text
/dashboard
/leads
/admissions
/reports
/settings
```

Unauthenticated user:

```text
protected route
      ↓
not authenticated
      ↓
/login
```

Unauthorized user:

```text
authenticated
      ↓
no required permission
      ↓
403 / Access Denied
```

---

# 9. Dashboard

Dashboard should be role-specific.

## Super Admin

```text
Total Partners
Total Leads
Admissions
Revenue
Conversion
Commission
Partner Performance
Course Performance
```

## Partner Admin

```text
My Leads
Hot Leads
Today's Follow-ups
Admissions
Conversion
Commission
```

## Counselor

```text
Assigned Leads
Today's Tasks
Overdue Follow-ups
Recent Activity
```

---

# 10. Lead List

Features:

```text
Search
Filter
Sort
Pagination
Status filter
Priority filter
Course filter
Assigned user
Date range
Bulk actions
```

Example:

```text
┌─────────────────────────────────────────────┐
│ Search leads...       Filter   + Add Lead  │
├─────────────────────────────────────────────┤
│ Name │ Phone │ Course │ Status │ Owner     │
├─────────────────────────────────────────────┤
│ Rahul│ ...   │ Java   │ Hot    │ Ahmed     │
│ Sana │ ...   │ AI     │ Demo   │ Ayan      │
└─────────────────────────────────────────────┘
```

---

# 11. Lead Details

Lead detail page:

```text
┌──────────────────────────────────────────────┐
│ Rahul Kumar                 HOT              │
│ Phone | WhatsApp | Email                     │
├──────────────────────────────────────────────┤
│ Course: Java Backend                         │
│ Source: Website                              │
│ Budget: ₹50,000                              │
├──────────────────────────────────────────────┤
│ Next Follow-up: Tomorrow 10:00 AM             │
├──────────────────────────────────────────────┤
│ Timeline                                     │
│                                              │
│ Created                                      │
│       ↓                                      │
│ Called                                       │
│       ↓                                      │
│ Brochure Sent                                │
│       ↓                                      │
│ Demo Booked                                  │
└──────────────────────────────────────────────┘
```

---

# 12. Lead Form

Form fields:

```text
Name *
Phone *
WhatsApp
Email
City
Course *
Source
Budget
Priority
Status
Follow-up date
Assigned user
Notes
```

Validation:

```text
required fields
phone format
email format
valid dates
valid enum values
```

Use shared schemas where possible.

---

# 13. Follow-up Center

Main views:

```text
Today's Follow-ups
Overdue
Upcoming
Completed
Snoozed
```

Calendar:

```text
Monday
 ├── 10:00 Rahul
 ├── 11:30 Sana
 └── 15:00 Ahmed

Tuesday
 └── ...
```

Each task should provide quick actions:

```text
Complete
Reschedule
Snooze
Call
WhatsApp
Add Note
```

---

# 14. Admissions UI

Admission list:

```text
Student
Course
Partner
Fee
Payment
Status
Joining Date
Commission
```

Admission details:

```text
Student Information
Course Information
Payment History
Documents
Verification
Commission
Activity
```

---

# 15. Course UI

Course cards:

```text
┌─────────────────────┐
│ Java Backend        │
│ 6 Months            │
│ ₹50,000             │
│                     │
│ View Course         │
│ Brochure            │
│ Demo                │
└─────────────────────┘
```

Course details:

```text
Overview
Duration
Fee
Benefits
Syllabus
Brochure
Demo
FAQ
```

---

# 16. Marketing Center

Categories:

```text
Posters
Banners
Brochures
WhatsApp Templates
Captions
Videos
Testimonials
```

Actions:

```text
Preview
Download
Share
Copy Text
```

---

# 17. Commission UI

Dashboard cards:

```text
Earned
Pending
Approved
Paid
```

Commission table:

```text
Admission
Course
Fee
Rate
Commission
Status
Date
```

Partner users only see their own commission data.

---

# 18. Reports UI

Reports should provide:

```text
Date range
Partner
Course
Status
Source
City
```

Charts:

```text
Lead funnel
Admission trend
Revenue trend
Partner performance
Course performance
Conversion rate
```

Exports:

```text
CSV
Excel
PDF
```

Export actions should respect backend permissions.

---

# 19. API Integration Layer

Do not scatter raw API calls throughout components.

Bad:

```text
page.tsx
fetch(...)
fetch(...)
fetch(...)
```

Preferred:

```text
features/leads/api.ts

getLeads()
getLead()
createLead()
updateLead()
assignLead()
changeLeadStatus()
```

Then:

```text
React Component
      ↓
Feature API / Hook
      ↓
API Client
      ↓
Backend
```

---

# 20. TanStack Query Architecture

Use query caching for server state.

Example conceptual hooks:

```text
useLeads()
useLead(id)
useCreateLead()
useUpdateLead()
useAssignLead()
useFollowUps()
useAdmissions()
useDashboard()
```

Mutation:

```text
Create Lead
 ↓
POST /leads
 ↓
Invalidate leads query
 ↓
Refresh list
```

---

# 21. State Management

Separate state into:

### Server State

```text
leads
admissions
courses
reports
notifications
```

Use TanStack Query.

### Local UI State

```text
modal open
sidebar collapsed
selected rows
filters
```

Use React state.

### Form State

Use React Hook Form.

### Authentication State

Use a dedicated auth/session mechanism.

Avoid putting the entire application state into one global store.

---

# 22. Loading States

Every API-driven page should have:

```text
Loading
Success
Empty
Error
```

Example:

```text
Loading:
Skeleton

Success:
Table

Empty:
"No leads yet"
"+ Add Lead"

Error:
"Unable to load leads"
"Retry"
```

---

# 23. Error Handling

API error:

```json
{
  "status": 403,
  "message": "You do not have permission to perform this action"
}
```

Frontend:

```text
403
 ↓
Permission error UI
```

Validation error:

```text
fieldErrors
 ↓
Attach errors to form fields
```

---

# 24. Responsive Design

Breakpoints should support:

```text
Mobile
Tablet
Desktop
Large desktop
```

Mobile priorities:

```text
lead details
follow-ups
quick actions
admission updates
notifications
```

Large tables should become:

```text
responsive cards
horizontal scroll
or
priority-column layouts
```

Do not simply shrink desktop tables until they become unusable.

---

# 25. Component Architecture

Shared UI:

```text
Button
Input
Select
Modal
Dialog
Dropdown
Badge
Card
Table
Pagination
Tabs
Toast
Skeleton
EmptyState
ErrorState
```

Business components:

```text
LeadCard
LeadStatusBadge
LeadTimeline
FollowUpCard
AdmissionStatusBadge
CommissionCard
PartnerCard
```

---

# 26. Design System

Define centrally:

```text
Typography
Spacing
Radius
Shadows
Buttons
Forms
Status badges
Tables
Cards
Modals
Alerts
```

Status colors should have consistent semantic meaning:

```text
success
warning
danger
info
neutral
```

Avoid arbitrary per-page styling.

---

# 27. Permission-Aware UI

Example:

```text
if permission = LEAD_ASSIGN
    show "Assign Lead"

if permission = COMMISSION_VIEW
    show "Commission"

if permission = PARTNER_APPROVE
    show "Approve"
```

But backend still verifies:

```text
POST /partners/:id/approve
```

The frontend should never assume that hiding a button grants security.

---

# 28. Optimistic Updates

Use carefully.

Good candidates:

```text
mark notification read
toggle UI preference
```

Use caution with:

```text
admission status
payment
commission
partner approval
lead transfer
```

Financial and sensitive state should generally wait for server confirmation.

---

# 29. Accessibility

Frontend should support:

```text
keyboard navigation
visible focus
semantic HTML
labels
ARIA where necessary
sufficient contrast
screen-reader friendly forms
error announcements
```

---

# 30. Frontend Testing

## Unit

Test:

```text
components
formatters
validators
permission utilities
```

## Integration

Test:

```text
forms
API states
filters
tables
modals
```

## E2E

Critical journeys:

```text
Login
Create lead
Assign lead
Schedule follow-up
Convert admission
Record payment
View report
```

---

# 31. Frontend Performance

Use:

```text
server rendering where appropriate
lazy loading
code splitting
image optimization
pagination
query caching
debounced search
virtualization for very large lists
```

Do not load thousands of leads into the browser just to filter them locally.

Filtering should normally happen through the API.

---

# 32. Frontend Security

Never put secrets in:

```text
NEXT_PUBLIC_*
```

Anything public to the browser must be assumed visible.

Do not store sensitive authentication information carelessly in localStorage.

Prefer secure, appropriate cookie/token strategies.

---

# 33. Frontend Environment

Example:

```text
NEXT_PUBLIC_API_URL=https://api.example.com
```

Only public configuration belongs in `NEXT_PUBLIC_*`.

Private secrets remain server-side.

---

# 34. Frontend Definition of Done

A feature is complete when:

```text
✓ Page exists
✓ Responsive layout works
✓ API integration works
✓ Loading state exists
✓ Empty state exists
✓ Error state exists
✓ Form validation exists
✓ Permission-aware UI exists
✓ Accessibility considered
✓ Mobile tested
✓ E2E path tested
```

---

# 35. Frontend Architectural Principle

The frontend should follow:

```text
Page
 ↓
Feature
 ↓
Hook
 ↓
API Client
 ↓
Backend
```

rather than:

```text
Page
 ↓
Everything
```

Keep pages thin and feature modules responsible for their own domain UI.