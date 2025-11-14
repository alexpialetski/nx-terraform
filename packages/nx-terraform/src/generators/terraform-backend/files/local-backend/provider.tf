# nx-terraform-metadata-start
# providers: local
# nx-terraform-metadata-end

terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

provider "local" {}
