import { basename } from 'path';
import * as hcl2json from '@cdktf/hcl2json';
import { logger } from '@nx/devkit';
import { TerraformFile } from './TerraformFile';
import { ProviderTerraformFile } from './ProviderTerraformFile';

/**
 * Abstract parser class for reading and parsing Terraform files
 */
export abstract class TerraformFileParser
  implements AsyncIterable<TerraformFile>
{
  /**
   * Finds all .tf files to process
   * @returns Array of file paths
   */
  protected abstract findTerraformFiles(): string[];

  /**
   * Asynchronously reads a Terraform file
   * @param filePath The path to the file to read
   * @returns Object with content and success status
   */
  protected abstract readTerraformFile(
    filePath: string
  ): Promise<{ content: string; success: boolean }>;

  /**
   * Asynchronously parses HCL content into a JSON structure
   */
  protected async parseTerraformFile(
    fileName: string,
    content: string
  ): Promise<{ parsed: Record<string, any> | null; success: boolean }> {
    try {
      const parsed = await hcl2json.parse(fileName, content);
      return { parsed, success: true };
    } catch (e) {
      logger.warn(
        `Failed to parse .tf file ${fileName}. Error: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      return { parsed: null, success: false };
    }
  }

  /**
   * Returns an async iterator over parsed TerraformFile instances
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<
    TerraformFile,
    void,
    unknown
  > {
    const tfFiles = this.findTerraformFiles();

    for (const filePath of tfFiles) {
      const { content, success: readSuccess } = await this.readTerraformFile(
        filePath
      );

      if (!readSuccess) {
        continue;
      }

      const fileName = basename(filePath);
      const { parsed, success: parseSuccess } = await this.parseTerraformFile(
        fileName,
        content
      );

      if (!parseSuccess || !parsed) {
        continue;
      }

      // Return ProviderTerraformFile for provider.tf files to enforce convention
      if (fileName === 'provider.tf') {
        yield new ProviderTerraformFile(filePath, fileName, parsed, content);
      } else {
        yield new TerraformFile(filePath, fileName, parsed, content);
      }
    }
  }
}
