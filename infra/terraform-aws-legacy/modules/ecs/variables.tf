variable "project_name" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "ecs_security_group_id" { type = string }

variable "database_url" {
  type      = string
  sensitive = true
}

variable "database_secret_arn" {
  type    = string
  default = ""
}

variable "redis_url" { type = string }
variable "jwt_secret_arn" { type = string }
variable "s3_bucket" { type = string }
variable "ses_from_email" { type = string }
variable "frontend_url" { type = string }
variable "ecr_image" { type = string }
variable "attachments_bucket_arn" { type = string }
