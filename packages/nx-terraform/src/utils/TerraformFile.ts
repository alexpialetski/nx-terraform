export type ModuleResource = {
  name: string;
  source: string;
  version?: string;
};

export type BackendResource = {
  name: string;
};

/**
 * Represents a parsed Terraform file with its content and metadata
 */
export class TerraformFile {
  constructor(
    public readonly filePath: string,
    public readonly fileName: string,
    private readonly parsedContent: Record<string, any>,
    public readonly initialFileContent: string
  ) {}

  /**
   * Extracts module blocks from the parsed file
   * @returns Array of module configurations
   */
  extractModules(): ModuleResource[] {
    const modules = this.parsedContent.module ?? {};
    const moduleSources: ModuleResource[] = [];

    for (const moduleName in modules) {
      const moduleConfigs = modules[moduleName];
      // moduleConfigs is an array of module configurations
      if (!Array.isArray(moduleConfigs)) {
        continue;
      }

      for (const moduleConfig of moduleConfigs) {
        moduleSources.push({
          name: moduleName,
          source: moduleConfig.source,
          version: moduleConfig.version,
        });
      }
    }

    return moduleSources;
  }

  /**
   * Extracts backend block names from the parsed file
   * Backend blocks are structured as:
   * terraform {
   *   backend "s3" { ... }
   * }
   * Which parses to: parsed.terraform[0].backend
   * @returns Array of backend resources
   */
  extractBackends(): BackendResource[] {
    const backends: BackendResource[] = [];
    const terraformBlocks = this.parsedContent.terraform;

    if (!terraformBlocks || !Array.isArray(terraformBlocks)) {
      return backends;
    }

    for (const terraformBlock of terraformBlocks) {
      const backend = terraformBlock?.backend;
      if (!backend) {
        continue;
      }

      // Backend is an object where keys are backend names
      for (const backendName in backend) {
        backends.push({ name: backendName });
      }
    }

    return backends;
  }

  /**
   * Gets the raw parsed content
   * @returns The parsed HCL content as a Record
   */
  getParsedContent(): Record<string, any> {
    return this.parsedContent;
  }
}
