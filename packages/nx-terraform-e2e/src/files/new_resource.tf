# Test resource: local file
resource "local_file" "test" {
  content  = module.shared.message
  filename = "test-output.txt"
}
