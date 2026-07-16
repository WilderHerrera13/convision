output "endpoint" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "port" {
  value = aws_db_instance.main.port
}

output "db_instance_id" {
  value = aws_db_instance.main.id
}

output "rds_postgresql_log_group_name" {
  value = aws_cloudwatch_log_group.rds_postgresql.name
}
