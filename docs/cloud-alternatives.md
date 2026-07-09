# Cloud alternatives for SODA KANBAN

Your app is a full-stack Kanban tool with auth, workspaces, real-time board sync (WebSockets + Redis), file attachments, and email notifications. Locally it already runs with **Docker Compose** (PostgreSQL + Redis + API + frontend).

The current AWS setup wires together **8+ services** (RDS, ECS Fargate, ECR, S3, CloudFront, ElastiCache, SES, VPC, ACM, Route 53, Terraform state, GitHub OIDC). That is powerful and scalable, but heavy for a solo or small-team project — especially if you want to spend time on features, not infrastructure.

Below are simpler options that can host the same stack with far less configuration.

---

## What the app actually needs from a host

| Requirement | Why |
|-------------|-----|
| **PostgreSQL** | Primary data store (users, boards, cards, etc.) |
| **Redis** | WebSocket pub/sub across API instances |
| **Long-running API** | FastAPI + WebSockets (not pure serverless) |
| **Static frontend** | React/Vite build output |
| **Object storage** | Card attachments (today: S3 presigned URLs) |
| **Transactional email** | Invites and notification preferences |
| **Docker-friendly** | You already have a `backend/Dockerfile` and `infra/docker-compose.yml` |

---

## Comparison table

