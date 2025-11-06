import { TerraformBackendType } from '../../types';

export interface TerraformModuleGeneratorSchema {
  name: string;
  backendProject?: string;
}

export interface TerraformModuleGeneratorNormalizedSchema
  extends TerraformModuleGeneratorSchema {
  backendProject: string | null;
  backendType: TerraformBackendType | null;
  ignoreFile: string;
  tmpl: string; // Required to strip __tmpl__ suffix from template filenames
}
