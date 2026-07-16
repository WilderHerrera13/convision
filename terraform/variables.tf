variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "convision"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "root_domain" {
  type        = string
  default     = "convision.com"
  description = "Root domain managed in Hostinger. App will be app.<root_domain>, API will be api.<root_domain>"
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key content to install on the EC2 instance"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH into the API server (your IP/32)"
  default     = ["0.0.0.0/0"]
}

variable "db_username" {
  type    = string
  default = "convision_app"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type    = string
  default = "convision"
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "docker_image" {
  type        = string
  description = "Full docker image URI, e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/convision/api:latest"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_a_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "subnet_b_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

variable "ec2_instance_type" {
  type    = string
  default = "t4g.micro"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  type    = number
  default = 20
}

variable "rds_backup_retention_days" {
  type    = number
  default = 7
}

variable "bootstrap_default_users" {
  type        = string
  description = "Passed to API as default BOOTSTRAP_DEFAULT_USERS (true|false). Enables EnsureLocalDevUsers on startup outside APP_ENV=local."
  default     = "false"
}
