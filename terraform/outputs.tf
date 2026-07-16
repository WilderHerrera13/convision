output "api_server_ip" {
  description = "IP publica del servidor API — crear registro A en Hostinger"
  value       = module.compute.eip_public_ip
}

output "cloudfront_domain" {
  description = "Dominio CloudFront — crear registro CNAME 'app' en Hostinger apuntando aqui"
  value       = module.cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID de CloudFront — necesario para invalidar cache en CI/CD"
  value       = module.cdn.distribution_id
}

output "frontend_bucket_name" {
  description = "Bucket S3 donde subir el build del frontend"
  value       = module.storage.frontend_bucket_id
}

output "uploads_bucket_name" {
  description = "Bucket S3 para archivos subidos por la app"
  value       = module.storage.uploads_bucket_id
}

output "rds_endpoint" {
  description = "Endpoint RDS PostgreSQL"
  value       = module.database.endpoint
  sensitive   = true
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR — usar como base de docker_image en CI/CD"
  value       = module.ecr.repository_url
}

output "observability_api_log_group_name" {
  description = "CloudWatch log group for API container stdout/stderr"
  value       = module.observability.api_log_group_name
}

output "observability_nginx_log_group_name" {
  description = "CloudWatch log group for nginx access/error files"
  value       = module.observability.nginx_log_group_name
}

output "observability_rds_postgresql_log_group_name" {
  description = "CloudWatch log group for RDS PostgreSQL logs export"
  value       = module.database.rds_postgresql_log_group_name
}

output "acm_cert_validation_records" {
  description = "Registros CNAME que debes agregar en Hostinger para validar el certificado SSL de app.convision.com"
  value = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
      type  = dvo.resource_record_type
      name  = dvo.resource_record_name
      value = dvo.resource_record_value
    }
  }
}

output "hostinger_dns_instructions" {
  description = "Registros DNS a configurar en Hostinger"
  value       = <<-EOT
    === REGISTROS DNS A AGREGAR EN HOSTINGER ===

    1. CNAME  app    ->  ${module.cdn.domain_name}
       (esto apunta app.convision.com a CloudFront)

    2. A      api    ->  ${module.compute.eip_public_ip}
       (esto apunta api.convision.com al servidor Go)

    3. Los registros CNAME de validacion ACM se muestran en el output
       'acm_cert_validation_records' — agregarlos ANTES de ejecutar
       terraform apply por segunda vez.
  EOT
}
