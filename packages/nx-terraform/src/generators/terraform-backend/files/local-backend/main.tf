
# TODO: update backend configuration with needed for local backend
resource "local_file" "backend_config" {
  content  = <<EOF
path = "${local.state_file_path}"
EOF
  filename = "backend.config"
}
