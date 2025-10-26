# tf-generic-1761488626138 Terraform Project

Generated via `terraform:add-terraform-project`.

## Structure

```
<projectRoot>/
  main.tf
  variables.tf
  outputs.tf
  provider.tf
  (backend.tf)        # optional remote backend template
  modules/            # place reusable modules here
  tfvars/             # environment variable overrides (*.tfvars)
```

## Usage

Initialize & create a plan for default environment:

```
npx nx run tf-generic-1761488626138:terraform-plan
```

Specify environment (if multiple were generated):

```
npx nx run tf-generic-1761488626138:terraform-plan --configuration=<env>
```

Apply (placeholder until plugin apply executor implemented):

```
npx nx run tf-generic-1761488626138:terraform-apply
```

Format & validate:

```
npx nx run tf-generic-1761488626138:terraform-fmt
npx nx run tf-generic-1761488626138:terraform-validate
```
