# Railway production notes (gitignored when saved as railway.notes.md)
#
# Copy: cp local/railway.notes.example.md local/railway.notes.md
# Fill after deploy. Public URLs are OK in docs; keep JWT/DB passwords out of git.

## Live project (shipped 23 Sep 2026)

- Platform: **Railway** (Postgres + API Docker + FE Docker)
- Project name: `admission-hub`
- Dashboard: https://railway.app (open project `admission-hub`)

### Public URLs

| Service | URL |
|---|---|
| Frontend | https://web-production-e4c95.up.railway.app |
| API | https://api-production-f7fb.up.railway.app |
| Health | https://api-production-f7fb.up.railway.app/health |
| OpenAPI / Swagger | https://api-production-f7fb.up.railway.app/api/v1/docs |

### Service layout

| Railway service | Root / image | Port |
|---|---|---|
| `Postgres` | Railway Postgres template | 5432 (private) |
| `api` | repo `backend/` + `Dockerfile` | 4000 |
| `web` | repo `frontend/` + `Dockerfile` | 3000 |

### Env vars (set in Railway dashboard — do not commit values)

**api**

- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` = long random (rotate if ever leaked in chat/logs)
- `CLIENT_URL` = `https://web-production-e4c95.up.railway.app`
- `JWT_EXPIRES_IN` = `15m`
- `JWT_REFRESH_EXPIRES_IN` = `30d`
- `RUN_SEED` = `true` (QA seed on boot; set `false` once real users exist)
- WhatsApp / Razorpay optional — see `backend/.env.example`

**web**

- `NEXT_PUBLIC_API_URL` = `https://api-production-f7fb.up.railway.app/api/v1`
- `NEXT_PUBLIC_USE_MOCKS` = `false`

### Seeded QA logins (same as local seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@whitedavid23.local` | `ChangeMe!Adm1n2026` |
| Partner Admin | `partner@whitedavid23.com` | `ChangeMe!Partner2026` |
| Counselor | `counselor@whitedavid23.com` | `ChangeMe!Counselor2026` |
| Support | `support@whitedavid23.com` | `ChangeMe!Support2026` |

Change these before inviting real users. Full redeploy steps: `docs/DEPLOY.md`.
