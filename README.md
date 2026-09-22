# Admission Hub

Multi-tenant partner admissions CRM for **WhiteDavid23 Academy**.

| | |
|---|---|
| **Monorepo** | `backend/` Express + Prisma + PostgreSQL · `frontend/` Next.js |
| **Live** | [Railway](https://railway.app) — [UI](https://web-production-e4c95.up.railway.app) · [API](https://api-production-f7fb.up.railway.app) |
| **Clone & run** | **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** |
| **Deploy again** | **[docs/DEPLOY.md](docs/DEPLOY.md)** |
| **Dev log** | [docs/myLogs.md](docs/myLogs.md) |
| **Local secrets** | [local/README.md](local/README.md) (gitignored copies) |

---

## Quick start (choose one)

### Docker (one command)

```bash
git clone https://github.com/Sajid0875/admission-hub.git
cd admission-hub
docker compose up --build
```

- UI http://localhost:3000 · API http://localhost:4000/health · Docs http://localhost:4000/api/v1/docs

### Local Node

```bash
# secrets (never commit)
cp local/backend.env.example local/backend.env
cp local/frontend.env.local.example local/frontend.env.local
# set JWT_SECRET in local/backend.env  (openssl rand -hex 32)
cp local/backend.env backend/.env
cp local/frontend.env.local frontend/.env.local

# API
cd backend && npm install && ./node_modules/.bin/prisma migrate dev && npm run prisma:seed && npm run dev

# UI (other terminal)
cd frontend && npm install && npm run dev
```

Full walkthrough: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

---

## QA logins (seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@whitedavid23.local` | `ChangeMe!Adm1n2026` |
| Partner Admin | `partner@whitedavid23.com` | `ChangeMe!Partner2026` |
| Counselor | `counselor@whitedavid23.com` | `ChangeMe!Counselor2026` |
| Support | `support@whitedavid23.com` | `ChangeMe!Support2026` |

---

## Layout

```text
admission-hub/
├── backend/            # API :4000
├── frontend/           # UI :3000
├── docs/               # Specs, GETTING_STARTED, DEPLOY, myLogs
├── local/              # Operator env templates + gitignored secrets
├── docker-compose.yml  # Postgres + API + FE
└── render.yaml         # Optional Render Blueprint (alt to Railway)
```

---

## Tests

```bash
cd backend && npm run test:db:setup && npm test
cd backend && npm run test:e2e          # API on :4000
cd frontend && npm run test:smoke
```

---

## Auth

Login returns short-lived `token` + opaque `refreshToken`.  
`POST /api/v1/auth/refresh` rotates; `POST /api/v1/auth/logout` revokes.  
Defaults: access `15m`, refresh `30d`.

---

## Production (Railway)

Already shipped. To reproduce or recreate: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

| | URL |
|---|---|
| UI | https://web-production-e4c95.up.railway.app |
| API | https://api-production-f7fb.up.railway.app |
| Health | https://api-production-f7fb.up.railway.app/health |
| Swagger | https://api-production-f7fb.up.railway.app/api/v1/docs |

Secrets live in the Railway dashboard (and optionally under gitignored `local/`). Do **not** commit `.env` files.

---

## Integrations (optional)

- **WhatsApp:** stub default; Meta/Twilio via env — see `backend/.env.example`
- **Payments:** stub gateway default; Razorpay when enabled + keys

---

## Specs

- [Developer Handover Pack](docs/developer-handover-pack.pdf)
- [Software Requirements Specification](docs/software-requirements-specification.pdf)
- [Engineering log](docs/myLogs.md)
