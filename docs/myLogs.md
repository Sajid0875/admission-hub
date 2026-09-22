# Partner Portal / Admission CRM for WhiteDavid23 Academy

## Backend Development Logs

## Start Date: 13 September 2026

## End Date: 22–23 September 2026

## System Design Reference: https://strata-void-73605916.figma.site/

## Project Goal:

    "To build a scalable multi-tenant partner portal / CRM that allows:
    - Partners to onboard & get approval
    - Academy to manage partners & leads
    - Counselors to manage leads and admissions
    - Real-time dashboards, reporting, commissions & notifications"

- **Project Name**: WhiteDavid23 Academy Admission Hub — Backend System
- **Repository Path**: `~/Desktop/WhiteDavid23Academy_Workspace/admission-hub/backend`
- **Git Remote**: `https://github.com/Sajid0875/admission-hub`
- **Git Branch**: `dev_Sohaim`
- **Developer Identity**: `s0a1m0x01` (`cx3eno@gmail.com`)
- **Workspace**: `admission-hub/` (monorepo) — backend lives in `backend/`, frontend in `frontend/`
- **Status**: **Backend MVP COMPLETE** (235 tests) + **Full Stack Integration COMPLETE** (22–23 Sep 2026; Phase-2 FE: courses, marketing, notifications, commission rules)

---

## Technical Stack Reference
- **Backend Framework**: Node.js + Express.js
- **Language**: TypeScript (ESM, `moduleResolution: NodeNext`)
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL (18)
- **Authentication**: JWT Access Tokens
- **Password Hashing**: bcryptjs
- **Validation**: Zod
- **Logging**: Pino + pino-pretty
- **Security**: Helmet, CORS, OWASP guidance
- **Testing**: Vitest + isolated test DB
- **Dev Runner**: tsx
- **Frontend Framework**: Next.js 14 (App Router) + React 18
- **Frontend State / Data**: Zustand + TanStack Query
- **Frontend Styling**: Tailwind CSS
- **Environment**: Ubuntu + bash
- **Local Ports**: Backend `4000`, Frontend `3000`, Postgres `5432`

---

## Milestone Progress Checklist

#### Phase 0 — Workspace Reset & Repository Baseline
- [x] Reset `backend/` to zero
- [x] Confirmed `docs/` lives at repo root (`admission-hub/docs/`)
- [x] Fixed root `.gitignore` (removed `docs` exclusion)
- [x] Restored deleted `README.md`
- [x] Commit: `7777443 chore(repo): baseline gitignore, readme, and docs`

#### Phase 1 — Backend Scaffold
- [x] `backend/package.json`
- [x] `backend/tsconfig.json`
- [x] `backend/.gitignore`
- [x] `backend/.env.example`
- [x] `backend/.env` (gitignored)
- [x] `backend/prisma/schema.prisma`
- [x] `npm install` — 199 packages
- [x] `prisma validate` + `prisma generate`
- [x] PostgreSQL DB `admission_hub` created
- [x] Commit: `42b95ff chore(backend): scaffold package, tsconfig, env template, prisma schema`

#### Phase 2 — App Bootstrap
- [x] `backend/src/shared/errors/AppError.ts`
- [x] `backend/src/config/env.ts`
- [x] `backend/src/config/logger.ts`
- [x] `backend/src/config/prisma.ts`
- [x] `backend/src/middleware/error.middleware.ts`
- [x] `backend/src/middleware/notFound.middleware.ts`
- [x] `backend/src/app.ts`
- [x] `backend/src/server.ts`
- [x] `backend/src/types/express.d.ts`
- [x] Boot verified — `GET /health` returns 200
- [x] Commit: `d436eb2 feat(backend): server bootstrap + prisma event typing + express request augmentation`

#### Fixes Applied
- Em-dash encoding issue in `AppError.ts` — replaced with hyphen
- Typo `passwordsm` → `passwords,` in `logger.ts`
- Typo `middlewre` → `middleware` in `error.middleware.ts`
- `.env` `DATABASE_URL` — special chars URL-encoded (`!` → `%21`, `@` → `%40`)
- Prisma event typing — `$on('query' as never, ...)` cast for strict TS

#### Environment Notes
- Migrated from Windows + PowerShell to Ubuntu + bash
- Node v24.21.0, npm 11.19.0
- PostgreSQL 18 (`postgresql@18-main`)
- Wiped Windows `node_modules`, reinstalled on Linux
- Added `.gitattributes` to enforce LF line endings

---

#### Phase 3A — Initial Prisma Migration
- [x] Confirmed Postgres `18-main` running
- [x] Confirmed `admission_hub` DB exists
- [x] Ran `./node_modules/.bin/prisma migrate dev --name init`
- [x] Migration `20260916211224_init` created and applied
- [x] 18 tables created (17 domain + `_prisma_migrations`)
- [x] Commit: `62e4a0c feat(prisma): initial migration + dev log update`

#### Phase 3B — Seed Data
- [x] `backend/prisma/seed.ts` — roles, permissions, super admin
- [x] Fixed `tsconfig.json` `include` — removed `prisma/**/*.ts` (was causing rootDir conflict)
- [x] Ran `npm run prisma:seed` — 26 permissions, 4 roles, 1 super admin
- [x] Commit: `a8ac886 feat(prisma): seed roles, permissions, and super admin`

---

#### Phase 3C — Auth Module (Part 1)
- [x] `src/shared/utils/jwt.ts` — sign + verify helpers
- [x] `src/modules/auth/auth.schema.ts` — Zod login schema
- [x] `src/modules/auth/auth.service.ts` — credential verification, JWT issuance
- [x] `src/modules/auth/auth.controller.ts` — login + me handlers
- [x] `src/modules/auth/auth.routes.ts` — route definitions
- [x] `src/middleware/auth.middleware.ts` — `protect` + `authorize`
- [x] Extended `src/types/express.d.ts` — added `req.user` type
- [x] Wired `authRouter` into `src/app.ts` at `/api/v1/auth`
- [x] Manual verification via curl:
  - Login with valid creds → 200 + token
  - `/me` with valid token → 200 + user
  - `/me` without token → 401
  - Login with wrong password → 401

