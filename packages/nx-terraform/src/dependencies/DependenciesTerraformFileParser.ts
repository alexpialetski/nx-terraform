import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '@nx/devkit';
import { TerraformFileParser } from '../utils/TerraformFileParser';

/**
 * Parser implementation specifically for createDependencies
 * Handles file filtering and path construction internally
 */
export class DependenciesTerraformFileParser extends TerraformFileParser {
  constructor(
    private readonly filesToProcess: Array<{ file: string }>,
    private readonly workspaceRoot: string
  ) {
    super();
  }

  /**
   * Finds all .tf files from filesToProcess and constructs full paths
   */
  protected findTerraformFiles(): string[] {
    return this.filesToProcess
      .filter((file) => file.file.endsWith('.tf'))
      .map((file) => join(this.workspaceRoot, file.file));
  }

  /**
   * Asynchronously reads a Terraform file from the file system
   */
  protected async readTerraformFile(
    filePath: string
  ): Promise<{ content: string; success: boolean }> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return { content, success: true };
    } catch (e) {
      logger.warn(
        `Failed to read .tf file ${filePath}. Error: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      return { content: '', success: false };
    }
  }
}

