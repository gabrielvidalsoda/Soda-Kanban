variable "project_name" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "database_name" { type = string }
variable "database_username" { type = string }
variable "database_password" {
  type      = string
  sensitive = true
}
variable "ecs_security_group_id" { type = string }
