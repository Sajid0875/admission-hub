# Admission Hub

Multi-tenant partner admissions CRM and reporting platform for WhiteDavid23 Academy.

## Layout

```text
admission-hub/
├── backend/           # Express + Prisma + PostgreSQL API (:4000)
├── frontend/          # Next.js App Router UI (:3000)
├── docs/              # Specs, handover, and engineering logs
└── docker-compose.yml # One-command local stack
```

## Quick start (Docker)

```bash
docker compose up --build
```

- UI: http://localhost:3000  
- API health: http://localhost:4000/health  
- OpenAPI: http://localhost:4000/api/v1/docs  

Seeded QA logins:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@whitedavid23.local` | `ChangeMe!Adm1n2026` |
| Partner Admin | `partner@whitedavid23.com` | `ChangeMe!Partner2026` |
| Counselor | `counselor@whitedavid23.com` | `ChangeMe!Counselor2026` |
| Support | `support@whitedavid23.com` | `ChangeMe!Support2026` |

Stop with `docker compose down`. Add `-v` to also drop the Postgres volume.

## Quick start (local Node)

```bash
# Backend
cd backend
cp .env.example .env   # set DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm install
npm run dev
```

## Tests

```bash
# Backend unit/service tests (needs admission_hub_test DB)
cd backend && npm test

# Live API E2E (API must be running on :4000)
cd backend && npm run test:e2e

# Frontend mock smoke
cd frontend && npm run test:smoke
```

## Auth tokens

Login returns a short-lived JWT (`token`) plus an opaque `refreshToken` (hashed in DB).  
`POST /api/v1/auth/refresh` rotates the pair; `POST /api/v1/auth/logout` revokes the refresh token.  
Defaults: access `15m`, refresh `30d` (`JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`).

Interactive API docs: http://localhost:4000/api/v1/docs (OpenAPI JSON: `/api/v1/openapi.json`).

## Production deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel (FE) + Render Blueprint (API + Postgres) from `render.yaml`.

## WhatsApp

Follow-up reminders can fan out WhatsApp text via an adapter:

- Default: `WHATSAPP_PROVIDER=stub` (logs only; safe for local/CI)
- Meta: `WHATSAPP_ENABLED=true`, `WHATSAPP_PROVIDER=meta`, plus `WHATSAPP_META_ACCESS_TOKEN` and `WHATSAPP_META_PHONE_NUMBER_ID`
- Twilio: `WHATSAPP_ENABLED=true`, `WHATSAPP_PROVIDER=twilio`, plus `WHATSAPP_TWILIO_ACCOUNT_SID`, `WHATSAPP_TWILIO_AUTH_TOKEN`, and `WHATSAPP_TWILIO_FROM`

Missing live credentials fall back to the stub with a warning.

## Roles

- Super Admin
- Partner Admin
- Counselor / Team Member
- Support

## Docs

- [Developer Handover Pack](docs/developer-handover-pack.pdf)
- [Software Requirements Specification](docs/software-requirements-specification.pdf)
- [Engineering log](docs/myLogs.md)
