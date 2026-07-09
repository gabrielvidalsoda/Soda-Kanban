# Terraform — AWS infrastructure

## Prerequisites

- AWS CLI configured
- Terraform >= 1.5
- Docker (for first ECR image push)

## 1. Bootstrap remote state (recommended)

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply
```

Then uncomment the `backend "s3"` block in `infra/terraform/main.tf` and run:

```bash
cd ../
terraform init -migrate-state
```

## 2. First-time deploy

Generate secrets:

```bash
export TF_VAR_database_password=$(openssl rand -base64 32)
export TF_VAR_jwt_secret=$(openssl rand -hex 64)
```

Apply infrastructure (set `github_repository` if using GitHub Actions OIDC):

```bash
cd infra/terraform
terraform init
terraform apply \
  -var="github_repository=your-org/soda-kanba"
```

## 3. Push first API image

ECS needs an image before the service becomes healthy:

```bash
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "${ECR_URL%%/*}"

cd ../../backend
docker build -t "$ECR_URL:latest" .
docker push "$ECR_URL:latest"

aws ecs update-service \
  --cluster soda-kanba-prod \
  --service soda-kanba-prod-api \
  --force-new-deployment
```

## 4. Update frontend URL (if no custom domain)

After the first apply, set `frontend_url` to the CloudFront URL and re-apply:

```bash
terraform apply \
  -var="frontend_url=$(terraform output -raw frontend_url)" \
  -var="github_repository=your-org/soda-kanba"
```

## 5. Deploy frontend

```bash
cd ../../frontend
npm ci && npm run build
aws s3 sync dist/ s3://$(cd ../infra/terraform && terraform output -raw frontend_s3_bucket) --delete
aws cloudfront create-invalidation \
  --distribution-id $(cd ../infra/terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## 6. GitHub Actions secrets

After `terraform apply`, configure these in GitHub **Settings → Secrets**:

| Secret | Source |
|--------|--------|
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |
| `FRONTEND_S3_BUCKET` | `terraform output -raw frontend_s3_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |

Requires `github_repository` to be set during `terraform apply`.

## 7. SES email

If `route53_zone_id` is set, DKIM and SPF records are created automatically.

Otherwise, add DKIM CNAME records from:

```bash
terraform output ses_dkim_tokens
```

Request **SES production access** in the AWS console before sending to unverified recipients.

## 8. Custom domain (e.g. sodakanban.kfsoda.tech)

Set in `terraform.tfvars`:

```hcl
domain_name  = "sodakanban.kfsoda.tech"
frontend_url = "https://sodakanban.kfsoda.tech"
```

### Step 1 — Request certificate

```bash
cd infra/terraform
terraform apply -target=module.acm.aws_acm_certificate.main
terraform output acm_dns_validation_records
```

### Step 2 — Add DNS records in HostGator

In **Editor de zona DNS** for `kfsoda.tech`:

1. **ACM validation** — add the CNAME from `acm_dns_validation_records` (Name = subdomain part only, e.g. `_abc123.sodakanban`)
2. **App CNAME**:

| Type | Name | Target |
|------|------|--------|
| CNAME | `sodakanban` | `terraform output -raw cloudfront_domain_name` |

### Step 3 — Finish apply

After DNS propagates (15–60 min):

```bash
terraform apply
```

This validates the certificate, attaches the domain to CloudFront, and updates `FRONTEND_URL` on ECS.

Your app will be at **https://sodakanban.kfsoda.tech**.

## Outputs

```bash
terraform output
```

Key outputs: `frontend_url`, `ecr_repository_url`, `deploy_role_arn`, `cloudfront_distribution_id`, `frontend_s3_bucket`
