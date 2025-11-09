# nx-terraform-metadata-start
# providers: aws,external,local
# nx-terraform-metadata-end

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.5.3"
    }
    external = {
      source  = "hashicorp/external"
      version = "2.3.5"
    }
  }

  # needed for NX cache reset when new module is added
  # required_modules {
  #   github-oidc = {
  #     source  = "terraform-module/github-oidc-provider/aws"
  #     version = "~> 1"
  #   }
  # }
}

provider "aws" {
  region = var.region
}

provider "local" {}

provider "external" {}
