# Admission Hub

Multi-tenant partner admissions CRM and reporting platform for WhiteDavid23 Academy.

## Layout

```text
admission-hub/
├── backend/    # Express + Prisma + PostgreSQL API (:4000)
├── frontend/   # Next.js App Router UI (:3000)
└── docs/       # Specs, handover, and engineering logs
```

## Quick start

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
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
```

## Roles

- Super Admin
- Partner Admin
- Counselor / Team Member
- Support

## Docs

- [Developer Handover Pack](docs/developer-handover-pack.pdf)
- [Software Requirements Specification](docs/software-requirements-specification.pdf)
- [Engineering log](docs/myLogs.md)
