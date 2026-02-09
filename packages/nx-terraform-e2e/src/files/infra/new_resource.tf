# Test resource: local file
resource "local_file" "test" {
  content  = module.shared.message
  filename = var.filename
}

variable "filename" {
  description = "Filename to write to"
  type        = string
}
