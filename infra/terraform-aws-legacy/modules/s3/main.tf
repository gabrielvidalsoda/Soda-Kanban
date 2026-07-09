resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-${var.environment}-frontend"
}

resource "aws_s3_bucket" "attachments" {
  bucket = "${var.project_name}-${var.environment}-attachments"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  cors_rule {
    allowed_headers = ["Content-Type", "Content-Length"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = [var.frontend_url]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "attachments_bucket_name" {
  value = aws_s3_bucket.attachments.bucket
}

output "attachments_bucket_arn" {
  value = aws_s3_bucket.attachments.arn
}
