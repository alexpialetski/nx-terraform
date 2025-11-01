export interface TerraformModuleGeneratorSchema {
  name: string;
  backendProject?: string;
  backendType?: 'aws-s3' | 'local'; // Required when backendProject is provided
}

export interface TerraformModuleGeneratorNormalizedSchema
  extends TerraformModuleGeneratorSchema {
  backendProject: string | null;
  backendType: 'aws-s3' | 'local' | null;
  ignoreFile: string;
  tmpl: string; // Required to strip __tmpl__ suffix from template filenames
}

