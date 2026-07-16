variable "project" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "vpc_cidr" { type = string }
variable "subnet_a_cidr" { type = string }
variable "subnet_b_cidr" { type = string }
variable "ssh_allowed_cidrs" { type = list(string) }