#### Phase 3C — Auth Module (Part 2 — Tests)
- [x] `.env.test` created (isolated test DB config)
- [x] `vitest.config.ts` created
- [x] `tests/setup.ts` — dotenv loading + guards
- [x] `tests/helpers/test-db.ts` — `resetDatabase`, `seedAuthFixtures`
- [x] `src/modules/auth/__tests__/auth.service.test.ts` — 11 tests
- [x] Fixed `tsconfig.json` `exclude` — added `*.test.ts`, `__tests__`, `tests/`
- [x] Added `dotenv-cli` dev dependency
- [x] Added `test:db:setup` and `test:db:reset` scripts
- [x] Test DB migrated: `npm run test:db:setup`
- [x] All 11 tests pass
- [x] Fixed service to normalize email (`trim().toLowerCase()`) before DB lookup

#### Fixes Applied
- Service `login` now normalizes email — previously trusted caller
- `tsconfig.json` gained `exclude` array to keep production build clean
- Test DB isolation enforced by safety guards in `tests/setup.ts` and `tests/helpers/test-db.ts`

---

#### Phase 3C — Auth Module (Final Commit)
- [x] Staged + committed 17 files
- [x] Commit: `7577304 feat(auth): login, me, jwt middleware, and service tests`
- [x] Pushed to `origin/dev_Sohaim`
- [x] Working tree clean
- [x] Commit: `9537028 docs(myLogs): day-based milestone log through phase 3c`

#### Phase 3D — Users Module
- [x] `backend/src/shared/utils/scope.ts` — `buildTenantScope`, `buildAssignmentScope`, `assertCanAccessPartner`
- [x] `backend/src/modules/users/user.schema.ts` — Zod schemas (create, update, status, role, list query)
- [x] `backend/src/modules/users/user.service.ts` — business logic with tenant isolation
- [x] `backend/src/modules/users/user.controller.ts` — HTTP handlers
- [x] `backend/src/modules/users/user.routes.ts` — route gating via `authorize(...)`
- [x] Wired `userRouter` into `src/app.ts` at `/api/v1/users`
- [x] Extended `tests/helpers/test-db.ts`:
  - `TEST_PARTNER` and `TEST_PARTNER_FIXTURE_ADMIN` constants
  - `seedPartnerFixture()` helper (partner + partner_admin with dedicated email)
  - `seedAuthFixtures` now also seeds `COUNSELOR` and `SUPPORT` roles
- [x] `src/modules/users/__tests__/user.service.test.ts` — 23 tests

#### Phase 3D — Smoke Tests (Manual via curl)
- [x] Super admin lists all users → sees only super admin (initially)
- [x] Created partner via psql → got UUID
- [x] Super admin creates partner_admin via API → returned user + `temporaryPassword`
- [x] Partner admin logs in → 200 + token
- [x] Partner admin lists users → sees only own org (1 user)
- [x] Partner admin attempts to create SUPER_ADMIN → 403

#### Fixes Applied
- Error factories called with `new` — removed `new` from all `ForbiddenError`/`BadRequestError`/`ConflictError`/`NotFoundError` calls in `user.service.ts`
- `seedPartnerFixture` collision with `seedAuthFixtures` — dedicated `TEST_PARTNER_FIXTURE_ADMIN` email
- Test count expectations corrected (3 users after both fixtures, not 2)
- Stray test file `auth/__tests__/user.service.test.ts` deleted
- All 4 roles seeded in `seedAuthFixtures` so `COUNSELOR`/`SUPPORT` role lookups succeed in tests

#### Commit
- [x] Commit: `9803964 feat(users): module with crud, tenant scope, and service tests`
- [x] Commit: `6fb69c5 docs(myLogs): day 8 update through users module`

---

#### Phase 3E — Partners Module
- [x] `src/modules/partners/partner.schema.ts` — Zod schemas
- [x] `src/modules/partners/partner.service.ts` — CRUD + status state machine
- [x] `src/modules/partners/partner.controller.ts` — HTTP handlers
- [x] `src/modules/partners/partner.routes.ts` — route gating
- [x] Wired `partnerRouter` into `src/app.ts` at `/api/v1/partners`
- [x] `src/modules/partners/__tests__/partner.service.test.ts` — 26 tests
- [x] Smoke tests: create → PENDING, duplicate email → 409, approve → ACTIVE with metadata, invalid transition → 400, get by id → 200
- [x] Commit: `add1cd0 feat(partners): module with onboarding, approval, and status lifecycle`

#### Phase 3F — Leads Module
- [x] `src/modules/leads/lead.schema.ts` — Zod schemas for all lead operations
- [x] `src/modules/leads/lead.service.ts` — CRUD, assignment, status state machine, timeline, archive
- [x] `src/modules/leads/lead.controller.ts` — HTTP handlers
- [x] `src/modules/leads/lead.routes.ts` — 8 endpoints gated by role
- [x] Wired `leadRouter` into `src/app.ts` at `/api/v1/leads`
- [x] `src/modules/leads/__tests__/lead.service.test.ts` — 26 tests
- [x] Smoke tests: create → NEW, duplicate phone → 409, assign → 200, invalid transition → 400, valid transition → 200, timeline shows 3 activities with metadata
- [x] Commit: `43ead06 feat(leads): module with crud, assignment, status state machine, and timeline`

#### Fixes Applied
- `Prisma.InputJsonValue` type for metadata in `lead.service.ts`
- Unused `normalizedPhone` and `normalizePhone` removed from lead service

---

