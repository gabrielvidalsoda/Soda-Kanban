# SODA KANBAN

**Live app:** [https://dd8ag4utxbsvy.cloudfront.net](https://dd8ag4utxbsvy.cloudfront.net)

A Kanban application with workspaces, real-time board sync, email notifications, and AWS deployment.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, @dnd-kit, TanStack Query |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, Poetry |
| Database | PostgreSQL 16 |
| Cache / pub-sub | Redis 7 |
| Cloud | AWS (RDS, ECS Fargate, S3, CloudFront, ElastiCache, SES, ECR) |

## Features

- Email/password authentication with JWT access + refresh tokens
- Workspaces with team members and invite links
- Kanban boards with lists, cards, drag-and-drop
- Card details: description, assignee, due date, comments
- File attachments via S3 presigned URLs
- Board visibility: private, team, public
- Real-time board updates via WebSockets + Redis pub/sub
- Configurable email notification preferences

## Quick start (local)

### Prerequisites

- Docker & Docker Compose
- Poetry 2.x
- Node.js 20+

### 1. Start infrastructure

```bash
cd infra
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
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
├── backend/          # FastAPI API (Poetry)
├── frontend/         # React SPA (Vite)
├── infra/            # docker-compose + Terraform
└── .github/workflows # CI/CD
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

## AWS deployment

Full instructions: [`infra/terraform/README.md`](infra/terraform/README.md)

### Quick summary

1. **Bootstrap** remote Terraform state (`infra/terraform/bootstrap/`)
2. **Apply** Terraform with secrets and optional `github_repository`
3. **Push** the first Docker image to ECR
4. **Re-apply** with `frontend_url` set to the CloudFront URL (unless using a custom domain)
5. **Configure** GitHub secrets from `terraform output`
6. **Request** SES production access for outbound email

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars  # edit as needed
terraform init
terraform apply \
  -var="database_password=..." \
  -var="jwt_secret=..." \
  -var="github_repository=your-org/soda-kanba"
```

GitHub Actions (`.github/workflows/ci.yml`) runs tests on PRs and on push to `main`:

- Builds and pushes the API image to ECR
- Runs Alembic migrations via ECS run-task
- Deploys ECS service
- Syncs frontend to S3 and invalidates CloudFront

### GitHub secrets

| Secret | Terraform output |
|--------|------------------|
| `AWS_DEPLOY_ROLE_ARN` | `deploy_role_arn` |
| `FRONTEND_S3_BUCKET` | `frontend_s3_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |

### Optional: custom domain

Set `domain_name` and `route53_zone_id` in Terraform to provision ACM, CloudFront alias, and Route 53 records automatically.

## Testing

```bash
# Backend
cd backend && poetry run pytest

# Frontend
cd frontend && npm run build
```
