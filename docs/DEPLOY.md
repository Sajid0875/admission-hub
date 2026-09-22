# Production deploy — Admission Hub

Target layout (matches System Design §62):

| Layer | Host | Notes |
|---|---|---|
| Frontend | **Vercel** | `frontend/` Next.js App Router |
| API | **Render** (or Railway) | `backend/` Docker image |
| Database | Managed Postgres | Render Blueprint DB or Railway Postgres |

Local Docker Compose remains for development only.

---

## 0. Prerequisites

- [x] PR #12 merged to `main` (payment gateway)
- GitHub repo: `Sajid0875/admission-hub`
- Accounts: [Render](https://render.com) + [Vercel](https://vercel.com) (or Railway for API+DB)

---

## 1. Database (Neon free or Render Postgres)

Create a Postgres database and copy the connection string as `DATABASE_URL`.

**Neon (recommended free):** https://console.neon.tech → New project → Connection string  
**Render Postgres:** Dashboard → New → Postgres (paid) → Internal/External URL  

---

## 2. Deploy API (Render Blueprint)

1. Open [Render Dashboard → New → Blueprint](https://dashboard.render.com/blueprints)
2. Connect `Sajid0875/admission-hub`, branch `main`
3. Confirm service `admission-hub-api` from root `render.yaml`
4. Fill required env (Blueprint marks `sync: false`):
   - `DATABASE_URL` — from step 1
   - `CLIENT_URL` — leave blank until Vercel URL exists, then set and redeploy
5. Deploy → wait for health check on `/health`
6. Note the API public URL, e.g. `https://admission-hub-api.onrender.com`

First boot runs `prisma migrate deploy` + seed (`RUN_SEED=true`).  
QA logins are the same as local seed (change passwords before real users).

Optional live integrations (env on API service):

```text
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=meta|twilio
…provider credentials…

PAYMENT_GATEWAY_ENABLED=true
PAYMENT_GATEWAY_PROVIDER=razorpay
RAZORPAY_KEY_ID=…
RAZORPAY_KEY_SECRET=…
```

---

## 3. Deploy frontend (Vercel)

From `frontend/`:

```bash
cd frontend
npx vercel login
npx vercel link          # link to a new or existing project; root = frontend
npx vercel env add NEXT_PUBLIC_API_URL production
# value: https://<api-host>/api/v1
npx vercel env add NEXT_PUBLIC_USE_MOCKS production
# value: false
npx vercel --prod
```

Or: Vercel Dashboard → Import Git repo → **Root Directory = `frontend`** → set the same env vars → Deploy.

---

## 3. Wire CORS

On Render API, set:

```text
CLIENT_URL=https://<your-vercel-app>.vercel.app
```

Redeploy the API so CORS allows the FE origin.

---

## 4. Smoke checklist (prod)

1. `GET https://<api>/health` → 200  
2. Open FE → login `admin@whitedavid23.local` / `ChangeMe!Adm1n2026`  
3. Partner Admin → create lead → follow-up  
4. Convert lead → admission → **Verify**  
5. Commission appears; reports CSV/PDF export  
6. Admissions → **Pay remaining (gateway)** (stub)  

---

## Railway alternative (API + DB on one platform)

```bash
# Install / login
npm i -g @railway/cli   # or use Cursor Railway MCP after mcp_auth
railway login
railway init            # link project
railway add             # add Postgres plugin
# Set rootDir / Dockerfile for backend service; DATABASE_URL from plugin
railway up
```

Then deploy FE on Vercel with `NEXT_PUBLIC_API_URL=https://<railway-api>/api/v1`.

---

## Rollback

- **Vercel:** Dashboard → Deployments → Promote previous production deployment  
- **Render:** Dashboard → Events → Redeploy previous deploy  
