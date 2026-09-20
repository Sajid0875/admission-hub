# Partner Portal / Admission CRM for WhiteDavid23 Academy

## Backend Development Logs

## Start Date: 13 September 2026

## End Date: --/--/----

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
- **Workspace**: `admission-hub/` (monorepo) — backend lives in `backend/`

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
- **Environment**: Ubuntu + bash

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

#### Test Results (Day 8)
- **34 tests pass** across 2 files:
  - `auth.service.test.ts` — 11 tests
  - `user.service.test.ts` — 23 tests

#### Commit
- [ ] Commit: `feat(users): module with crud, tenant scope, and service tests` (pending push)

---

## Git History

### Branch: `dev_Sohaim` — HEAD = `origin/dev_Sohaim` = `9537028` (before users commit)

| Hash | Message | Day |
|---|---|---|
| pending | feat(users): module with crud, tenant scope, and service tests | Day 8 |
| `9537028` | docs(myLogs): day-based milestone log through phase 3c | Day 8 |
| `7577304` | feat(auth): login, me, jwt middleware, and service tests | Day 8 |
| `a8ac886` | feat(prisma): seed roles, permissions, and super admin | Day 5 |
| `62e4a0c` | feat(prisma): initial migration + dev log update | Day 5 |
| `a82a609` | docs(myLogs): accurate day 1 log | Day 1 |
| `d436eb2` | feat(backend): server bootstrap + prisma event typing + express request augmentation | Day 1 |
| `b8c9d8e` | Merge branch 'dev_Sohaim' | Day 1 |
| `54fb5bd` | Update README.md | Day 1 |
| `2d4f4a6` | feat: all corrected config changes implemented from src | Day 1 |
| `e268fc1` | chore(repo): enforce LF line endings | Day 1 |
| `42b95ff` | chore(backend): scaffold package, tsconfig, env template, prisma schema | Day 1 |
| `7777443` | chore(repo): baseline gitignore, readme, and docs | Day 1 |

---

## Upcoming Phases

### Phase 3E — Partners Module (Next)
- [ ] `src/modules/partners/partner.schema.ts`
- [ ] `src/modules/partners/partner.service.ts` — onboarding, approval, suspension, listing
- [ ] `src/modules/partners/partner.controller.ts`
- [ ] `src/modules/partners/partner.routes.ts`
- [ ] `src/modules/partners/__tests__/partner.service.test.ts`
- [ ] Wire into `src/app.ts` at `/api/v1/partners`
- [ ] Endpoints:
  - [ ] `GET /api/v1/partners` — list (super_admin only, or own for partner_admin)
  - [ ] `GET /api/v1/partners/:id`
  - [ ] `POST /api/v1/partners` — onboarding request
  - [ ] `PATCH /api/v1/partners/:id`
  - [ ] `PATCH /api/v1/partners/:id/status` — approve/reject/suspend (super_admin)
- [ ] Manual smoke test
- [ ] Commit + push

### Phase 3F — Leads Module
- [ ] CRUD + assignment + duplicate detection + status transitions
- [ ] Tenant-scoped, counselor-scoped via `buildAssignmentScope`

### Phase 3G — Follow-ups Module

### Phase 3H — Admissions + Payments

### Phase 3I — Courses + Marketing Assets

### Phase 3J — Commissions

### Phase 3K — Notifications

### Phase 3L — Reports

### Phase 3M — Audit Logs

---

## Working Rules (Locked)
- One step per turn when possible; verify output before moving on
- Commit + push after each meaningful change
- Stage files by explicit path — never `git add .`
- Backend code: `admission-hub/backend/`
- Docs: `admission-hub/docs/`
- Never read `process.env` outside `src/config/env.ts`
- Never `new PrismaClient()` outside `src/config/prisma.ts`
- ESM: every relative import uses `.js` extension
- Never run `npm`/`npx` from repo root — always from `backend/`
- Use `./node_modules/.bin/prisma` — avoid `npx prisma` (may fetch a different version)
- Tests must run against `admission_hub_test` only
- Env: Ubuntu + bash
- IDE: Antigravity
- Day labels: `Day N — DD Month YYYY` only, no weekday names

---

## Full Stack Integration End Date:
[to be filled when frontend integration completes]