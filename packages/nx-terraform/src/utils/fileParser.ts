import { readFileSync } from 'fs';
import * as hcl2json from '@cdktf/hcl2json';
import { logger } from '@nx/devkit';

/**
 * Reads a Terraform file and returns its content
 */
export function readTerraformFile(
  filePath: string,
  relativePath: string
): {
  content: string;
  success: boolean;
} {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return { content, success: true };
  } catch (e) {
    logger.warn(
      `Failed to read .tf file ${relativePath}. Error: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    return { content: '', success: false };
  }
}

/**
 * Parses HCL content into a JSON structure
 */
export async function parseTerraformFile(
  fileName: string,
  content: string
): Promise<{ parsed: any; success: boolean }> {
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
 * Extracts module blocks from parsed HCL structure
 */
export function extractModuleBlocks(parsed: any): Array<{
  moduleName: string;
  source: string;
}> {
  const modules = parsed.module ?? {};
  const moduleSources: Array<{ moduleName: string; source: string }> = [];

  for (const moduleName in modules) {
    const moduleConfigs = modules[moduleName];
    // moduleConfigs is an array of module configurations
    if (!Array.isArray(moduleConfigs)) {
      continue;
    }

    for (const moduleConfig of moduleConfigs) {
      const sourcePath = moduleConfig?.source;
      if (!sourcePath || typeof sourcePath !== 'string') {
        continue;
      }
      moduleSources.push({ moduleName, source: sourcePath });
    }
  }

  return moduleSources;
}

/**
 * Checks if a parsed HCL structure contains a backend block
 * Backend blocks are structured as:
 * terraform {
 *   backend "s3" { ... }
 * }
 * Which parses to: parsed.terraform[0].backend
 */
export function hasBackendBlock(parsed: any): boolean {
  const terraformBlocks = parsed.terraform;
  if (!terraformBlocks || !Array.isArray(terraformBlocks)) {
    return false;
  }

  // Check each terraform block for a backend property
  for (const terraformBlock of terraformBlocks) {
    if (terraformBlock?.backend) {
      return true;
    }
  }

  return false;
}

/**
 * Gets all .tf files to process for a project
 */
export function getTerraformFilesToProcess(
  filesToProcess: Array<{ file: string }>
): Array<{ file: string }> {
  return filesToProcess.filter((file) => file.file.endsWith('.tf'));
}

/**
 * Checks if a path is a local path (starts with ./ or ../)
 */
export function isLocalPath(sourcePath: string): boolean {
  return sourcePath.startsWith('./') || sourcePath.startsWith('../');
}
