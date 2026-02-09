import { TargetConfiguration } from '@nx/devkit';

import {
  TERRAFORM_ALL_INPUTS,
  TERRAFORM_ENV_VARIABLES_INPUTS,
  TERRAFORM_FILES_INPUTS,
} from './inputs';
import { TerraformInitTargetOptions, TerraformTargetDependency } from './type';

export const getTerraformInitTarget = (
  options: TerraformInitTargetOptions
): TargetConfiguration => {
  const args = ['-reconfigure'];

  if (options.backendProject) {
    args.push(`-backend-config="../${options.backendProject}/backend.config"`);
  }

  return {
    // cache only for backend projects
    cache: false,
    executor: 'nx:run-commands',
    dependsOn: ['^terraform-apply' satisfies TerraformTargetDependency],
    options: {
      cwd: '{projectRoot}',
      command: 'terraform init',
      args,
    },
    inputs: [
      '{projectRoot}/provider.tf',
      '{projectRoot}/backend.tf',
      ...TERRAFORM_ENV_VARIABLES_INPUTS,
    ],
    outputs: ['{projectRoot}/.terraform', '{projectRoot}/.terraform.lock.hcl'],
    syncGenerators: ['nx-terraform:sync-terraform-metadata'],
  };
};

export const getTerraformPlanTarget = (): TargetConfiguration => ({
  cache: false,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform plan -out=tfplan',
  },
  inputs: [...TERRAFORM_ALL_INPUTS],
  outputs: ['{projectRoot}/tfplan'],
});

export const TERRAFORM_APPLY_TARGET: TargetConfiguration = {
  cache: false,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-plan' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform apply -auto-approve tfplan',
  },
  inputs: [...TERRAFORM_ALL_INPUTS, '{projectRoot}/tfplan'],
};

export const getTerraformDestroyTarget = (): TargetConfiguration => ({
  cache: false,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform destroy',
    args: ['-auto-approve'],
  },
});

export const TERRAFORM_FMT_TARGET: TargetConfiguration = {
  cache: true,
  executor: 'nx:run-commands',
  options: {
    cwd: '{projectRoot}',
    command: 'terraform fmt -write=true',
  },
  inputs: [...TERRAFORM_FILES_INPUTS],
};

export const TERRAFORM_VALIDATE_TARGET: TargetConfiguration = {
  cache: true,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform validate',
  },
  inputs: [...TERRAFORM_ALL_INPUTS],
};

export const TERRAFORM_OUTPUT_TARGET: TargetConfiguration = {
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  outputs: ['{projectRoot}/terraform-outputs.env'],
  options: {
    command:
      'terraform output -json | jq -r "to_entries[] | \\"\\(.key)=\\(.value.value)\\"" > terraform-outputs.env',
    cwd: '{projectRoot}',
  },
};