| Name | Description | Advantages | Disadvantages |
|------|-------------|------------|---------------|
| **[Railway](https://railway.app)** | Modern PaaS: deploy from GitHub, managed Postgres/Redis, env vars, volumes. Feels like “Heroku but current.” | Very low ops; one dashboard for API + DB + Redis; good DX for juniors; WebSockets work; volumes fix ephemeral avatar storage; free trial credits, then usage-based pricing. | Pricing can grow with traffic; less control than AWS; vendor lock-in to their platform model. |
| **[Render](https://render.com)** | PaaS similar to Railway: web services, static sites, managed Postgres/Redis, deploy from Git repo. | Clear docs; free tier for static sites; managed DB/Redis add-ons; straightforward GitHub deploys; WebSockets on web services. | Free tier spins down (cold starts); Redis and always-on API are paid; slightly more YAML/config than Railway’s defaults. |
| **[Fly.io](https://fly.io)** | Run Docker images close to users on small VMs (“Machines”). Good fit if you want to keep containers without ECS. | You keep your existing Dockerfile; global regions; WebSockets supported; Postgres (Fly Postgres) and Upstash Redis integrations. | More concepts than Railway/Render (regions, machines, fly.toml); networking and secrets take a bit of learning. |
| **[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)** | Managed app hosting + optional Managed PostgreSQL and Spaces (S3-like storage). | Simpler than AWS; predictable pricing; Spaces replaces S3 easily; good middle ground between PaaS and cloud. | Managed Redis is separate (or run Redis on a Droplet); WebSocket + multi-instance needs care; less “batteries included” than Railway. |
| **[Hetzner / DO Droplet + Docker Compose](https://www.hetzner.com/cloud)** | One small Linux VPS; run your existing `infra/docker-compose.yml` in production. | **Simplest architecture** — one bill, one SSH target, same stack as local; cheapest at low scale (~€4–6/mo); full control without AWS service sprawl. | **You** patch the OS, backups, TLS (Caddy/nginx), and monitoring; no managed failover; single point of failure unless you add more servers. |
| **[Coolify](https://coolify.io) (self-hosted PaaS)** | Open-source “mini-Heroku” you install on a VPS; deploy via Git/Docker with a web UI. | Nice UI on top of a single server; reduces raw SSH/Docker commands; self-hosted so no platform fee beyond the VPS. | You still own the VPS (updates, backups, security); younger ecosystem than Render/Railway; email/storage still need external providers. |
| **[Heroku](https://www.heroku.com)** | Classic PaaS: `git push heroku main`, add-ons for Postgres/Redis/SendGrid. | Extremely well documented; huge tutorial ecosystem; minimal infra concepts. | **Expensive** for always-on + Postgres + Redis; eco/free tiers largely gone; less trendy, same tradeoffs as other PaaS. |
| **[Supabase](https://supabase.com) + [Render/Railway](https://render.com) API** | Split: Supabase for Postgres (+ optional Storage/Auth), separate host for FastAPI/WebSockets. | Excellent managed Postgres; built-in file storage; generous free tier on Supabase; auth could replace custom JWT later. | **Does not replace Redis/WebSockets** — you still need an API host; splitting stack means more moving parts unless you refactor. |
| **[Vercel](https://vercel.com) / [Netlify](https://www.netlify.com)** (frontend only) | Host the React static build; API stays elsewhere. | Best-in-class static hosting and previews; trivial frontend deploys. | **Cannot run your FastAPI + WebSocket + Redis backend**; only solves half the problem unless you redesign the backend. |
| **Stay on AWS but simplify** | Replace ECS/RDS/ElastiCache/CloudFront with fewer pieces (e.g. **Lightsail** containers + managed DB, or **App Runner** + RDS). | Keep AWS skills; some cost/ops reduction vs full Terraform mesh. | Still AWS complexity (IAM, VPC, SES sandbox, Terraform); not “mess with infra as little as possible.” |

---

## Recommendation (junior dev, minimal infra)

### Best overall: **Railway** or **Render**

Pick one PaaS and deploy:

1. **API** — from `backend/` (Dockerfile or Nixpacks)
2. **PostgreSQL** — managed add-on
3. **Redis** — managed add-on
4. **Frontend** — static site from `frontend/dist` or separate static service
5. **Email** — [Resend](https://resend.com), [SendGrid](https://sendgrid.com), or [Mailgun](https://www.mailgun.com) (simpler than SES production access)
6. **Attachments** — platform volume (quick fix) or S3-compatible storage ([Cloudflare R2](https://www.cloudflare.com/products/r2/), DO Spaces) with small code changes

**Why:** You delete most of Terraform, ECR, ECS task definitions, CloudFront invalidations, and VPC wiring. Git push → deploy. Environment variables replace dozens of AWS outputs.

**Railway** if you want the fastest path with the least config.  
**Render** if you prefer explicit `render.yaml` and don’t mind a bit more structure.

### Cheapest and simplest architecture: **one VPS + Docker Compose**

If you are comfortable with *one* server (not *zero* ops):

```bash
# On a Hetzner/DO VPS
git clone <repo>
cd infra
docker compose up -d --build
# + Caddy or nginx for HTTPS
```

**Why:** Your repo already models production locally. No ECS, no ECR, no CloudFront — the same four containers you develop against.

**Tradeoff:** You handle backups, SSL, and security updates. For a personal or portfolio project, that is often acceptable.

### Avoid for “simple full stack” (unless you refactor)

- **Vercel/Netlify alone** — no place for WebSockets + Redis + long-running FastAPI.
- **AWS Lambda / Cloud Functions** — WebSockets and Redis pub/sub need a redesign.
- **Full AWS** — powerful, but the opposite of “touch infra as little as possible.”

---

## Migration effort (rough)

| Target | Effort | Main code/infra changes |
|--------|--------|-------------------------|
| Railway / Render | **Low** | Env vars; optional swap SES → Resend/SendGrid; optional S3 → R2/Spaces; remove or archive `infra/terraform/` |
| VPS + Docker Compose | **Low** | Production `docker-compose` overrides; reverse proxy + TLS; backup script |
| Fly.io | **Low–medium** | `fly.toml`, secrets, Postgres/Redis provisioning |
| DigitalOcean App Platform | **Medium** | App spec YAML, Spaces for files, Redis addon wiring |
| Supabase + API host | **Medium–high** | Split concerns; possible auth/storage refactor |

---

## Suggested next step

1. **Try Railway or Render** with a staging project: API + Postgres + Redis from the existing Docker/local setup.
2. Point the frontend build at the new API URL.
3. Replace SES with Resend (or similar) when you are ready to send real invite emails.
4. Keep the AWS Terraform in the repo as reference, or move it to `infra/terraform-aws-legacy/` once the new host works.

For a junior developer who wants to learn **application** development more than **cloud** architecture, a PaaS or a single VPS is a better match than RDS + ECS + CloudFront + ElastiCache.

---

## Quick reference: current AWS vs simpler target

| Concern | AWS (today) | Railway / Render | VPS + Compose |
|---------|-------------|------------------|---------------|
| Database | RDS | Managed Postgres addon | `postgres` service |
| Cache / pub-sub | ElastiCache | Managed Redis addon | `redis` service |
| API | ECS Fargate + ECR | Web service / container | `backend` service |
| Frontend | S3 + CloudFront | Static site | `frontend` or nginx |
| Files | S3 presigned URLs | R2 / Spaces / volume | local volume or R2 |
| Email | SES (+ sandbox) | Resend / SendGrid | Resend / SendGrid |
| Deploy | Terraform + GitHub Actions | Git push / dashboard | `docker compose pull && up` |
| Monthly cost (small app) | ~$50–150+ | ~$5–25 | ~$5–10 |

*Costs are approximate and depend on traffic, region, and always-on vs sleep settings.*
