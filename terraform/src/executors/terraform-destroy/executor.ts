import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { runTerraform } from '../../utils/exec';
import { hashTerraformInputs } from '../../utils/hash';

interface DestroyExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  varFile?: string;
  force?: boolean;
}

interface PlanMeta {
  project: string;
  environment: string;
  hash: string;
  createdAt?: string;
}

export default async function runExecutor(
  options: DestroyExecutorOptions,
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

  // Workspace selection (safe if it already exists)
  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  // Compute current hash (informational)
  let currentHash: string | undefined;
  try {
    const { hash } = await hashTerraformInputs({ dir, envName: options.env });
    currentHash = hash;
  } catch {
    /* ignore */
  }

  // Discover latest plan meta (if any) for warning about unapplied plan
  const latestPlan = discoverLatestPlanArtifact(
    workspaceRoot,
    projectName,
    options.env
  );
  const warnings: string[] = [];
  if (
    latestPlan?.meta?.hash &&
    currentHash &&
    latestPlan.meta.hash !== currentHash
  ) {
    const msg = `Warning: Latest plan hash (${latestPlan.meta.hash}) differs from current inputs (${currentHash}). Resources may have drifted since last plan.`;
    if (!options.force) {
      warnings.push(msg);
      logger.warn(msg);
    } else {
      logger.info(`Force enabled: ${msg}`);
    }
  }

  // Infer var file if not provided
  let effectiveVarFile: string | undefined = options.varFile;
  if (!effectiveVarFile && options.env) {
    const candidate = path.join(dir, 'tfvars', `${options.env}.tfvars`);
    if (fs.existsSync(candidate)) effectiveVarFile = candidate;
  }

  const args = ['destroy', '-auto-approve', '-input=false'];
  if (effectiveVarFile) args.push(`-var-file=${effectiveVarFile}`);

  logger.info(
    `Terraform destroy (project=${projectName}, env=${
      options.env || 'default'
    })` + (effectiveVarFile ? ` using varFile=${effectiveVarFile}` : '')
  );
  const result = await runTerraform(args, dir, { inherit: true });
  if (result.code !== 0) {
    logger.error(result.stderr || 'terraform destroy failed');
    return { success: false, warnings };
  }

  return {
    success: true,
    project: projectName,
    env: options.env,
    currentHash,
    latestPlannedHash: latestPlan?.meta?.hash,
    warnings,
    destroyedAt: new Date().toISOString(),
  };
}

function discoverLatestPlanArtifact(
  workspaceRoot: string,
  project: string,
  env?: string
): { planPath: string; meta?: PlanMeta } | undefined {
  const base = path.join(
    workspaceRoot,
    '.nx',
    'terraform',
    project,
    env || 'default'
  );
  if (!fs.existsSync(base)) return undefined;
  const hashDirs = fs
    .readdirSync(base)
    .map((h) => path.join(base, h))
    .filter((p) => fs.statSync(p).isDirectory());
  if (hashDirs.length === 0) return undefined;
  let latest:
    | { planPath: string; meta?: PlanMeta; createdAt?: string }
    | undefined;
  for (const dir of hashDirs) {
    const planPath = path.join(dir, 'tfplan');
    if (!fs.existsSync(planPath)) continue;
    const metaPath = path.join(dir, 'plan.meta.json');
    let meta: PlanMeta | undefined;
    let createdAt: string | undefined;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as PlanMeta;
        createdAt = meta.createdAt;
      } catch {
        /* ignore */
      }
    }
    if (!latest) {
      latest = { planPath, meta, createdAt };
    } else {
      const a = latest.createdAt
        ? Date.parse(latest.createdAt)
        : fs.statSync(latest.planPath).mtimeMs;
      const b = createdAt
        ? Date.parse(createdAt)
        : fs.statSync(planPath).mtimeMs;
      if (b > a) latest = { planPath, meta, createdAt };
    }
  }
  return latest ? { planPath: latest.planPath, meta: latest.meta } : undefined;
}
