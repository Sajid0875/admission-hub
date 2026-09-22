# Admission Hub — Frontend

Next.js UI for the WhiteDavid23 Academy partner admissions CRM.

This folder is part of the monorepo at the repo root. Prefer root docs for clone / run / deploy.

| Doc | Purpose |
|---|---|
| [../docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md) | Clone → env → run |
| [../docs/DEPLOY.md](../docs/DEPLOY.md) | Railway production |
| [../README.md](../README.md) | Monorepo overview + live URLs |
| [../local/README.md](../local/README.md) | Local secrets (gitignored) |

## Local run

```bash
# From repo root — copy secrets first
cp local/frontend.env.local.example local/frontend.env.local
cp local/frontend.env.local .env.local

npm install
npm run dev   # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` must point at the API (`http://localhost:4000/api/v1` locally).

## Production

Shipped on Railway as service `web` (Dockerfile, root directory `frontend/`).  
Public UI: https://web-production-e4c95.up.railway.app

## QA logins

Same seed users as the API — see root README or `docs/GETTING_STARTED.md`.