#### Phase 3G — Follow-ups Module
- [x] `src/modules/followups/followup.schema.ts` — Zod schemas for all operations
- [x] `src/modules/followups/followup.service.ts` — lifecycle state machine, overdue computation, timeline integration
- [x] `src/modules/followups/followup.controller.ts` — HTTP handlers
- [x] `src/modules/followups/followup.routes.ts` — 7 endpoints gated by role
- [x] Wired `followUpRouter` into `src/app.ts` at `/api/v1/followups`
- [x] Added nested route `GET /api/v1/leads/:id/followups` to `lead.routes.ts`
- [x] `src/modules/followups/__tests__/followup.service.test.ts` — 23 tests
- [x] Smoke tests passed:
  - Create follow-up → 201, `status: PENDING`, `overdue: false`
  - Snooze past date → 400
  - Snooze future date → 200
  - Complete with outcome → 200, `status: COMPLETED`, `completedAt` stamped
  - Complete again → 400
  - Cancel → 200, `status: CANCELLED`
  - Nested list → 2 items
  - Timeline shows every follow-up lifecycle action
- [x] Commit: `5542e02 feat(followups): module with scheduling, lifecycle, and timeline integration`

#### Fixes Applied
- Added missing `FollowUpOutcome` and `LeadPriority` imports to `followup.service.ts`

---

#### Phase 3H — Admissions + Payments Module
- [x] `src/modules/admissions/admission.schema.ts` — Zod schemas for admission + payment operations
- [x] `src/modules/admissions/admission.service.ts` — transactional admission creation, payment lifecycle, commission trigger, refund logic
- [x] `src/modules/admissions/admission.controller.ts` — HTTP handlers
- [x] `src/modules/admissions/admission.routes.ts` — 9 endpoints gated by role
- [x] Wired `admissionRouter` into `src/app.ts` at `/api/v1/admissions`
- [x] `src/modules/admissions/__tests__/admission.service.test.ts` — 24 tests
- [x] Smoke tests passed:
  - Create admission → 201, lead becomes `ADMITTED`, `paymentStatus: UNPAID`
  - Duplicate admission → 409 "Lead is already admitted"
  - Partial payment ₹20,000 → `paymentStatus: PARTIAL`
  - Full payment ₹30,000 → `paymentStatus: PAID`
  - Overpay → 400 with remaining balance
  - Verify admission → `verificationStatus: VERIFIED`
  - Commission record auto-generated (rate 0 until commission rules phase)
  - Refund payment → `paymentStatus` back to `PARTIAL`
  - Lead timeline shows `ADMISSION_CREATED` + `Payment refunded`
- [x] Commit: `35a9d0d feat(admissions): module with admission + payment lifecycle and commission trigger`

#### Fixes Applied
- `PaymentMode` — not a Prisma enum; replaced with Zod `z.enum(ALLOWED_PAYMENT_MODES)` with 6 allowed values
- Removed unused `appendActivity` helper — activities written inline within transactions

---

#### Phase 3I — Courses + Marketing Assets Module
- [x] `src/modules/courses/course.schema.ts` — Zod schemas
- [x] `src/modules/courses/course.service.ts` — global read, super_admin write, soft-archive
- [x] `src/modules/courses/course.controller.ts` — HTTP handlers
- [x] `src/modules/courses/course.routes.ts` — 5 endpoints gated by role
- [x] `src/modules/marketing-assets/marketing-asset.schema.ts` — Zod schemas
- [x] `src/modules/marketing-assets/marketing-asset.service.ts` — with courseId validation
- [x] `src/modules/marketing-assets/marketing-asset.controller.ts` — HTTP handlers
- [x] `src/modules/marketing-assets/marketing-asset.routes.ts` — 5 endpoints (incl. DELETE for soft-archive)
- [x] Wired both routers into `src/app.ts`
- [x] `src/modules/courses/__tests__/course.service.test.ts` — 12 tests
- [x] `src/modules/marketing-assets/__tests__/marketing-asset.service.test.ts` — 15 tests
- [x] Smoke tests passed:
  - Super admin creates a course → 201
  - Partner admin lists courses → sees all (global read)
  - Partner admin tries to create course → 403
  - Super admin creates marketing asset linked to course → 201
  - Partner admin lists assets filtered by courseId / type
  - DELETE asset → status `ARCHIVED`, row still in DB (soft delete verified)
  - Default list hides archived; explicit `?status=ARCHIVED` shows it
- [x] Commit: `7971d84 feat(courses+marketing): course catalog and marketing assets`

#### Fixes Applied
- None — clean build

---

#### Phase 3J — Commissions Module
- [x] `src/modules/commissions/commission-rule.schema.ts` — Zod schemas for rules
- [x] `src/modules/commissions/commission-rule.service.ts` — CRUD + `resolveCommissionRate` for admissions
- [x] `src/modules/commissions/commission-rule.controller.ts` — HTTP handlers
- [x] `src/modules/commissions/commission-rule.routes.ts` — 5 endpoints (super_admin only)
- [x] `src/modules/commissions/commission.schema.ts` — Zod schemas for records
- [x] `src/modules/commissions/commission.service.ts` — state machine, scope, paidAt stamp
- [x] `src/modules/commissions/commission.controller.ts` — HTTP handlers
- [x] `src/modules/commissions/commission.routes.ts` — 3 endpoints
- [x] `src/modules/admissions/admission.service.ts` — updated to use `resolveCommissionRate` (replaces rate-0 placeholder)
- [x] Wired both routers into `src/app.ts`
- [x] `src/modules/commissions/__tests__/commission-rule.service.test.ts` — 14 tests
- [x] `src/modules/commissions/__tests__/commission.service.test.ts` — 14 tests
- [x] Smoke tests passed:
  - Super admin creates 20% commission rule for a course → 201
  - Duplicate rule for same course → 409
  - New lead + admission + verify → commission record auto-created with `rate: 20`, `amount: 13000` on a 65000 fee
  - List commissions (super_admin sees all; partner_admin sees own org)
  - PENDING → APPROVED → PAID; `paidAt` stamped on PAID
  - Invalid transition PAID → APPROVED → 400
  - Partner admin cannot change status → 403
  - Partner admin filtering by `partnerId` → 403
