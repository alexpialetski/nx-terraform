resource "local_file" "backend_config" {
  content  = <<EOF
bucket = "${local.bucket_name}"
key    = "tf_state"
region = "${data.aws_region.current.name}"
EOF
  filename = "backend.config"
}
