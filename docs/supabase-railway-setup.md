# Supabase + Railway setup guide

Manual steps to deploy SODA KANBAN after the code migration. Complete these in order.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy from **Project Settings → API**:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)
   - JWT secret → `SUPABASE_JWT_SECRET`
3. Copy from **Project Settings → Database**:
   - Direct connection (`:5432`) → `DATABASE_URL_DIRECT` (local migrations)
   - Transaction pooler (`:6543`) → `DATABASE_URL` on Railway (prefix with `postgresql+asyncpg://`)
4. **Authentication → Providers**: enable Email.
5. **Authentication → URL configuration**: set Site URL to your Railway frontend URL (update after deploy).

## 2. Supabase Storage

Run the SQL in [`supabase-storage.sql`](supabase-storage.sql) in the Supabase SQL editor.

Creates private buckets `attachments` and `avatars` with service-role access.

## 3. Keycloak (email)

Keycloak sends email for identity flows (verify email, password reset, admin notifications). Configure SMTP in your realm so those messages can be delivered. Use the **same SMTP server** for workspace invite emails from the API.

Docs: [Keycloak — Configuring email for a realm](https://www.keycloak.org/docs/latest/server_admin/index.html#_email)

### 3.1 Deploy or access Keycloak

1. Run Keycloak (self-hosted, Railway, or another host) and create a realm for SODA KANBAN.
2. Open **Realm settings → Email**.

### 3.2 Configure SMTP (Email tab)

Fill in the fields per the [Keycloak email documentation](https://www.keycloak.org/docs/latest/server_admin/index.html#_email):

| Field | Purpose |
|-------|---------|
| **From** | Sender address (`FROM_EMAIL` for the API) |
| **From display name** | Optional friendly name (e.g. `SODA KANBAN`) |
| **Reply to** | Optional reply address |
| **Host** | SMTP server hostname |
| **Port** | Usually `587` (STARTTLS) or `465` (SSL/TLS) |
| **Encryption** | Enable SSL/TLS if your provider requires it |
| **Authentication** | ON if your SMTP server requires login |
| **Username** / **Password** | SMTP credentials (password auth) |

For OAuth2-based SMTP (e.g. Microsoft 365), use **Authentication Type: token** and follow [XOAUTH2 email configuration](https://www.keycloak.org/docs/latest/server_admin/index.html#_email) in the Keycloak docs.

### 3.3 Test Keycloak email

1. In **Realm settings → Email**, click **Save**, then **Test connection** (if available).
2. Enable **Verify email** or **Forgot password** under **Realm settings → Login** and confirm a test user receives mail.

### 3.4 API email (workspace invites)

The FastAPI app sends invite and notification email through the same SMTP server. On Railway, set the SMTP variables below to match the Keycloak **Email** tab values.

## 4. Database migrations

```bash
cd backend
cp .env.example .env   # fill Supabase direct URL and secrets
poetry install
poetry run alembic upgrade head
```

Confirm tables appear in Supabase Table Editor.

## 5. Railway — API service

1. New project at [railway.app](https://railway.app), connect GitHub repo.
2. Add **Redis** plugin; note `REDIS_URL`.
3. Add service from repo, root directory: `backend`, builder: Dockerfile.
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase pooler URL (`postgresql+asyncpg://...:6543/...`) |
| `REDIS_URL` | Railway Redis reference |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `SMTP_HOST` | Same as Keycloak Email → Host |
| `SMTP_PORT` | Same as Keycloak Email → Port (e.g. `587` or `465`) |
| `SMTP_USER` | SMTP username (if authentication enabled) |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_USE_TLS` | `true` for STARTTLS on port 587; `false` if using SSL on 465 |
| `FROM_EMAIL` | Same as Keycloak Email → From |
| `CORS_ORIGINS` | `["https://YOUR-FRONTEND.up.railway.app"]` |
| `FRONTEND_URL` | Frontend Railway URL |
| `RUN_MIGRATIONS` | `true` (first deploy) |

5. Generate public domain; verify `GET /health` returns `{"status":"ok"}`.

## 6. Railway — frontend service

1. Add second service, root directory: `frontend`.
2. Build: `npm ci && npm run build`
3. Start: `npx serve dist -s`
4. Build-time variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_API_URL` | `https://YOUR-API.up.railway.app/api/v1` |
| `VITE_WS_URL` | `wss://YOUR-API.up.railway.app` |

5. Generate public domain.

### Troubleshooting: `Railpack could not determine how to build the app`

This happens when Railway builds the **repo root** (`.`) instead of a service folder. The root is a monorepo (`backend/`, `frontend/`) with no `package.json` or `Dockerfile` at the top level.

**Fix:** For each Railway service, set **Settings → Root Directory**:

| Service | Root Directory | Builder |
|---------|----------------|---------|
| API | `backend` | Dockerfile (uses [`backend/railway.toml`](../backend/railway.toml)) |
| Frontend | `frontend` | Railpack/Nixpacks (uses [`frontend/railway.toml`](../frontend/railway.toml)) |

Then trigger a new deploy. Do **not** deploy from `/` (repository root).

## 7. Wire URLs

1. Update API `CORS_ORIGINS` and `FRONTEND_URL` with real frontend URL.
2. In Supabase **Authentication → URL configuration**:
   - Site URL = frontend URL
   - Redirect URLs: frontend URL + `/login`, `/register`
3. Redeploy both services.

## 8. E2E checklist

- [ ] Register → complete profile → dashboard
- [ ] Logout → login again
- [ ] Workspace invite link → register → correct workspace
- [ ] Create board, cards, drag-and-drop
- [ ] Real-time updates in two tabs
- [ ] Upload/download/delete attachment
- [ ] Upload avatar; survives API redeploy
- [ ] Invite email arrives (check recipient inbox; confirm SMTP in Keycloak **Realm settings → Email**)
- [ ] GitHub CI passes on PR (tests only, no AWS secrets)

## 9. Decommission AWS (after stable cutover)

1. Update README live app link.
2. Remove GitHub secrets: `AWS_DEPLOY_ROLE_ARN`, `FRONTEND_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.
3. Run `terraform destroy` in `infra/terraform-aws-legacy/` (or delete resources manually).
4. Empty S3 buckets, delete ECR images, release unused Elastic IPs.
