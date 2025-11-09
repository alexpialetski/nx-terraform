import { Tree } from '@nx/devkit';
import { join } from 'path';
import { logger } from '@nx/devkit';
import { TerraformFileParser } from './TerraformFileParser';

/**
 * Parser implementation that uses Tree API for reading Terraform files
 * Used in generators and other Tree-based operations
 */
export class TreeTerraformFileParser extends TerraformFileParser {
    constructor(
        private readonly tree: Tree,
        private readonly projectRoot: string
    ) {
        super();
    }

    /**
     * Finds all .tf files in the project root (first level only)
     */
    protected findTerraformFiles(): string[] {
        try {
            const children = this.tree.children(this.projectRoot);
            return children
                .filter((child) => child.endsWith('.tf'))
                .map((child) => join(this.projectRoot, child));
        } catch {
            // Directory doesn't exist or can't be read, return empty array
            return [];
        }
    }

    /**
     * Asynchronously reads a Terraform file from the Tree
     */
    protected async readTerraformFile(
        filePath: string
    ): Promise<{ content: string; success: boolean }> {
        try {
            const content = this.tree.read(filePath, 'utf-8');
            if (!content) {
                logger.warn(`Failed to read .tf file ${filePath}. File is empty.`);
                return { content: '', success: false };
            }
            return { content, success: true };
        } catch (e) {
            logger.warn(
                `Failed to read .tf file ${filePath}. Error: ${e instanceof Error ? e.message : String(e)
                }`
            );
            return { content: '', success: false };
        }
    }
}

