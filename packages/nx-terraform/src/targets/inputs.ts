export const TERRAFORM_FILES_INPUTS = [
  '{projectRoot}/*.tf',
  '{projectRoot}/**/*.tf',
  '{projectRoot}/templates/*',
  '{projectRoot}/tfvars/*',
];

export const TERRAFORM_ENV_VARIABLES_INPUTS = [
  {
    env: 'TF_VAR_region',
  },
  {
    env: 'TF_VAR_account_id',
  },
  {
    env: 'TF_WORKSPACE',
  },
];

export const TERRAFORM_ALL_INPUTS = [
  ...TERRAFORM_FILES_INPUTS,
  ...TERRAFORM_ENV_VARIABLES_INPUTS,
];
