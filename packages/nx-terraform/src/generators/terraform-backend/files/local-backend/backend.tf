terraform {
  backend "local" {
    path = local.state_file_path
  }
}
