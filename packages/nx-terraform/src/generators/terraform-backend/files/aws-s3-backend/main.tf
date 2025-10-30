data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

resource "local_file" "backend_config" {
  content  = <<EOF
bucket = "${local.bucket_name}"
key    = "tf_state"
region = "${data.aws_region.current.region}"
EOF
  filename = "backend.config"
}
