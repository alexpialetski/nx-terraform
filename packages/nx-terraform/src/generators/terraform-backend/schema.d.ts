import type { TerraformBackendType } from '../../types';

export interface TerraformBackendGeneratorSchema {
  name: string;
  backendType: TerraformBackendType;
  bucketNamePrefix?: string;
}

export interface TerraformBackendGeneratorNormalizedSchema
  extends TerraformBackendGeneratorSchema {
  bucketNamePrefix: string;
  ignoreFile: string;
}
