# Clone → run → ship — Admission Hub

**Repo:** https://github.com/Sajid0875/admission-hub  
**Stack:** Express + Prisma + PostgreSQL (`backend/`) · Next.js (`frontend/`)  
**Live (Railway):** see [DEPLOY.md](./DEPLOY.md)

---

## 1. Clone

```bash
git clone https://github.com/Sajid0875/admission-hub.git
cd admission-hub
```

Requires: **Node 20+**, **npm**, **PostgreSQL 16+** (or Docker).

---

## 2. Local secrets (never pushed)

```bash
cp local/backend.env.example local/backend.env
cp local/frontend.env.local.example local/frontend.env.local
cp local/railway.notes.example.md local/railway.notes.md   # optional deploy notes

# Generate a JWT secret
# openssl rand -hex 32  → paste into local/backend.env as JWT_SECRET

cp local/backend.env backend/.env
cp local/frontend.env.local frontend/.env.local
```

`local/*` is gitignored except `README.md` and `*.example`. See [../local/README.md](../local/README.md).

---

## 3A. Fastest run — Docker Compose

```bash
docker compose up --build
```

| What | URL |
|---|---|
| UI | http://localhost:3000 |
| API health | http://localhost:4000/health |
| Swagger | http://localhost:4000/api/v1/docs |

Compose boots Postgres, migrates, seeds QA users (`RUN_SEED=true`).

Stop: `docker compose down` (add `-v` to wipe DB volume).

---

## 3B. Local Node (two terminals)

**Terminal 1 — database** (if not using Compose Postgres):

```bash
# Example: Postgres listening on localhost:5432
# Create DB: createdb admission_hub
```

**Terminal 1 — API**

```bash
cd backend
cp .env.example .env          # or use local/backend.env → backend/.env
# edit JWT_SECRET
npm install
./node_modules/.bin/prisma migrate dev
npm run prisma:seed
npm run dev                   # :4000
```

**Terminal 2 — UI**

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                   # :3000
```

---

## 4. QA logins (seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@whitedavid23.local` | `ChangeMe!Adm1n2026` |
| Partner Admin | `partner@whitedavid23.com` | `ChangeMe!Partner2026` |
| Counselor | `counselor@whitedavid23.com` | `ChangeMe!Counselor2026` |
| Support | `support@whitedavid23.com` | `ChangeMe!Support2026` |

Re-seed: `cd backend && npm run prisma:seed`

---

## 5. Tests

```bash
# Needs admission_hub_test DB (see backend/.env.test)
cd backend && npm run test:db:setup && npm test

# API must be up on :4000
cd backend && npm run test:e2e

cd frontend && npm run test:smoke
```

---

## 6. Deploy / ship

Production is on **Railway** (Postgres + `api` + `web`).  
Step-by-step (including how this stack was shipped): **[DEPLOY.md](./DEPLOY.md)**.

Public prod URLs (as of 23 Sep 2026):

- UI: https://web-production-e4c95.up.railway.app  
- API: https://api-production-f7fb.up.railway.app  

---

## 7. What not to commit

- `backend/.env`, `frontend/.env.local`, `local/backend.env`, `local/*.md` notes with secrets  
- Real `JWT_SECRET`, Razorpay/WhatsApp tokens, production `DATABASE_URL` passwords  

Safe to commit: `*.example`, `backend/.env.test` (local test DB defaults), docs.
