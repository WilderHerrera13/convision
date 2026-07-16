resource "aws_ssm_parameter" "db_host" {
  name  = "${var.prefix}/db_host"
  type  = "String"
  value = var.db_host
}

resource "aws_ssm_parameter" "db_name" {
  name  = "${var.prefix}/db_name"
  type  = "String"
  value = var.db_name
}

resource "aws_ssm_parameter" "db_username" {
  name  = "${var.prefix}/db_username"
  type  = "String"
  value = var.db_username
}

resource "aws_ssm_parameter" "db_password" {
  name  = "${var.prefix}/db_password"
  type  = "SecureString"
  value = var.db_password
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${var.prefix}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}
