variable "project_name" { type = string }
variable "environment" { type = string }
variable "frontend_bucket" { type = string }
variable "frontend_bucket_arn" { type = string }
variable "api_alb_dns_name" { type = string }

variable "domain_name" {
  type        = string
  default     = ""
  description = "Optional custom domain for CloudFront (e.g. app.example.com)"
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN in us-east-1 for custom domain"
}
