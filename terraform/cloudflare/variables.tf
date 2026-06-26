variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_id_p31ca" {
  description = "Zone ID for p31ca.org"
  type        = string
}

variable "zone_id_phosphorus31" {
  description = "Zone ID for phosphorus31.org"
  type        = string
}
