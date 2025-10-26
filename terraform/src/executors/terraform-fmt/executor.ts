import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { runTerraform } from '../../utils/exec';

interface FmtExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  check?: boolean;
}

export default async function runExecutor(
  options: FmtExecutorOptions,
  context: ExecutorContext
) {
  if (!context.projectName || !context.projectsConfigurations) {
    logger.error('Executor context missing project information.');
    return { success: false };
  }
  const projectName = context.projectName;
  const projectRoot = context.projectsConfigurations.projects[projectName].root;
  const workspaceRoot = context.root;
  const dir = options.tfDir
    ? path.join(workspaceRoot, projectRoot, options.tfDir)
    : path.join(workspaceRoot, projectRoot);

  // Optional workspace selection (not strictly needed for formatting but consistent interface)
  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  logger.info(`Terraform fmt (project=${projectName}) in ${dir}`);

  const args = ['fmt', '-recursive', '-list=true'];
  if (options.check) {
    // Check mode: do not write; returns non-zero (3) if changes required.
    args.push('-check');
    args.push('-write=false');
  } else {
    args.push('-write=true');
  }

  const result = await runTerraform(args, dir);
  // terraform fmt prints changed file paths (one per line) when changes occur
  const rawList = result.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !!l);

  let changedFiles: string[] = [];
  let changedCount = 0;
  if (rawList.length > 0) {
    // Resolve to relative paths for consistency
    changedFiles = rawList.map((p) => {
      if (path.isAbsolute(p)) return path.relative(dir, p);
      return p;
    });
    changedCount = changedFiles.length;
  }

  if (options.check && result.code === 3) {
    // changes needed but not written
    return {
      success: false,
      project: projectName,
      check: true,
      needsFormatting: true,
      changedCount,
      changedFiles,
    };
  }

  if (result.code !== 0 && result.code !== 3) {
    logger.error(result.stderr || 'terraform fmt failed');
    return { success: false };
  }

  return {
    success: true,
    project: projectName,
    changedCount,
    changedFiles,
    check: options.check || false,
  };
}
