import { TargetConfiguration } from '@nx/devkit';
import {
  getTerraformInitTarget,
  getTerraformPlanTarget,
  getTerraformPlanTargetForAwsS3Backend,
  getTerraformDestroyTarget,
  TERRAFORM_APPLY_TARGET,
  TERRAFORM_FMT_TARGET,
  TERRAFORM_VALIDATE_TARGET,
  TERRAFORM_OUTPUT_TARGET,
} from './default';
import { TargetsConfigurationParams, TerraformProjectTargets } from './type';
import type { TerraformBackendType } from '../types';

export { type TargetsConfigurationParams } from './type';

export const getBackendProjectTargets = (
  params: TargetsConfigurationParams,
  backendType?: TerraformBackendType
): TerraformProjectTargets => {
  const planTarget =
    backendType === 'aws-s3'
      ? getTerraformPlanTargetForAwsS3Backend()
      : getTerraformPlanTarget();

  return {
    'terraform-init': {
      ...getTerraformInitTarget(params.init),
      cache: true,
    },
    'terraform-plan': { ...planTarget, cache: true },
    'terraform-apply': { ...TERRAFORM_APPLY_TARGET, cache: true },
    'terraform-destroy': getTerraformDestroyTarget(),
    'terraform-fmt': TERRAFORM_FMT_TARGET,
    'terraform-validate': TERRAFORM_VALIDATE_TARGET,
    'terraform-output': TERRAFORM_OUTPUT_TARGET,
  };
};

export const getStatefulProjectTargets = (
  params: TargetsConfigurationParams
): TerraformProjectTargets => ({
  'terraform-init': getTerraformInitTarget(params.init),
  'terraform-plan': getTerraformPlanTarget(),
  'terraform-apply': TERRAFORM_APPLY_TARGET,
  'terraform-destroy': getTerraformDestroyTarget(),
  'terraform-fmt': TERRAFORM_FMT_TARGET,
  'terraform-validate': TERRAFORM_VALIDATE_TARGET,
  'terraform-output': TERRAFORM_OUTPUT_TARGET,
});

export const getModuleProjectTargets = (
  params: TargetsConfigurationParams
): TerraformProjectTargets => {
  const getStubTarget = (originalTarget: TargetConfiguration) => ({
    ...originalTarget,
    cache: true,
    options: {
      ...originalTarget.options,
      command: 'echo "Operation is not applicable in module projects."',
    },
  });

  return {
    'terraform-init': getStubTarget(getTerraformInitTarget(params.init)),
    'terraform-plan': getStubTarget(getTerraformPlanTarget()),
    'terraform-apply': getStubTarget(TERRAFORM_APPLY_TARGET),
    'terraform-destroy': getStubTarget(getTerraformDestroyTarget()),
    'terraform-fmt': TERRAFORM_FMT_TARGET,
    'terraform-validate': TERRAFORM_VALIDATE_TARGET,
    'terraform-output': getStubTarget(TERRAFORM_OUTPUT_TARGET),
  };
};
