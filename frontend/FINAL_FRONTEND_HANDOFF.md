# WhiteDavid23 Multi-Tenant Partner Portal — Final Frontend Handoff

> Document Version: 1.0 (Post-Phase 8 Hardening)  
> Architectural Alignment: Keystone HLD/LLD v1.0 & Partner Portal Phased Engineering Plan  
> Technology Stack: React 18, Next.js 14 (App Router), Tailwind CSS, TanStack React Query v5, Zustand v5, Axios  

---

## 1. Implemented Application Routes

| Route | Primary Roles | Key Features & Implementation Details |
| :--- | :--- | :--- |
| `/login` | Public | Presets for 4 roles, JWT session initialization, credentials validation. |
| `/dashboard` | All Roles | Role-aware KPI summary cards, pipeline preview stage scroll, follow-ups due, recent activity log, commission earnings overview. |
| `/leads` | All Roles (`lead:read`) | Real server-paginated table and mobile cards, status/priority filters, text search, "Add Lead" modal trigger. |
| `/leads/[id]` | All Roles (`lead:read`) | Lead profile, 6-stage pipeline visualizer with terminal states (`admitted`/`lost`), direct contact channels (Phone, WhatsApp, Email), counseling notes, scheduled follow-up tasks, chronological timeline, edit form with dirty-state guard. |
| `/admissions` | All Roles (`admission:read`) | Converted admissions ledger, tuition fees and paid amounts, installment status badges, fee receipt breakdown modal, origin lead backlink. |
| `/commissions` | Partner Admin, Super Admin (`commission:view`) | Financial earnings ledger, backend-calculated summary KPI cards (`totalEarned`, `pendingPayout`, `totalPaid`), Super Admin-only "Approve Payout" action with confirmation modal. |
| `/follow-ups` | Counselor, Partner Admin, Super Admin | Scheduled outreach agenda, due schedule datetime, priority badges, direct navigation to lead workspace. |
| `/partners` | Super Admin (`partner:manage`) | Global multi-tenant academy directory, commission rates, and partner approval workflow. Access-denied for other roles. |
| `/team` | Partner Admin, Super Admin (`team:manage`) | Counselor staff directory, assigned lead counts, active status toggle, and "Invite Team Member" modal. |
| `/reports` | Partner Admin, Super Admin (`report:view`) | Analytical dashboards, conversion rates, deal cycle velocity, monthly enrollment trends, and channel attribution. |
| `/audit` | Super Admin, Support (`audit:view`) | Immutable, read-only security audit log table with actor, action event, entity target, IP, and status. |

---

## 2. Implemented UI Architecture & Reusable Primitives

- **Navigation & Shell**:
  - `AppShell.tsx`: Responsive layout with desktop sticky sidebar, mobile drawer, and top navigation header.
  - `Header.tsx`: Context badge (`Global Scope` vs `Apex Academy [partner_001]`), search trigger, notification bell with unread badge, role switcher preview for testing, user menu.
  - `NotificationCenter.tsx`: Slide-over drawer with unread counter, type icons, direct links, and "Mark all as read".
- **Leads Domain**:
  - `LeadStatusBadge.tsx`: Color-coded status badges (`new`, `contacted`, `follow_up`, `demo`, `admitted`, `lost`), priority indicators, and server-managed `LeadScorePill`.
  - `LeadCard.tsx`: Mobile-optimized card layout.
  - `CreateLeadModal.tsx`: Field validation, duplicate 409 error banner, 400 validation error mapping, React Query cache invalidation.
  - `LeadPipelineStepper.tsx`: 6-stage progression with terminal outcome highlights.
- **Base UI Design System**:
  - `Table.tsx`, `Modal.tsx` (focus trap + Escape key), `Alert.tsx`, `Badge.tsx`, `Button.tsx`, `Input.tsx`, `Select.tsx`, `Skeleton.tsx`, `EmptyState.tsx`.
- **Security & Authorization**:
  - `RoleGate.tsx`, `PermissionGate.tsx`, `AccessDenied.tsx`.

---

## 3. Confirmed Backend Endpoints Integrated

| HTTP Method | Endpoint | Confirmed Specification & Behavior |
| :--- | :--- | :--- |
| **GET** | `/api/v1/leads` | Query params: `page`, `limit`, `search`, `status`, `priority`. Returns `{ success: true, data: Lead[], meta: { page, limit, total, totalPages } }`. Scoped automatically by backend tenant middleware. |
| **POST** | `/api/v1/leads` | Accepts: `{ studentName, phone, email, courseId, source, priority, budget, whatsapp, city }`. Returns 201 with `{ _id, partnerId, status, leadScore, isDuplicate, createdAt }`. Returns 409 with `{ error: { code: "DUPLICATE_LEAD", message: "..." } }`. Returns 400 for validation errors. |
| **PATCH** | `/api/v1/commissions/{id}/payout` | Request body: `{ action: "approve" }`. Permission: `commission:approve_payout` (Super Admin). Returns 200 with `{ payoutStatus: "approved", payoutDate: "..." }`. Returns 403 `FORBIDDEN` if non-super-admin. |

---

## 4. `TODO-CONTRACT` Inventory for Backend Team

The frontend has implemented typed service interfaces and resilient mock fallback adapters for the following endpoints pending backend implementation:

