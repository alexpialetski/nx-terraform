import type { TerraformBackendType } from '../../types';

export interface PresetGeneratorSchema {
  projectName: string;
  backendType?: TerraformBackendType;
}
