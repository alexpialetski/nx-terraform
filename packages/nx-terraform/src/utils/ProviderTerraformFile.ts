import { TerraformFile, ModuleResource } from './TerraformFile';
import { getUniqueByField } from './arrayUtils';

export type ProviderResource = {
  name: string;
};

/**
 * Regex pattern to match the metadata comment block
 * Uses [\s\S] instead of . to match newlines (works without 's' flag)
 */
const METADATA_COMMENT_REGEX =
  /# nx-terraform-metadata-start\n# ([\s\S]*?)\n# nx-terraform-metadata-end/;

/**
 * Represents a provider.tf Terraform file with specialized provider-related operations
 * Enforces the convention that provider blocks must be in provider.tf
 * Uses comment-based metadata for cache invalidation
 */
export class ProviderTerraformFile extends TerraformFile {
  public readonly providers: ProviderResource[];
  public modules: ModuleResource[];

  constructor(
    filePath: string,
    fileName: string,
    parsedContent: Record<string, any>,
    initialFileContent: string,
    modules: ModuleResource[] = []
  ) {
    super(filePath, fileName, parsedContent, initialFileContent);
    // Extract providers immediately in constructor
    this.providers = this.extractProviders();
    this.modules = modules;
  }

  /**
   * Extracts provider blocks from the parsed file
   * @returns Array of provider configurations
   */
  extractProviders(): ProviderResource[] {
    const providers: ProviderResource[] = [];
    const providerBlocks = this.getParsedContent().provider ?? {};

    for (const providerName in providerBlocks) {
      const providerConfigs = providerBlocks[providerName];
      // providerConfigs can be an array or a single object
      const configs = Array.isArray(providerConfigs)
        ? providerConfigs
        : [providerConfigs];

      for (const _config of configs) {
        providers.push({
          name: providerName,
        });
      }
    }

    return providers;
  }

  /**
   * Sets the modules array
   * @param modules Array of module resources
   */
  setModules(modules: ModuleResource[]): void {
    // Make modules unique by source
    this.modules = getUniqueByField(modules, 'source');
  }

  /**
   * Formats providers and modules as a sorted string for comparison
   * Format: "providers: aws,azurerm, modules: ./vpc@1.0.0,./ec2"
   * @returns Formatted string with providers and modules
   */
  private formatMetadataString(): string {
    // Make providers unique by name
    const uniqueProviders = getUniqueByField(this.providers, 'name');
    const providerNames = uniqueProviders.map((p) => p.name).sort();

    // Make modules unique by source (already done in setModules, but ensure it here too)
    const uniqueModules = getUniqueByField(this.modules, 'source');
    const moduleStrings = uniqueModules
      .map((m) => {
        // Format: source@version or just source if no version
        return m.version ? `${m.source}@${m.version}` : m.source;
      })
      .sort();

    const parts: string[] = [];
    if (providerNames.length > 0) {
      parts.push(`providers: ${providerNames.join(',')}`);
    }
    if (moduleStrings.length > 0) {
      parts.push(`modules: ${moduleStrings.join(',')}`);
    }

    return parts.join(', ');
  }

  /**
   * Formats metadata comment block with providers
   * @param providersString Sorted, comma-separated string of provider names
   * @returns Formatted comment block string
   */
  private static formatMetadataComment(providersString: string): string {
    return `# nx-terraform-metadata-start
# ${providersString}
# nx-terraform-metadata-end
`;
  }

  /**
   * Extracts metadata content from the comment block in the file
   * @returns The content string between comment markers or null if comment doesn't exist
   */
  extractMetadata(): string | null {
    const match = this.initialFileContent.match(METADATA_COMMENT_REGEX);
    if (!match) {
      return null;
    }

    // Remove comment prefix from each line and return as string
    // If match[1] exists but is empty/whitespace, return empty string
    const content = match[1]
      ? match[1]
          .split('\n')
          .map((line) => line.replace(/^#\s*/, ''))
          .join('\n')
          .trim()
      : '';

    return content;
  }

  /**
   * Updates the metadata comment block in the file content using regex
   * @param metadataString The new metadata string to write
   * @returns Updated file content with the new metadata comment block
   */
  updateMetadataInContent(metadataString: string): string {
    // Format new comment block
    const newCommentBlock =
      ProviderTerraformFile.formatMetadataComment(metadataString);

    // Find and replace existing comment block or append if not found
    const match = this.initialFileContent.match(METADATA_COMMENT_REGEX);

    if (match && match.index !== undefined) {
      // Replace existing comment block
      return (
        this.initialFileContent.substring(0, match.index) +
        newCommentBlock +
        this.initialFileContent.substring(match.index + match[0].length)
      );
    } else {
      // Append new comment block at the end
      const trimmedContent = this.initialFileContent.trim();
      return trimmedContent
        ? `${trimmedContent}\n\n${newCommentBlock}`
        : newCommentBlock.trim();
    }
  }

  /**
   * Updates the metadata comment block in the file content
   * Compares current providers and modules (as sorted string) with metadata in comment and updates if different
   * @returns Updated file content and boolean indicating if content changed
   */
  updateMetadataComment(): {
    content: string;
    changed: boolean;
  } {
    // Get current providers and modules as sorted string
    const currentMetadataString = this.formatMetadataString();

    // Extract existing metadata content as string
    const existingMetadataString = this.extractMetadata();

    // Compare strings directly (both are sorted, so simple string comparison works)
    if (existingMetadataString === currentMetadataString) {
      return {
        content: this.initialFileContent,
        changed: false,
      };
    }

    // Update metadata in content
    const updatedContent = this.updateMetadataInContent(currentMetadataString);

    // Compare final content to determine if it actually changed
    const finalChanged = updatedContent !== this.initialFileContent;

    return {
      content: updatedContent,
      changed: finalChanged,
    };
  }
}