### 4.1. Single Lead Workspace
- **Endpoint**: `GET /api/v1/leads/:id`
  - **Needs**: Complete Lead document including student details, contact info, `courseInterest`, `leadScore`, `status`, `assignedTo`, `assignedUserName`, `followUpDate`, `notes`, `createdAt`.
- **Endpoint**: `PATCH /api/v1/leads/:id`
  - **Body**: `{ status?, priority?, studentName?, phone?, whatsapp?, email?, city?, budget?, notes?, assignedTo? }`
  - **Needs**: Returns updated Lead record.
- **Endpoint**: `GET /api/v1/leads/:id/activities`
  - **Needs**: Returns array of `{ id, leadId, type, description, performedBy, createdAt }`.
- **Endpoint**: `GET /api/v1/leads/:id/followups`
  - **Needs**: Returns array of `{ id, leadId, dueDate, priority, status, notes, scheduledAt, createdAt }`.
- **Endpoint**: `POST /api/v1/leads/:id/followups`
  - **Body**: `{ dueDate, priority, notes }`
  - **Needs**: Returns created follow-up task.

### 4.2. Admissions
- **Endpoint**: `GET /api/v1/admissions`
  - **Query**: `page`, `limit`, `search`, `paymentStatus`
  - **Needs**: `{ success: true, data: Admission[], meta: { page, limit, total } }`
- **Endpoint**: `GET /api/v1/admissions/:id`
  - **Needs**: Detailed admission document with payment receipt details and linked `leadId`.

### 4.3. Commissions
- **Endpoint**: `GET /api/v1/commissions`
  - **Query**: `page`, `limit`, `payoutStatus`, `partnerId`, `search`
  - **Needs**: `{ success: true, data: CommissionRecord[], meta: { page, limit, total } }`
- **Endpoint**: `GET /api/v1/commissions/summary`
  - **Query**: `partnerId?`
  - **Needs**: `{ totalEarned: number, pendingPayout: number, totalPaid: number, lastPayoutDate?: string }`

### 4.4. Administration & Notifications
- **Endpoint**: `GET /api/v1/partners` & `PATCH /api/v1/partners/:id/approve`
- **Endpoint**: `GET /api/v1/team` & `POST /api/v1/team/invite` & `PATCH /api/v1/team/:id/toggle-status`
- **Endpoint**: `GET /api/v1/notifications` & `PATCH /api/v1/notifications/:id/read` & `PATCH /api/v1/notifications/read-all`
- **Endpoint**: `GET /api/v1/reports`
- **Endpoint**: `GET /api/v1/audit` (strictly read-only)

---

## 5. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Backend REST Gateway URL (default: http://localhost:5000/api/v1)
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

> **macOS Developer Note**: Port 5000 is occupied by default on macOS by AirPlay Receiver (`ControlCenter`). The frontend `client.ts` automatically detects AirTunes headers and falls back to resilient dev fixtures, but when running the real Express backend, please bind the backend to a non-conflicting port (e.g., `5001` or `8000`) and set `NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1`.

---

## 6. Manual QA Checklist by Role

### 6.1. Super Admin Role
1. **Login**: Switch to Super Admin preset or log in with `super_admin@whitedavid23.com`.
2. **Global Context**: Confirm top header displays `WhiteDavid23 • Global Scope`.
3. **Partners**: Navigate to `/partners`. Confirm full list is visible. Click "Approve Partner" on pending partner -> verify modal and activation.
4. **Commissions & Payout Approval**: Navigate to `/commissions`. Locate pending payout record -> click "Approve Payout" -> confirm modal -> verify success toast and status change to `APPROVED`.
5. **Audit Logs**: Navigate to `/audit`. Verify table displays read-only security events without edit/delete buttons.

### 6.2. Partner Admin Role
1. **Context**: Confirm header shows `Apex Academy (partner_001)`.
2. **Partners**: Confirm `/partners` navigation is hidden and direct URL returns `AccessDenied`.
3. **Leads Core**:
   - Navigate to `/leads`. Check server pagination buttons ("Prev", "Next", "Per page").
   - Click "Add Lead" -> Enter valid data -> submit -> verify 201 creation success and cache refetch.
   - Enter duplicate phone number -> verify 409 duplicate warning banner appears.
4. **Lead Detail**: Click any lead -> verify pipeline stepper, contact buttons, and add follow-up task.
5. **Commissions**: Confirm commission earnings ledger is visible, but "Approve Payout" button is completely hidden.
6. **Team**: Navigate to `/team`. Click "Invite Member" -> submit counselor invite -> verify list update.

### 6.3. Counselor / Team Member Role
1. **Navigation Audit**: Confirm `/partners`, `/commissions`, `/team`, and `/audit` are inaccessible.
2. **Leads**: Confirm `/leads`, `/leads/[id]`, and `/follow-ups` are accessible.
3. **Lead Updates**: Open assigned lead -> change pipeline status -> save changes. Confirm unassigned records or unauthorized actions trigger permission gates.

---

## 7. Automated Test Verification

Run all automated smoke tests directly via npm:

```bash
npm run test:smoke
```

Runs 29 assertions across authentication state, role-based navigation filtering, server-side pagination, lead ingestion, duplicate 409 handling, 403 permission guard, and Super Admin payout authorization.
