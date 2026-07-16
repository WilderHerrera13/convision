output "db_host_arn" { value = aws_ssm_parameter.db_host.arn }
output "db_password_arn" { value = aws_ssm_parameter.db_password.arn }
output "jwt_secret_arn" { value = aws_ssm_parameter.jwt_secret.arn }
