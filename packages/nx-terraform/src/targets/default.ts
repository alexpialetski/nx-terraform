import { TargetConfiguration } from '@nx/devkit';

import {
  TERRAFORM_ALL_INPUTS,
  TERRAFORM_ENV_VARIABLES_INPUTS,
  TERRAFORM_FILES_INPUTS,
} from './inputs';
import { TargetsConfigurationParams, TerraformTargetDependency } from './type';

const getConfigurations = (
  varFiles: TargetsConfigurationParams['varFiles'],
  additionalArgs: string[]
) => ({
  defaultConfiguration: 'dev',
  configurations: {
    dev: {
      args: [
        ...additionalArgs,
        varFiles.dev ? '-var-file=./tfvars/dev.tfvars' : '',
      ],
    },
    prod: {
      args: [
        ...additionalArgs,
        varFiles.prod ? '-var-file=./tfvars/prod.tfvars' : '',
      ],
    },
  },
});

export const getTerraformInitTarget = (
  params: TargetsConfigurationParams
): TargetConfiguration => {
  const args = [];

  if (params.backendProject) {
    args.push(
      `-backend-config=../${params.backendProject}/backend.config`,
      '-reconfigure'
    );
  }

  return {
    // cache only for backend projects
    cache: false,
    executor: 'nx:run-commands',
    dependsOn: ['^terraform-apply' satisfies TerraformTargetDependency],
    options: {
      cwd: '{projectRoot}',
      command: 'terraform init',
    },
    inputs: [
      '{projectRoot}/provider.tf',
      '{projectRoot}/backend.tf',
      ...TERRAFORM_ENV_VARIABLES_INPUTS,
    ],
    outputs: ['{projectRoot}/.terraform', '{projectRoot}/.terraform.lock.hcl'],
    ...getConfigurations({ dev: false, prod: false }, args),
  };
};

export const getTerraformPlanTarget = (
  params: TargetsConfigurationParams
): TargetConfiguration => ({
  cache: false,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform plan',
  },
  inputs: [...TERRAFORM_ALL_INPUTS],
  outputs: ['{projectRoot}/tfplan'],
  ...getConfigurations(params.varFiles, ['-out=tfplan']),
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

export const getTerraformDestroyTarget = (
  params: TargetsConfigurationParams
): TargetConfiguration => ({
  cache: false,
  executor: 'nx:run-commands',
  dependsOn: ['terraform-init' satisfies TerraformTargetDependency],
  options: {
    cwd: '{projectRoot}',
    command: 'terraform destroy',
  },
  ...getConfigurations(params.varFiles, ['-auto-approve']),
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
