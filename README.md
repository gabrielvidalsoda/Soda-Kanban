# SODA KANBAN

A Kanban application with workspaces, real-time board sync, and email notifications.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Supabase Auth |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, Poetry |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage (attachments, avatars) |
| Cache / pub-sub | Redis 7 |
| Email | Resend |
| Hosting | Railway (API + Redis + frontend) |

## Features

- Email/password authentication via Supabase Auth
- Workspaces with team members and invite links
- Kanban boards with lists, cards, drag-and-drop
- Card details: description, assignee, due date, comments
- File attachments via Supabase Storage signed URLs
- Board visibility: private, team, public
- Real-time board updates via WebSockets + Redis pub/sub
- Configurable email notification preferences

## Quick start (local)

### Prerequisites

- Docker & Docker Compose
- Poetry 2.x
- Node.js 20+
- Supabase project (or [Supabase CLI](https://supabase.com/docs/guides/cli) for local auth)

### 1. Start infrastructure

```bash
cd infra
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # set Supabase URL, keys, JWT secret
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

App: http://localhost:5173

### Full stack with Docker

```bash
cd infra
docker compose up --build
```

## Project structure

```
SODA-KANBAN/
├── backend/                    # FastAPI API (Poetry)
├── frontend/                   # React SPA (Vite)
├── docs/                       # Deployment guides
├── infra/                      # docker-compose
├── infra/terraform-aws-legacy/ # Archived AWS Terraform
└── .github/workflows           # CI (tests only)
```

## Project tracking

- [TODOs](todos.md) — feature backlog with status and priority
- [Known issues](known_issues.md) — bugs and production limitations
- [Tasks entity fields](docs/entities/tasks.fields.json) — Kanban card field catalog (issue-tracker mapping)

## API overview

| Area | Prefix |
|------|--------|
| Auth | `/api/v1/auth` |
| Workspaces | `/api/v1/workspaces` |
| Boards | `/api/v1/boards` |
| WebSocket | `/ws/boards/{board_id}?token=...` |

## Production deployment (Supabase + Railway)

Full step-by-step guide: [`docs/supabase-railway-setup.md`](docs/supabase-railway-setup.md)

### Summary

1. Create Supabase project (Postgres, Auth, Storage)
2. Run [`docs/supabase-storage.sql`](docs/supabase-storage.sql) for storage buckets
3. Create Resend account for transactional email
4. Run Alembic migrations against Supabase
5. Deploy API (`backend/`) and frontend (`frontend/`) on Railway with Redis
6. Wire CORS, Supabase auth URLs, and frontend env vars

GitHub Actions runs backend tests and frontend build on PRs. Railway deploys from GitHub on push to `main`.

## Legacy AWS deployment

The previous AWS stack (ECS, RDS, S3, CloudFront) is archived in [`infra/terraform-aws-legacy/`](infra/terraform-aws-legacy/). See [`docs/cloud-alternatives.md`](docs/cloud-alternatives.md) for why we migrated.

## Testing

```bash
# Backend
cd backend && poetry run pytest

# Frontend
cd frontend && npm run build
```
