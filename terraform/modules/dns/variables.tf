variable "project" { type = string }
variable "domain_name" { type = string }
variable "api_ip" { type = string }
variable "cloudfront_domain" { type = string }
variable "cloudfront_hosted_zone_id" { type = string }

variable "certificate_validation_options" {
  type = set(object({
    domain_name           = string
    resource_record_name  = string
    resource_record_type  = string
    resource_record_value = string
  }))
}
