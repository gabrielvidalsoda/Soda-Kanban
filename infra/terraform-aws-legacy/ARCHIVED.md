# Archived AWS infrastructure (legacy)

This Terraform stack deployed SODA KANBAN to AWS (ECS Fargate, RDS, S3, CloudFront, ElastiCache, SES, ECR).

**The app now runs on Supabase + Railway.** Do not apply this stack for new deployments.

## Decommissioning (after Supabase + Railway cutover)

1. Remove GitHub secrets: `AWS_DEPLOY_ROLE_ARN`, `FRONTEND_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.
2. From this directory:
   ```bash
   terraform destroy
   ```
3. Manually empty any remaining S3 buckets and delete ECR images if needed.

See also [`docs/supabase-railway-setup.md`](../../docs/supabase-railway-setup.md) section 9.
