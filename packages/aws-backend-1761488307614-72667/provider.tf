terraform {
  required_providers {
    aws = { source = "hashicorp/aws" version = "~> 6.0" }
    local = { source = "hashicorp/local" version = "~> 2.5" }
    external = { source = "hashicorp/external" version = "~> 2.3" }
  }
}

provider "aws" { region = var.region }
provider "local" {}
provider "external" {}