- [x] Commit: `1243a01 feat(commissions): rules engine and commission record lifecycle`

#### Fixes Applied
- None — clean build

---

#### Phase 3K — Notifications Module
- [x] `src/shared/utils/notify.ts` — fire-and-forget notification helper
- [x] `src/modules/notifications/notification.schema.ts` — Zod schemas for filters
- [x] `src/modules/notifications/notification.service.ts` — own-user scope, idempotent mark read, unread count
- [x] `src/modules/notifications/notification.controller.ts` — HTTP handlers
- [x] `src/modules/notifications/notification.routes.ts` — 4 endpoints (literal paths before params)
- [x] Wired `notificationRouter` into `src/app.ts`
- [x] `src/modules/notifications/__tests__/notification.service.test.ts` — 14 tests
- [x] Smoke tests passed:
  - Inserted notifications directly via psql (no create endpoint by design)
  - SUPER list → 2 items, `unreadCount: 2`
  - ALICE list → 1 item (her own only)
  - Cross-user mark read → 404
  - Mark one read → `readAt` stamped
  - Unread count → decremented
  - Mark all read → `updated: 1`
  - Unread count → 0
- [x] Commit: `715deae feat(notifications): in-app notification center`

#### Fixes Applied
- None — clean build

---

#### Phase 3L — Reports Module
- [x] `src/modules/reports/report.schema.ts` — Zod schemas for query params
- [x] `src/modules/reports/report.service.ts` — query-time aggregation, CSV generation, helpers
- [x] `src/modules/reports/report.controller.ts` — HTTP handlers
- [x] `src/modules/reports/report.routes.ts` — 9 endpoints (super_admin + partner_admin only)
- [x] Wired `reportRouter` into `src/app.ts`
- [x] `src/modules/reports/__tests__/report.service.test.ts` — 19 tests
- [x] Smoke tests passed:
  - Dashboard: summary + funnel + trend
  - Leads/Admissions/Revenue/Conversion/Commissions reports return correct aggregates
  - Partners report: per-partner numbers
  - Courses report: per-course admission counts + revenue
  - Partner admin scoped to own org
  - Partner admin blocked from partners report → 403
  - CSV export: `Content-Type: text/csv` + `Content-Disposition: attachment`
- [x] Commit: `59bf577 feat(reports): aggregate reporting endpoints + CSV export`

#### Fixes Applied
- Added `countOf()` and `sumOf()` helpers to normalize Prisma `groupBy` typing (`_count` union type and `_sum` optional)

---

#### Phase 3M — Audit Logs Module
- [x] `src/shared/utils/audit.ts` — `logAction()` fire-and-forget helper + `AuditAction` constants
- [x] `src/modules/audit/audit.schema.ts` — Zod schemas for list filters
- [x] `src/modules/audit/audit.service.ts` — read-only list + get-by-id
- [x] `src/modules/audit/audit.controller.ts` — HTTP handlers
- [x] `src/modules/audit/audit.routes.ts` — 2 endpoints (super_admin only, append-only)
- [x] Wired `auditRouter` into `src/app.ts`
- [x] `src/modules/audit/__tests__/audit.service.test.ts` — 14 tests
- [x] Smoke tests passed:
  - Inserted audit logs via psql
  - SUPER list → 3 items, newest first, JSON diffs preserved
  - Filter by action / entityType / actorId
  - Get one by id → full record
  - Partner admin blocked → 403
  - No POST route → 404
  - No DELETE route → 404
- [x] Commit: `b6c5580 feat(audit): append-only audit log viewer + logAction helper`

#### Fixes Applied
- None — clean build

#### Test Results (Final)
- **235 tests pass** across 13 files:
  - `auth.service.test.ts` — 11 tests
  - `user.service.test.ts` — 23 tests
  - `partner.service.test.ts` — 26 tests
  - `lead.service.test.ts` — 26 tests
  - `followup.service.test.ts` — 23 tests
  - `admission.service.test.ts` — 24 tests
  - `course.service.test.ts` — 12 tests
  - `marketing-asset.service.test.ts` — 15 tests
  - `commission-rule.service.test.ts` — 14 tests
  - `commission.service.test.ts` — 14 tests
  - `notification.service.test.ts` — 14 tests
  - `report.service.test.ts` — 19 tests
  - `audit.service.test.ts` — 14 tests

#### Environment Gotchas
- Postgres occasionally stops on Ubuntu — `sudo systemctl start postgresql` before running commands
- `npx prisma` from wrong folder downloads a different version — use `./node_modules/.bin/prisma`
- Placeholder values (`<paste-...>`) accidentally assigned to shell vars — sanity check with `echo "$VAR"` first
- `git commit` without `git add` silently does nothing — always check `git status` between add and commit
- Windows CRLF leaked into curl JSON payloads — write JSON to a temp file with a heredoc and use `-d @/tmp/file.json`
- Prisma v5 `groupBy` `_count._all` is typed as `true | { _all?: number }` — normalize via a `countOf()` helper

---

## Git History

### Branch: `dev_Sohaim` — HEAD = `origin/dev_Sohaim` = `b6c5580`

