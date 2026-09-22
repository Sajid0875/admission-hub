# Production deploy — Admission Hub (Railway)

**Current production platform: [Railway](https://railway.app)**  
Services: managed **Postgres** + Docker **api** (`backend/`) + Docker **web** (`frontend/`).

Alternate hosts (Vercel FE / Render API) are documented at the bottom for reference.  
Local development: [GETTING_STARTED.md](./GETTING_STARTED.md) · Compose: root `docker-compose.yml`.

---

## Live URLs (shipped 23 Sep 2026)

| Service | URL |
|---|---|
| Frontend | https://web-production-e4c95.up.railway.app |
| API | https://api-production-f7fb.up.railway.app |
| Health | https://api-production-f7fb.up.railway.app/health |
| Swagger | https://api-production-f7fb.up.railway.app/api/v1/docs |

Keep a private copy of dashboard notes in `local/railway.notes.md` (gitignored). Template: `local/railway.notes.example.md`.

---

## Prerequisites

- GitHub repo access: `Sajid0875/admission-hub` (branch `main`)
- Railway account (CLI or dashboard)
- Optional: `npm i -g @railway/cli`

---

## A. Deploy on Railway (recommended — matches production)

### A1. Create project + Postgres

1. Railway → **New Project** → name e.g. `admission-hub`
2. **Add Postgres** (template `postgres`)
3. Wait until Postgres is **SUCCESS**

### A2. API service (`api`)

1. **New Service** → **GitHub Repo** → `Sajid0875/admission-hub` @ `main`
2. Service settings:
   - **Root Directory:** `/backend` (or `backend`)
   - **Builder:** Dockerfile
   - **Dockerfile path:** `Dockerfile`
   - **Healthcheck path:** `/health`
   - **Watch paths:** `backend/**`
3. **Variables** (api service):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `openssl rand -hex 32` output (dashboard only) |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `CLIENT_URL` | FE public URL (set after A3) |
| `LOG_LEVEL` | `info` |
| `FOLLOWUP_REMINDERS_ENABLED` | `true` |
| `FOLLOWUP_REMINDER_INTERVAL_MS` | `60000` |
| `FOLLOWUP_DUE_SOON_MINUTES` | `60` |
| `WHATSAPP_ENABLED` | `false` |
| `WHATSAPP_PROVIDER` | `stub` |
| `PAYMENT_GATEWAY_ENABLED` | `false` |
| `PAYMENT_GATEWAY_PROVIDER` | `stub` |
| `RUN_SEED` | `true` initially (QA seed); later `false` |

4. **Generate domain** → note `https://api-….up.railway.app`
5. Entrypoint runs `prisma migrate deploy` then optional seed (`backend/docker-entrypoint.sh`)

### A3. Frontend service (`web`)

1. **New Service** → same GitHub repo @ `main`
2. Settings:
   - **Root Directory:** `/frontend`
   - **Builder:** Dockerfile
   - **Dockerfile path:** `Dockerfile`
   - **Watch paths:** `frontend/**`
3. **Variables** (must exist at **build** time for Next.js):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-….up.railway.app/api/v1` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

4. **Generate domain** on port **3000** → `https://web-….up.railway.app`
5. Set **api** `CLIENT_URL` = that web URL → **redeploy api** (CORS)

### A4. Smoke

1. `GET https://api-…/health` → `{"status":"ok",…}`
2. Open web URL → login `admin@whitedavid23.local` / `ChangeMe!Adm1n2026`
3. Partner Admin → lead → follow-up → admit → verify → commission
4. Reports CSV/PDF; Admissions → Pay remaining (gateway stub)

### A5. Optional live integrations

On **api** variables:

```text
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=meta|twilio
# + provider credentials from backend/.env.example

PAYMENT_GATEWAY_ENABLED=true
PAYMENT_GATEWAY_PROVIDER=razorpay
RAZORPAY_KEY_ID=…
RAZORPAY_KEY_SECRET=…
```

---

## B. CLI sketch (same layout)

```bash
railway login
railway link          # select admission-hub project
# Prefer dashboard for first-time Dockerfile root dirs; then:
railway up            # from a linked service directory if configured
```

Redeploy after env changes: Railway dashboard → service → **Redeploy**, or MCP `redeploy`.

---

## C. Alternatives (not current production)

### Render API + Neon DB + Vercel FE

1. Neon (or Render Postgres) → `DATABASE_URL`
2. Render Blueprint from root `render.yaml` → Docker API
3. Vercel project, **Root Directory = `frontend`**, env:
   - `NEXT_PUBLIC_API_URL=https://<api>/api/v1`
   - `NEXT_PUBLIC_USE_MOCKS=false`
4. API `CLIENT_URL=https://<vercel-app>.vercel.app`

### Rollback

- **Railway:** service → Deployments → redeploy previous successful deploy  
- **Vercel:** Deployments → Promote previous  
- **Render:** Events → Redeploy previous  

---

## Security checklist

- [ ] `JWT_SECRET` only in Railway (or `local/`; never git)
- [ ] Rotate JWT if it ever appeared in chat/logs
- [ ] Set `RUN_SEED=false` before real customers
- [ ] Change seeded QA passwords or disable seed users
- [ ] WhatsApp / Razorpay keys only in host env / `local/`
