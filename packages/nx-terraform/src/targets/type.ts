import { TargetConfiguration } from '@nx/devkit';

export type TerraformTarget =
  | 'terraform-plan'
  | 'terraform-apply'
  | 'terraform-destroy'
  | 'terraform-validate'
  | 'terraform-fmt'
  | 'terraform-init'
  | 'terraform-output';

export type TerraformTargetDependency = `^${TerraformTarget}` | TerraformTarget;

export type TerraformProjectTargets = Record<
  TerraformTarget,
  TargetConfiguration
>;

export type TargetsConfigurationParams = {
  backendProject: string | null;
  varFiles: {
    dev: boolean;
    prod: boolean;
  };
};
