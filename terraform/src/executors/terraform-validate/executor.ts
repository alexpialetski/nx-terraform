import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import { runTerraform } from '../../utils/exec';

interface ValidateExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  noInit?: boolean;
}

export default async function runExecutor(
  options: ValidateExecutorOptions,
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

  // Best-effort init unless suppressed
  if (!options.noInit) {
    const initRes = await runTerraform(['init', '-backend=false'], dir);
    if (initRes.code !== 0) {
      logger.error(
        initRes.stderr || 'terraform init (validate pre-step) failed'
      );
      return { success: false };
    }
  }

  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  logger.info(`Terraform validate (project=${projectName}) in ${dir}`);
  const result = await runTerraform(['validate'], dir, { inherit: true });
  if (result.code !== 0) {
    logger.error(result.stderr || 'terraform validate failed');
    return { success: false, project: projectName };
  }

  return { success: true, project: projectName };
}
