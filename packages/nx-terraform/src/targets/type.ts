import { TargetConfiguration } from '@nx/devkit';

/** Metadata for terraform-init target (TargetConfiguration.metadata). */
export interface TerraformInitTargetMetadata {
  backendProject?: string;
}

/** Metadata for terraform-output target (TargetConfiguration.metadata). */
export interface TerraformOutputTargetMetadata {
  outputFormat?: 'tfvars' | 'env';
}

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

/** Options normalized for terraform-init (only backendProject). */
export type TerraformInitTargetOptions = {
  backendProject: string | null;
};

/** Options normalized for terraform-output (outputFormat). */
export type TerraformOutputTargetOptions = {
  outputFormat: 'tfvars' | 'env';
};

/** Per-target normalized options used to build Terraform targets. varFile is via target args/configurations. */
export type TargetsConfigurationParams = {
  init: TerraformInitTargetOptions;
  output: TerraformOutputTargetOptions;
};