| Hash | Message | Phase |
|---|---|---|
| `b6c5580` | feat(audit): append-only audit log viewer + logAction helper | Phase 3M |
| `628c50a` | docs(myLogs): phase 3l update through reports module | Phase 3L |
| `59bf577` | feat(reports): aggregate reporting endpoints + CSV export | Phase 3L |
| `c2911f9` | docs(myLogs): phase 3k update through notifications module | Phase 3K |
| `715deae` | feat(notifications): in-app notification center | Phase 3K |
| `5d434a6` | docs(myLogs): phase 3j update through commissions module | Phase 3J |
| `1243a01` | feat(commissions): rules engine and commission record lifecycle | Phase 3J |
| `25bd1a7` | docs(myLogs): phase 3i update through courses and marketing assets | Phase 3I |
| `7971d84` | feat(courses+marketing): course catalog and marketing assets | Phase 3I |
| `4221142` | docs(myLogs): phase 3h update through admissions module | Phase 3H |
| `35a9d0d` | feat(admissions): module with admission + payment lifecycle and commission trigger | Phase 3H |
| `e54508a` | docs(myLogs): fix head hash and deduplicate phase 3g block | Phase 3G |
| `5542e02` | feat(followups): module with scheduling, lifecycle, and timeline integration | Phase 3G |
| `43ead06` | feat(leads): module with crud, assignment, status state machine, and timeline | Phase 3F |
| `add1cd0` | feat(partners): module with onboarding, approval, and status lifecycle | Phase 3E |
| `6fb69c5` | docs(myLogs): day 8 update through users module | Phase 3D |
| `9803964` | feat(users): module with crud, tenant scope, and service tests | Phase 3D |
| `9537028` | docs(myLogs): day-based milestone log through phase 3c | Phase 3C |
| `7577304` | feat(auth): login, me, jwt middleware, and service tests | Phase 3C |
| `a8ac886` | feat(prisma): seed roles, permissions, and super admin | Phase 3B |
| `62e4a0c` | feat(prisma): initial migration + dev log update | Phase 3A |
| `a82a609` | docs(myLogs): accurate day 1 log | Phase 2 |
| `d436eb2` | feat(backend): server bootstrap + prisma event typing + express request augmentation | Phase 2 |
| `b8c9d8e` | Merge branch 'dev_Sohaim' | Setup |
| `54fb5bd` | Update README.md | Setup |
| `2d4f4a6` | feat: all corrected config changes implemented from src | Setup |
| `e268fc1` | chore(repo): enforce LF line endings | Setup |
| `42b95ff` | chore(backend): scaffold package, tsconfig, env template, prisma schema | Phase 1 |
| `7777443` | chore(repo): baseline gitignore, readme, and docs | Phase 0 |

---

## Progress Summary — Final

| Module | Endpoints | Tests | Status |
|---|---|---|---|
| Auth | 2 | 11 | Done |
| Users | 6 | 23 | Done |
| Partners | 5 | 26 | Done |
| Leads | 8 | 26 | Done |
| Follow-ups | 7 | 23 | Done |
| Admissions + Payments | 9 | 24 | Done |
| Courses | 5 | 12 | Done |
| Marketing Assets | 5 | 15 | Done |
| Commission Rules | 5 | 14 | Done |
| Commissions | 3 | 14 | Done |
| Notifications | 4 | 14 | Done |
| Reports | 9 | 19 | Done |
| Audit Logs | 2 | 14 | Done |
| **Total** | **70** | **235** | **100% COMPLETE** |


## Backend Domain Complete: 22 September, 2026

---

## Full Stack Integration — Frontend + Live API

- **Frontend Path**: `admission-hub/frontend/`
- **Frontend Stack**: Next.js 14 (App Router) + React 18 + TypeScript + TanStack Query + Tailwind CSS + Zustand
- **API Base**: `http://localhost:4000/api/v1` (`NEXT_PUBLIC_API_URL`)
- **Mocks Gate**: `NEXT_PUBLIC_USE_MOCKS=false` (live API by default; mocks only when explicitly enabled)
- **Local Ports**: Backend `:4000`, Frontend `:3000`, PostgreSQL `:5432`
- **Status**: **Local full-stack integration complete** — Phase 1 + Phase 2 FE surfaces wired live (courses, marketing, notifications, commission rules); role workflows verified against the backend
- **Git note (23 Sep 2026)**: Frontend un-nested into monorepo on `dev_Sohaim` (nested `frontend/.git` removed). Prior FE work also pushed on `sajid/frontend-phase-1` (`3ecef0b`). Prefer committing FE on `dev_Sohaim` going forward.

### Local QA Login Credentials (from `npm run prisma:seed`)

| Role | Email | Password | Notes |
|---|---|---|---|
| Super Admin | `admin@whitedavid23.local` | `ChangeMe!Adm1n2026` | Seeded since Phase 3B; password not overwritten on re-seed |
| Partner Admin | `partner@whitedavid23.com` | `ChangeMe!Partner2026` | Reset on every seed (demo partner tenant) |
| Counselor | `counselor@whitedavid23.com` | `ChangeMe!Counselor2026` | Reset on every seed (same demo partner) |
| Support | `support@whitedavid23.com` | `ChangeMe!Support2026` | Reset on every seed (no partner) |

**Seed also creates:**
- Demo partner: `demo-partner@whitedavid23.local` (ACTIVE)
- Demo course: `Full Stack Software Engineering` (fee ₹55,000)
- Demo commission rule: **10%** on that course

**Re-seed command** (from `backend/`):

```bash
npm run prisma:seed
```

---

### Technologies / Surfaces Touched (Full Stack Pass)

| Layer | What |
|---|---|
| Backend | Express modules, Prisma seed, `logAction()` / `notify()` wiring, `server.ts` listen error handling, `tsconfig.json` TS6 `baseUrl` cleanup |
| Frontend | Auth login, AppShell, dashboard, leads, follow-ups, team, admissions, commissions, audit, courses, marketing, notifications, **commission rules** |
| Integration | DTO mappers (`frontend/src/lib/mappers.ts`), mock gate (`lib/mocks.ts`), API services under `services/api/` |
| Env / Ops | User-owned Postgres, migrate + seed, single backend listener on `:4000` |

---

### End-to-End Workflows Verified Live (22 Sep 2026)

