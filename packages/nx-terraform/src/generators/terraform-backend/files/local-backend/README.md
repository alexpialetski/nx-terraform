# Terraform Backend: Local

This package (`<%= name %>`) sets up a local Terraform backend storing state on the filesystem. Suitable for quick prototyping or development where remote state durability and collaboration are not required.

State will be stored in the working directory under terraform.tfstate.

## ⚠️ When To Use

Use the local backend only for:

- Personal development
- Small throwaway experiments
- CI jobs that don't need shared state

Avoid for:

- Team collaboration
- Production infrastructure
- Environments needing state locking/versioning
