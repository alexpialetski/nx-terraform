import { TargetConfiguration } from '@nx/devkit';
import {
  getTerraformInitTarget,
  getTerraformPlanTarget,
  getTerraformDestroyTarget,
  TERRAFORM_APPLY_TARGET,
  TERRAFORM_FMT_TARGET,
  TERRAFORM_VALIDATE_TARGET,
  TERRAFORM_OUTPUT_TARGET,
} from './default';
import { TargetsConfigurationParams, TerraformProjectTargets } from './type';

export { type TargetsConfigurationParams } from './type';

export const getBackendProjectTargets = (
  params: TargetsConfigurationParams
): TerraformProjectTargets => ({
  'terraform-init': {
    ...getTerraformInitTarget(params),
    cache: true,
  },
  'terraform-plan': { ...getTerraformPlanTarget(params), cache: true },
  'terraform-apply': { ...TERRAFORM_APPLY_TARGET, cache: true },
  'terraform-destroy': getTerraformDestroyTarget(params),
  'terraform-fmt': TERRAFORM_FMT_TARGET,
  'terraform-validate': TERRAFORM_VALIDATE_TARGET,
  'terraform-output': TERRAFORM_OUTPUT_TARGET,
});

export const getStatefulProjectTargets = (
  params: TargetsConfigurationParams
): TerraformProjectTargets => ({
  'terraform-init': getTerraformInitTarget(params),
  'terraform-plan': getTerraformPlanTarget(params),
  'terraform-apply': TERRAFORM_APPLY_TARGET,
  'terraform-destroy': getTerraformDestroyTarget(params),
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
    'terraform-init': getStubTarget(getTerraformInitTarget(params)),
    'terraform-plan': getStubTarget(getTerraformPlanTarget(params)),
    'terraform-apply': TERRAFORM_APPLY_TARGET,
    'terraform-destroy': getStubTarget(getTerraformDestroyTarget(params)),
    'terraform-fmt': TERRAFORM_FMT_TARGET,
    'terraform-validate': TERRAFORM_VALIDATE_TARGET,
    'terraform-output': getStubTarget(TERRAFORM_OUTPUT_TARGET),
  };
};