1. **Auth** — Super Admin / Partner Admin / Counselor / Support login via presets
2. **Partners** — Super Admin list / create / approve (tenant ACTIVE)
3. **Leads** — Partner Admin / Counselor create + list + detail + status change
4. **Follow-ups** — Agenda via `GET /followups`; create from lead detail (PA/Counselor only)
5. **Team invite** — `POST /users` returns one-time `temporaryPassword`; UI toast surfaces it
6. **Admission convert** — Lead detail → Convert to Admission → `POST /admissions`
7. **Admission verify** — Admissions page Verify → commission record generated
8. **Commissions / payout** — Super Admin `PATCH /commissions/:id/status` → `APPROVED`
9. **Audit** — `GET /audit-logs` shows `ADMISSION_CREATED`, `ADMISSION_VERIFIED`, `COMMISSION_APPROVED`, `USER_CREATED`
10. **Dashboards** — Role-scoped KPIs; Counselor skips SA/PA-only reports endpoint
11. **Courses** — Live catalog list/create/status via `GET/POST /courses` + `PATCH /courses/:id/status` (SA writes)
12. **Marketing assets** — Live list/create/archive via `GET/POST/DELETE /marketing-assets` (SA writes)
13. **Notifications** — Header bell + drawer; live unread badge; mark one/all read
14. **Commission rules** — SA CRUD via `GET/POST/PATCH/DELETE /commission-rules`
15. **Reports CSV export** — SA/PA download via `GET /reports/export?report=leads|admissions`

---

### Bugs Fixed During Full Stack Integration

| Bug | Root Cause | Fix |
|---|---|---|
| `EADDRINUSE :::4000` | Multiple `tsx watch` / leftover Node listeners | Kill orphans; start one backend; clearer fatal in `server.ts` on bind failure; skip `server.close` when never listening |
| Super Admin create lead → 403 | Backend does not allow SA to create leads | UI: remove SA lead-create path; create as Partner Admin / Counselor |
| Course create/admission 422 on fake `course_ds` id | Non-UUID courseId | Omit invalid courseId; seed real UUID course |
| Dashboard mock bleed / empty KPIs | Mocks still leaking when live API intended | `NEXT_PUBLIC_USE_MOCKS=false` + `areMocksEnabled()` gate |
| UUID shown as page title | AppShell used last path segment (lead id) | Title overrides + UUID skip |
| Follow-up create silent fail | `dueAt` not ISO; SA blocked by authorize | Send ISO datetime; hide create for SA |
| Follow-ups page empty | Wrong client path / contract | Wire to `GET /followups` |
| Partner Admin team/commissions 403 | FE sent `partnerId` query (SA-only filter) | Omit `partnerId` for non–Super Admin |
| Counselor dashboard 403 | Called `/reports/dashboard` (SA/PA only) | Skip reports dashboard for Counselor |
| Commission summary showed `$—` | Truthy check treated `0` as missing | Render `summary.totalEarned.toLocaleString()` when summary exists |
| Invite temp password invisible | Mapper dropped `temporaryPassword` | Return + toast one-time password |
| Admission create body mismatch | FE sent `totalFee` | Align to backend `fee` field |
| No convert / verify UI | Frontend incomplete | Lead convert modal + Admissions Verify button |
| QA partner/counselor login unstable | One-time invite passwords only | Seed stable QA users + login presets |
| Audit empty after mutations | `logAction()` / `notify()` not called from domain services | Wired into partners, users, leads, admissions, commissions |
| Always-on notification badge | Header hardcoded rose dot | Badge driven by `GET /notifications/unread-count` |
| Notification type mapping wrong | FE expected `LEAD_ASSIGNED` uppercase | Map backend snake_case (`lead_assigned`, `commission_approved`, …) |

---

### Patches / Code Changes (Full Stack Pass — Key Files)

**Backend**
- `backend/prisma/seed.ts` — demo partner, course, 10% rule, QA users with known passwords
- `backend/tsconfig.json` — dropped deprecated `baseUrl` + unused `@/*` paths; CRLF → LF
- `backend/src/server.ts` — `listen` error handler for `EADDRINUSE`; safe shutdown when not listening
- `backend/src/app.ts` — note that domain modules emit audit/notifications
- `backend/src/modules/partners/partner.service.ts` — `logAction` + `notify` on create/status
- `backend/src/modules/users/user.service.ts` — `logAction` on create/status
- `backend/src/modules/leads/lead.service.ts` — `logAction` + `notify` on assign/status
- `backend/src/modules/admissions/admission.service.ts` — `logAction` + `notify` on create/verify
- `backend/src/modules/commissions/commission.service.ts` — `logAction` + `notify` on status change

**Frontend**
- `frontend/src/app/login/page.tsx` — filled Quick Role Preset passwords
- `frontend/src/app/(dashboard)/team/page.tsx` — invite toast with temporary password
- `frontend/src/app/(dashboard)/leads/[id]/page.tsx` — Convert to Admission modal
- `frontend/src/app/(dashboard)/admissions/page.tsx` — Verify action (SA/PA)
- `frontend/src/app/(dashboard)/commissions/page.tsx` — `$0` KPI display; no illegal `partnerId`
- `frontend/src/app/(dashboard)/follow-ups/page.tsx` — live `/followups` list
- `frontend/src/services/api/admissionService.ts` — `fee` payload, `listCourses`, `verifyAdmission`
- `frontend/src/services/api/adminService.ts` — invite `temporaryPassword`; audit mapper; notification mapper + `getUnreadCount` + deep links
- `frontend/src/lib/mappers.ts` / `lib/mocks.ts` — DTO mapping + mock gate
- `frontend/src/components/shell/AppShell.tsx` — human titles (no UUID); Courses / Marketing / Commission Rules
- `frontend/src/components/shell/navigationConfig.ts` — Courses, Marketing, Commission Rules (SA) nav
- `frontend/src/components/shell/Header.tsx` — unread badge from live `GET /notifications/unread-count`
- `frontend/src/components/notifications/NotificationCenter.tsx` — live drawer, mark one/all, relative time, deep links
- `frontend/src/types/course.ts` / `types/marketing.ts` / `types/commission.ts` — course, marketing, commission-rule types
- `frontend/src/services/api/courseService.ts` — live `GET/POST /courses`, `PATCH .../status`
- `frontend/src/services/api/marketingService.ts` — live `GET/POST/DELETE /marketing-assets`
- `frontend/src/services/api/commissionRuleService.ts` — live SA `GET/POST/PATCH/DELETE /commission-rules`
- `frontend/src/services/api/index.ts` / `types/index.ts` — barrel exports
- `frontend/src/app/(dashboard)/courses/page.tsx` — SA create + activate/archive; global read
- `frontend/src/app/(dashboard)/marketing/page.tsx` — SA create + archive; course picker; type filter
- `frontend/src/app/(dashboard)/commission-rules/page.tsx` — SA list/create/edit/delete rules UI
- `frontend/src/app/(dashboard)/reports/page.tsx` — Export Leads/Admissions CSV buttons
- `frontend/src/services/api/adminService.ts` — `reportService.exportCsv()` blob download

