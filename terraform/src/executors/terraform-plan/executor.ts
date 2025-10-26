import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { runTerraform } from '../../utils/exec';
import { hashTerraformInputs } from '../../utils/hash';
import { getArtifactDir, ensureDir } from '../../utils/artifacts';
import { summarizePlan } from '../../utils/plan-parse';

interface PlanExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  detailedExitCode?: boolean;
  planFile?: string;
  varFile?: string;
  meta?: boolean; // write plan.meta.json with metadata
}

export default async function runExecutor(
  options: PlanExecutorOptions,
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

  const start = Date.now();
  // Hash inputs early for deterministic artifact path
  const { hash, files, terraformVersion } = await hashTerraformInputs({
    dir,
    envName: options.env,
  });
  const artifactDir = getArtifactDir(
    workspaceRoot,
    projectName,
    options.env,
    hash
  );
  ensureDir(artifactDir);

  logger.info(
    `Terraform plan (project=${projectName}, env=${
      options.env || 'default'
    }) -> ${artifactDir}`
  );

  // Workspace management (after init in typical flow, but user may call directly)
  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  const planPath = options.planFile
    ? path.resolve(workspaceRoot, options.planFile)
    : path.join(artifactDir, 'tfplan');
  const args = ['plan', '-out', planPath];
  if (options.detailedExitCode !== false) args.push('-detailed-exitcode');

  // Infer var file if not explicitly provided
  let effectiveVarFile: string | undefined = options.varFile;
  if (!effectiveVarFile && options.env) {
    const candidate = path.join(dir, 'tfvars', `${options.env}.tfvars`);
    if (fs.existsSync(candidate)) effectiveVarFile = candidate;
  }
  if (effectiveVarFile) args.push(`-var-file=${effectiveVarFile}`);

  const planResult = await runTerraform(args, dir, { inherit: true });
  if (![0, 2].includes(planResult.code || -1)) {
    logger.error(planResult.stderr || 'terraform plan failed');
    return { success: false };
  }

  // Show JSON
  const showResult = await runTerraform(['show', '-json', planPath], dir);
  let summaryPath: string | undefined;
  let planJsonPath: string | undefined;
  if (showResult.code === 0) {
    planJsonPath = path.join(artifactDir, 'plan.json');
    fs.writeFileSync(planJsonPath, showResult.stdout, 'utf-8');
    try {
      const parsed = JSON.parse(showResult.stdout);
      const summary = summarizePlan(parsed);
      summary.project = projectName;
      summary.environment = options.env;
      summaryPath = path.join(artifactDir, 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    } catch (e) {
      logger.warn(`Failed to parse plan JSON: ${(e as Error).message}`);
    }
  }

  // Optional metadata file
  if (options.meta !== false) {
    try {
      const meta = {
        project: projectName,
        environment: options.env || 'default',
        hash,
        createdAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        fileCount: files.length,
        terraformVersion: terraformVersion || inferTerraformVersion(),
        planFile: planJsonPath
          ? path.relative(workspaceRoot, planJsonPath)
          : undefined,
        summaryFile: summaryPath
          ? path.relative(workspaceRoot, summaryPath)
          : undefined,
      };
      fs.writeFileSync(
        path.join(artifactDir, 'plan.meta.json'),
        JSON.stringify(meta, null, 2),
        'utf-8'
      );
    } catch (e) {
      logger.warn(`Failed to write plan.meta.json: ${(e as Error).message}`);
    }
  }

  const changed = planResult.code === 2;
  return {
    success: true,
    project: projectName,
    env: options.env,
    artifactDir,
    hash,
    planPath,
    summaryPath,
    changed,
  };
}

function inferTerraformVersion(): string | undefined {
  try {
    const raw = require('child_process')
      .execSync('terraform version')
      .toString();
    const match = raw.match(/Terraform v(\S+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
