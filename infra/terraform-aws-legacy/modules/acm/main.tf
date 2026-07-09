resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = var.route53_zone_id != "" && var.domain_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" ? 1 : 0

  certificate_arn = aws_acm_certificate.main[0].arn
  validation_record_fqdns = var.route53_zone_id != "" ? [
    for record in aws_route53_record.cert_validation : record.fqdn
  ] : null

  timeouts {
    create = "45m"
  }
}

output "certificate_arn" {
  value = var.domain_name != "" ? aws_acm_certificate_validation.main[0].certificate_arn : ""
}

output "dns_validation_records" {
  description = "Add these CNAME records to your DNS provider (e.g. HostGator) to validate the certificate"
  value = var.domain_name != "" ? [
    for dvo in aws_acm_certificate.main[0].domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ] : []
}