---

### Post-MVP Backlog (Updated after Full Stack Integration)

**Done in this pass (removed from open backlog):**
- [x] Wire `logAction()` into partner / user / lead / admission / commission services
- [x] Wire `notify()` into partner / lead / admission / commission flows
- [x] Stabilize local QA login presets via seed
- [x] Frontend live API contract alignment for core role workflows
- [x] Courses + Marketing Assets live UI wired to Phase-2 APIs
- [x] In-app Notifications UI (header bell + drawer + unread badge)
- [x] Commission Rules SA UI wired to `/commission-rules`
- [x] Reports CSV export UI wired to `GET /reports/export`

**Still optional / not required for local integration:**
- OpenAPI / Swagger spec
- Rate limiting on non-auth routes
- Refresh tokens
- Redis-backed background jobs (follow-up reminders, notification fanout)
- PDF export (CSV only today)
- Docker / Kubernetes manifests
- CI/CD pipeline (GitHub Actions)
- Dedicated `GET /commissions/summary` (FE currently derives summary from list)
- Aikido security scan MCP (not configured in this environment)

---

## Tests Passed Thoroughly (By Area)

Documented separately below: automated suite counts, curl/API smokes per backend module, frontend smoke, static checks, and live full-stack workflow verification (22–23 Sep 2026).

### 1) Backend — Automated Service Tests (Vitest + `admission_hub_test`)

| Area | Test file | Count | What was covered thoroughly |
|---|---|---|---|
| Auth | `auth.service.test.ts` | 11 | Valid login, wrong password, inactive user, `/me`, email normalize |
| Users | `user.service.test.ts` | 23 | Create + temp password, tenant list scope, role assignment rules, status/role change, 403 boundaries |
| Partners | `partner.service.test.ts` | 26 | Create PENDING, approve ACTIVE, invalid transitions, duplicate email 409, SA-only writes |
| Leads | `lead.service.test.ts` | 26 | CRUD, phone duplicate 409, assign counselor-only, status state machine, timeline, archive, tenant scope |
| Follow-ups | `followup.service.test.ts` | 23 | Create/snooze/complete/cancel lifecycle, overdue flags, nested lead list, unauthorized roles |
| Admissions + Payments | `admission.service.test.ts` | 24 | One-per-lead, admit flips lead, payments PARTIAL→PAID, overpay blocked, verify + commission, refund |
| Courses | `course.service.test.ts` | 12 | SA create/update/status, global list read, non-SA write 403 |
| Marketing Assets | `marketing-asset.service.test.ts` | 15 | Create linked to course, filters, soft-archive, default hide archived |
| Commission Rules | `commission-rule.service.test.ts` | 14 | CRUD, rate bounds, duplicate course rule 409, `resolveCommissionRate` |
| Commissions | `commission.service.test.ts` | 14 | List scope, PENDING→APPROVED→PAID, invalid transitions, PA cannot change status |
| Notifications | `notification.service.test.ts` | 14 | Own-user list, unread count, mark one/all read, cross-user 404 |
| Reports | `report.service.test.ts` | 19 | Dashboard/funnel aggregates, per-report scopes, CSV export, partners report SA-only |
| Audit | `audit.service.test.ts` | 14 | List/filter/get-by-id, append-only (no write routes), SA-only access, `logAction` helper |
| **Total** | **13 files** | **235** | **All passing on isolated test DB** |

Command: `npm test` in `backend/` (after `npm run test:db:setup`).

---

### 2) Backend — Manual / Curl Smoke Tests (Per Module, During Build)

| Area | Smoke checks that passed |
|---|---|
| Health / Boot | `GET /health` → 200 |
| Auth | Login 200 + token; `/me` 200; missing token 401; bad password 401 |
| Users | SA lists users; create partner_admin returns `temporaryPassword`; PA lists own org only; PA cannot create SUPER_ADMIN → 403 |
| Partners | Create → PENDING; duplicate email → 409; approve → ACTIVE + metadata; invalid transition → 400 |
| Leads | Create → NEW; duplicate phone → 409; assign → 200; invalid status jump → 400; timeline activities present |
| Follow-ups | Create PENDING; snooze past → 400 / future → 200; complete + cancel; nested lead follow-ups list |
| Admissions + Payments | Create → ADMITTED; duplicate admit → 409; partial/full payment; overpay → 400; verify → commission; refund |
| Courses + Marketing | SA creates course; PA list OK / create 403; asset create/list/filter; DELETE soft-archives |
| Commissions | Rule 20% create; verify admission generates amount; list SA vs PA scope; status machine; PA status change 403 |
| Notifications | List own only; mark read; unread count; mark-all |
| Reports | Dashboard + lead/admission/revenue/conversion/commission reports; CSV headers; PA partners report 403 |
| Audit | List newest-first; filters; get-by-id; PA 403; no POST/DELETE |

---

### 3) Frontend — Automated Smoke + Static Checks

| Kind | Result | Notes |
|---|---|---|
| Frontend smoke suite | **29 / 29** | `npm run test:smoke` in `frontend/` (mock-mode contract checks) |
| Frontend TypeScript | Pass | `npx tsc --noEmit` |
| Frontend lint | Pass | `next lint` — 0 issues |
| Backend TypeScript | Pass | `npm run typecheck` (`tsc --noEmit`) after `tsconfig.json` cleanup |

