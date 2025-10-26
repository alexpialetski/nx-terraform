// Main Terraform configuration for tf-generic-1761488294473
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    null = { source = "hashicorp/null", version = ">= 3.2.1" }
  }
}

// Example resource (safe to keep for plan / apply tests)

resource "null_resource" "example" {
  triggers = { generated = timestamp() }
}
