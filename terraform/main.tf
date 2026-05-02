module "ecr" {
  source = "./modules/ecr"

  project     = var.project
  environment = var.environment
}

module "observability" {
  source = "./modules/observability"

  project     = var.project
  environment = var.environment
}

module "networking" {
  source = "./modules/networking"

  project           = var.project
  environment       = var.environment
  region            = var.aws_region
  vpc_cidr          = var.vpc_cidr
  subnet_a_cidr     = var.subnet_a_cidr
  subnet_b_cidr     = var.subnet_b_cidr
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

module "storage" {
  source = "./modules/storage"

  project     = var.project
  environment = var.environment
}

module "database" {
  source = "./modules/database"

  project               = var.project
  environment           = var.environment
  subnet_ids            = [module.networking.subnet_a_id, module.networking.subnet_b_id]
  security_group_id     = module.networking.sg_rds_id
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  backup_retention_days = var.rds_backup_retention_days
}

module "secrets" {
  source = "./modules/secrets"

  project     = var.project
  environment = var.environment
  prefix      = "/${var.project}/${var.environment}"
  db_host     = module.database.endpoint
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  jwt_secret  = var.jwt_secret

  depends_on = [module.database]
}

resource "aws_acm_certificate" "app" {
  domain_name               = "app.${var.root_domain}"
  subject_alternative_names = ["*.app.${var.root_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "app" {
  certificate_arn = aws_acm_certificate.app.arn

  timeouts {
    create = "30m"
  }
}

module "cdn" {
  source = "./modules/cdn"

  project          = var.project
  environment      = var.environment
  app_fqdn         = "app.${var.root_domain}"
  s3_bucket_id     = module.storage.frontend_bucket_id
  s3_bucket_arn    = module.storage.frontend_bucket_arn
  s3_bucket_domain = module.storage.frontend_bucket_domain
  certificate_arn  = aws_acm_certificate_validation.app.certificate_arn
}

module "scheduler" {
  source = "./modules/scheduler"

  project                 = var.project
  environment             = var.environment
  ec2_instance_id         = module.compute.instance_id
  rds_instance_identifier = module.database.db_instance_id

  depends_on = [module.compute, module.database]
}

module "compute" {
  source = "./modules/compute"

  project                 = var.project
  environment             = var.environment
  region                  = var.aws_region
  subnet_id               = module.networking.subnet_a_id
  security_group_id       = module.networking.sg_ec2_id
  instance_type           = var.ec2_instance_type
  ssh_public_key          = var.ssh_public_key
  uploads_bucket          = module.storage.uploads_bucket_id
  ssm_prefix              = "/${var.project}/${var.environment}"
  docker_image            = var.docker_image
  db_host                 = module.database.endpoint
  db_name                 = var.db_name
  db_username             = var.db_username
  api_domain              = "api.${var.root_domain}"
  bootstrap_default_users = var.bootstrap_default_users
  api_log_group_name      = module.observability.api_log_group_name
  nginx_log_group_name    = module.observability.nginx_log_group_name

  depends_on = [module.database, module.secrets, module.observability]
}