---

### 4) Full Stack Live Integration Tests (22–23 Sep 2026 — Against Real API + Postgres)

Mocks off (`NEXT_PUBLIC_USE_MOCKS=false`). Backend `:4000`, Frontend `:3000`. Seeded QA accounts used.

| Workflow / Area | Roles exercised | Thorough checks that passed |
|---|---|---|
| **Auth / Login presets** | SA, PA, Counselor, Support | All four seeded emails/passwords login → JWT; login page Quick Role Preset fills credentials |
| **Partners** | SA | List partners; create/approve path (tenant ACTIVE) |
| **Leads** | PA, Counselor | Create/list/detail; status transitions; SA lead-create correctly blocked (403) |
| **Follow-ups** | PA, Counselor | Agenda loads via `GET /followups`; create from lead detail with ISO `dueAt`; SA create hidden |
| **Team invite** | PA | `POST /users` returns `temporaryPassword`; UI toast shows one-time password |
| **Admission convert** | PA | Lead → Convert to Admission → `POST /admissions` with real course UUID + `fee` |
| **Admission verify → commission** | PA verify, SA payout | Verify → `VERIFIED`; commission row created (10% seed rule); SA `PATCH` status → `APPROVED` |
| **Commissions UI** | SA / PA | Ledger loads; summary KPIs show `$0` instead of `$—`; PA does not send illegal `partnerId` |
| **Audit** | SA | `GET /audit-logs` contains `ADMISSION_CREATED`, `ADMISSION_VERIFIED`, `COMMISSION_APPROVED`, `USER_CREATED` after mutations |
| **Dashboards** | SA, PA, Counselor | Live KPIs; Counselor does not call SA/PA-only `/reports/dashboard` (no 403) |
| **Tenant / authorize boundaries** | PA, Counselor | Team/commissions without `partnerId` filter; counselor partners/commissions remain forbidden where designed |
| **Ops / listen** | Dev | Single listener on `:4000`; `EADDRINUSE` cleared; `/health` OK after restart |
| **Config** | Dev | `backend/tsconfig.json` deprecation cleared; LF; `tsc` clean |
| **Courses** | SA | `POST /courses` → ACTIVE; `PATCH .../status` INACTIVE then ARCHIVED; FE page + nav |
| **Marketing assets** | SA | `POST /marketing-assets` linked to course; soft `DELETE` → ARCHIVED; FE page + nav |
| **Notifications** | PA | List own alerts; unread badge; `PATCH .../read-all` clears count; FE drawer in Header |
| **Commission rules** | SA | List seed 10% rule; create/patch/delete; PA list → 403; FE `/commission-rules` |
| **Reports CSV export** | SA / PA | `GET /reports/export?report=leads|admissions` → CSV attachment; FE download buttons |

**Representative live chain verified in one run:**  
Login (all roles) → PA create lead → create admission → verify → commission appears → SA approve payout → PA invite user (temp password) → SA audit list shows corresponding actions.

**Courses + Marketing smoke (22 Sep 2026):**  
SA login → create course → change status → create marketing asset (linked course) → soft-archive asset → archive course. FE `tsc --noEmit` clean after wiring.

**Notifications smoke (22 Sep 2026):**  
PA login → `GET /notifications` returns admission/commission alerts → `GET /unread-count` → `PATCH /read-all` → unread 0. FE `tsc` clean.

**Commission rules smoke (22–23 Sep 2026):**  
SA list seed rule → create PERCENTAGE rule on temp course → `PATCH` rate → `DELETE` 204 → PA list forbidden (403). FE `tsc` clean.

**Reports CSV smoke (23 Sep 2026):**  
PA `GET /reports/export?report=leads` and `admissions` → 200 `text/csv` with Content-Disposition filename. FE `tsc` clean.

---

### 5) Test-Type Summary (What “Thorough” Means Here)

| Test type | Where | Status |
|---|---|---|
| Unit / service (Vitest) | Backend modules | **235/235 pass** |
| Integration-style DB fixtures | Backend test DB | Covered inside Vitest suites |
| Manual curl smoke | Each backend module during build | Passed (logged per phase above) |
| Frontend smoke script | `frontend/scripts/smoke-tests.ts` | **29/29 pass** |
| Static analysis | FE lint + FE/BE `tsc` | Pass |
| Live E2E / workflow | Full stack against Postgres | Core role workflows pass (22–23 Sep 2026) |
| Browser UI pass | Manual login + page flows during integration | Exercised for auth, leads, follow-ups, team, admissions, commissions, courses, marketing, notifications, commission rules, dashboards |

---

## Working Rules (Locked)
- One step per turn when possible; verify output before moving on
- Commit + push after each meaningful change
- Stage files by explicit path — never `git add .`
- Always check `git status` between `git add` and `git commit`
- Backend code: `admission-hub/backend/`
- Frontend code: `admission-hub/frontend/`
- Docs: `admission-hub/docs/`
- Never read `process.env` outside `src/config/env.ts`
- Never `new PrismaClient()` outside `src/config/prisma.ts`
- ESM: every relative import uses `.js` extension
- Never run `npm`/`npx` from repo root — always from `backend/` or `frontend/`
- Use `./node_modules/.bin/prisma` — avoid `npx prisma` (may fetch a different version)
- Tests must run against `admission_hub_test` only
- Sanity-check shell vars with `echo "$VAR"` before use
- For complex JSON payloads, write to a temp file and use `curl -d @file.json`
- Env: Ubuntu + bash
- IDE: Cursor / Antigravity

---

## Full Stack Integration End Date: **23 September 2026**

Core role E2E + backend module suite: **22 Sep 2026**.  
Phase-2 FE polish (courses, marketing, notifications, commission rules): **22–23 Sep 2026**.
