export interface TerraformBackendGeneratorSchema {
  name: string;
  backendType: 'aws-s3' | 'local';
  bucketNamePrefix?: string;
}

export interface TerraformBackendGeneratorNormalizedSchema
  extends TerraformBackendGeneratorSchema {
  bucketNamePrefix: string;
  ignoreFile: string;
}
