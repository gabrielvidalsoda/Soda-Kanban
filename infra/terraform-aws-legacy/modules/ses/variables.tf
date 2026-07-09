variable "domain" {
  type = string
}

variable "route53_zone_id" {
  type        = string
  default     = ""
  description = "Optional Route 53 hosted zone ID for automatic DKIM/SPF records"
}
