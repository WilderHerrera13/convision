variable "project" { type = string }
variable "environment" { type = string }
variable "db_host" { type = string }
variable "db_name" { type = string }
variable "db_username" { type = string }

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "prefix" {
  type        = string
  description = "SSM path prefix, e.g. /convision/prod"
}
