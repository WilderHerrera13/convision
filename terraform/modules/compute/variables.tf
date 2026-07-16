variable "project" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "subnet_id" { type = string }
variable "security_group_id" { type = string }
variable "instance_type" { type = string }
variable "ssh_public_key" { type = string }
variable "uploads_bucket" { type = string }
variable "ssm_prefix" { type = string }
variable "docker_image" { type = string }
variable "db_host" { type = string }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "api_domain" { type = string }

variable "api_log_group_name" { type = string }

variable "nginx_log_group_name" { type = string }

variable "bootstrap_default_users" {
  type        = string
  description = "Default for BOOTSTRAP_DEFAULT_USERS (true|false). When true, API creates admin@convision.com and demo users if missing."
  default     = "false"
}
