import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import { runTerraform } from '../../utils/exec';

interface InitExecutorOptions {
  tfDir?: string;
  reconfigure?: boolean;
  backendConfig?: string[];
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  env?: string; // used when derive or explicit
}

export default async function runExecutor(
  options: InitExecutorOptions,
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

  logger.info(`Terraform init (project=${projectName}) in ${dir}`);
  const args = ['init'];
  if (options.reconfigure) args.push('-reconfigure');
  if (options.backendConfig) {
    for (const bc of options.backendConfig) args.push(`-backend-config=${bc}`);
  }

  // Workspace handling (lazy) - only if deriving and env provided
  if (options.workspaceStrategy !== 'none' && options.env) {
    // attempt to select or create workspace prior to init (safe to ignore failures)
    // Actually terraform requires init before workspace commands; we'll do after.
  }

  const result = await runTerraform(args, dir, { inherit: true });
  if (result.code !== 0) {
    logger.error(result.stderr || 'terraform init failed');
    return { success: false };
  }

  // Post-init workspace ensure (common pattern) if requested
  if (options.workspaceStrategy === 'derive' && options.env) {
    await runTerraform(['workspace', 'new', options.env], dir); // will fail if exists
    await runTerraform(['workspace', 'select', options.env], dir);
  } else if (options.workspaceStrategy === 'explicit' && options.env) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  return { success: true, workingDirectory: dir };
}
