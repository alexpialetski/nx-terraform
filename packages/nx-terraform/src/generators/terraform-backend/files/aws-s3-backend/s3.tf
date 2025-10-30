// check if bucket already exists
data "external" "check_bucket" {
  program = ["bash", "./scripts/check_bucket.sh"]


  query = {
    bucket_name = local.bucket_name
  }
}

resource "aws_s3_bucket" "tf_state" {
  count = data.external.check_bucket.result.exists == "false" ? 1 : 0

  bucket              = local.bucket_name
  object_lock_enabled = true
  force_destroy       = true

  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  count = data.external.check_bucket.result.exists == "false" ? 1 : 0

  bucket = local.bucket_name

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "tf_state" {
  count = data.external.check_bucket.result.exists == "false" ? 1 : 0

  bucket = local.bucket_name
}
