# Test resource: local file
resource "local_file" "test" {
  content  = "Hello from terraform-infra!"
  filename = "test-output.txt"
}
