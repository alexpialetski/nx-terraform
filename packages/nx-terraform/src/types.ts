/**
 * Expected format of the plugin options defined in nx.json.
 * Use target args or Nx configurations (e.g. terraform-plan:production) for var files.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- reserved for future plugin-level options
export interface NxTerraformPluginOptions {}

export type TerraformBackendType = 'aws-s3' | 'local';
