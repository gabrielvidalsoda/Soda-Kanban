variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in org/repo format"
}

variable "allowed_branches" {
  type        = list(string)
  default     = ["main"]
  description = "Branches allowed to assume the deploy role"
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if the GitHub OIDC provider already exists in the account"
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecs_task_execution_role_arn" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}

variable "frontend_bucket_arn" {
  type = string
}

variable "cloudfront_distribution_arn" {
  type = string
}
