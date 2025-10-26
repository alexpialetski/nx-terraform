import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { runTerraform } from '../../utils/exec';
import { hashTerraformInputs } from '../../utils/hash';

interface ApplyExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  planFile?: string; // explicit plan path
  force?: boolean;
}

interface PlanMeta {
  project: string;
  environment: string;
  hash: string;
  createdAt?: string;
  planFile?: string;
}

export default async function runExecutor(
  options: ApplyExecutorOptions,
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

  // Determine plan file & meta
  let resolvedPlanPath: string | undefined;
  let planMeta: PlanMeta | undefined;

  if (options.planFile) {
    resolvedPlanPath = path.isAbsolute(options.planFile)
      ? options.planFile
      : path.join(workspaceRoot, options.planFile);
    planMeta = loadSiblingMeta(resolvedPlanPath);
  } else {
    // Discover latest artifact by createdAt in meta
    const found = discoverLatestPlanArtifact(
      workspaceRoot,
      projectName,
      options.env
    );
    if (!found) {
      logger.error('No prior plan artifact found. Generate a plan first.');
      return { success: false };
    }
    resolvedPlanPath = found.planPath;
    planMeta = found.meta;
  }

  if (!fs.existsSync(resolvedPlanPath)) {
    logger.error(`Plan file not found: ${resolvedPlanPath}`);
    return { success: false };
  }

  // Hash current inputs to detect staleness
  const { hash: currentHash } = await hashTerraformInputs({
    dir,
    envName: options.env,
  });
  const originalHash = planMeta?.hash;
  const stale = Boolean(originalHash && originalHash !== currentHash);
  if (stale && !options.force) {
    logger.error(
      `Stale plan detected. Plan hash=${originalHash} current hash=${currentHash}. Re-run plan or use --force.`
    );
    return { success: false, stale: true };
  }

  // Workspace management if desired
  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  const applyArgs = [
    'apply',
    '-input=false',
    '-auto-approve',
    resolvedPlanPath,
  ];
  logger.info(
    `Applying terraform plan (project=${projectName}, env=${
      options.env || 'default'
    }) plan=${resolvedPlanPath}`
  );
  const result = await runTerraform(applyArgs, dir, { inherit: true });
  if (result.code !== 0) {
    logger.error(result.stderr || 'terraform apply failed');
    return { success: false, stale };
  }

  const stateFile = path.join(dir, 'terraform.tfstate');
  const hasState = fs.existsSync(stateFile);

  return {
    success: true,
    project: projectName,
    env: options.env,
    planPath: resolvedPlanPath,
    stale,
    appliedHash: originalHash || currentHash,
    stateFile: hasState ? stateFile : undefined,
  };
}

function loadSiblingMeta(planPath: string): PlanMeta | undefined {
  try {
    const dir = path.dirname(planPath); // plan stored inside artifact dir
    const metaPath = path.join(dir, 'plan.meta.json');
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as PlanMeta;
    }
  } catch {
    // ignore
  }
  return undefined;
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
      // prefer newest by createdAt timestamp else by mtime
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
