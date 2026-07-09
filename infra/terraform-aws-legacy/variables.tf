variable "project_name" {
  type    = string
  default = "soda-kanba"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "database_name" {
  type    = string
  default = "soda_kanba"
}

variable "database_username" {
  type    = string
  default = "soda_kanba"
}

variable "database_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "ses_from_email" {
  type    = string
  default = "noreply@example.com"
}

variable "frontend_url" {
  type        = string
  default     = ""
  description = "Public app URL. Leave empty to use CloudFront domain after first apply."
}

variable "ses_domain" {
  type    = string
  default = "example.com"
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Optional custom domain (e.g. sodakanban.kfsoda.tech). Works with Route 53 or external DNS (HostGator)."
}

variable "route53_zone_id" {
  type        = string
  default     = ""
  description = "Route 53 hosted zone ID for custom domain, SES DKIM, and ACM validation"
}

variable "github_repository" {
  type        = string
  default     = ""
  description = "GitHub repo in org/repo format for OIDC deploy role (e.g. myorg/soda-kanba)"
}

variable "github_allowed_branches" {
  type        = list(string)
  default     = ["main"]
  description = "Branches allowed to assume the GitHub deploy role"
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if GitHub OIDC provider already exists in the AWS account"
}
