variable "region" { description = "AWS region" type = string }
variable "account_id" { description = "AWS account ID" type = string }
variable "bucket_prefix" { description = "Prefix for S3 state bucket" type = string default = "${bucketPrefix}" }
