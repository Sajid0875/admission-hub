# Local-only operator folder (mostly gitignored)

This directory holds **machine-specific** env copies and deploy notes.

| Tracked | Gitignored (create yourself) |
|---|---|
| `README.md` (this file) | `backend.env` |
| `backend.env.example` | `frontend.env.local` |
| `frontend.env.local.example` | `railway.notes.md` |
| `railway.notes.example.md` | any other `*.local` / secrets |

## Why

Real `JWT_SECRET`, Razorpay/WhatsApp keys, and production DB URLs must **never** be pushed to GitHub. Copy examples → gitignored files, then symlink or `cp` into `backend/.env` / `frontend/.env.local`.

## First-time setup

```bash
# From repo root
cp local/backend.env.example local/backend.env
cp local/frontend.env.local.example local/frontend.env.local
cp local/railway.notes.example.md local/railway.notes.md

# Install into the app folders (gitignored there too)
cp local/backend.env backend/.env
cp local/frontend.env.local frontend/.env.local
```

Edit `local/backend.env` and set a long random `JWT_SECRET` before running locally.

Fill `local/railway.notes.md` with dashboard links after you deploy (URLs are fine; paste secrets only if you keep this folder private / never commit).

## See also

- [../docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md) — clone → run
- [../docs/DEPLOY.md](../docs/DEPLOY.md) — Railway production (current live platform)
- [../README.md](../README.md) — project overview
