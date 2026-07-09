terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after running bootstrap (infra/terraform/bootstrap):
  # backend "s3" {
  #   bucket         = "soda-kanba-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "soda-kanba-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "soda-kanba"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  ecr_image = "${module.ecr.repository_url}:latest"
  use_custom_domain = var.domain_name != "" && module.acm.certificate_arn != ""
  app_url   = local.use_custom_domain ? "https://${var.domain_name}" : var.frontend_url
}

module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  frontend_url = local.app_url
}

module "rds" {
  source = "./modules/rds"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  database_name         = var.database_name
  database_username     = var.database_username
  database_password     = var.database_password
  ecs_security_group_id = aws_security_group.ecs_tasks.id
}

module "redis" {
  source = "./modules/redis"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = aws_security_group.ecs_tasks.id
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks"
  description = "ECS tasks security group"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-${var.environment}-jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "database_url" {
  name = "${var.project_name}-${var.environment}-database-url"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = module.rds.database_url
}

module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  public_subnet_ids      = module.vpc.public_subnet_ids
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = aws_security_group.ecs_tasks.id
  database_url           = module.rds.database_url
  database_secret_arn    = aws_secretsmanager_secret.database_url.arn
  redis_url              = module.redis.redis_url
  jwt_secret_arn         = aws_secretsmanager_secret.jwt_secret.arn
  s3_bucket              = module.s3.attachments_bucket_name
  ses_from_email         = var.ses_from_email
  frontend_url           = local.app_url
  ecr_image              = local.ecr_image
  attachments_bucket_arn = module.s3.attachments_bucket_arn
}

resource "aws_security_group_rule" "ecs_from_alb" {
  type                     = "ingress"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_tasks.id
  source_security_group_id = module.ecs.alb_security_group_id
}

module "acm" {
  source = "./modules/acm"

  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
}

module "cloudfront" {
  source = "./modules/cloudfront"

  project_name        = var.project_name
  environment         = var.environment
  frontend_bucket     = module.s3.frontend_bucket_name
  frontend_bucket_arn = module.s3.frontend_bucket_arn
  api_alb_dns_name    = module.ecs.alb_dns_name
  domain_name         = local.use_custom_domain ? var.domain_name : ""
  acm_certificate_arn = module.acm.certificate_arn

  depends_on = [module.acm]
}

resource "aws_route53_record" "app" {
  count = var.route53_zone_id != "" && var.domain_name != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_ipv6" {
  count = var.route53_zone_id != "" && var.domain_name != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

module "ses" {
  source = "./modules/ses"

  domain          = var.ses_domain
  route53_zone_id = var.route53_zone_id
}

module "github_oidc" {
  count  = var.github_repository != "" ? 1 : 0
  source = "./modules/github_oidc"

  project_name                = var.project_name
  environment                 = var.environment
  github_repository           = var.github_repository
  allowed_branches            = var.github_allowed_branches
  create_oidc_provider        = var.create_github_oidc_provider
  ecr_repository_arn          = module.ecr.repository_arn
  ecs_task_execution_role_arn = module.ecs.task_execution_role_arn
  ecs_task_role_arn           = module.ecs.task_role_arn
  frontend_bucket_arn         = module.s3.frontend_bucket_arn
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

output "api_url" {
  value = "http://${module.ecs.alb_dns_name}"
}

output "frontend_url" {
  value = module.cloudfront.cloudfront_url
}

output "attachments_bucket" {
  value = module.s3.attachments_bucket_name
}

output "frontend_s3_bucket" {
  value = module.s3.frontend_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_task_definition_family" {
  value = module.ecs.task_definition_family
}

output "deploy_role_arn" {
  value = var.github_repository != "" ? module.github_oidc[0].deploy_role_arn : null
}

output "ses_dkim_tokens" {
  value = module.ses.dkim_tokens
}

output "acm_dns_validation_records" {
  value       = module.acm.dns_validation_records
  description = "CNAME records to add in HostGator (or Route 53) before the custom domain works"
}

output "cloudfront_domain_name" {
  value       = module.cloudfront.distribution_domain_name
  description = "Point your custom domain CNAME to this CloudFront hostname"
}
