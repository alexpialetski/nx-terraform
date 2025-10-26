import { ExecutorContext, logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { runTerraform } from '../../utils/exec';
import { hashTerraformInputs } from '../../utils/hash';
import { getArtifactDir, ensureDir } from '../../utils/artifacts';

interface OutputExecutorOptions {
  tfDir?: string;
  env?: string;
  workspaceStrategy?: 'derive' | 'explicit' | 'none';
  allowSensitive?: boolean;
}

interface PlanMeta {
  project: string;
  environment: string;
  hash: string;
  createdAt?: string;
}

export default async function runExecutor(
  options: OutputExecutorOptions,
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

  // Attempt to locate latest plan artifact (preferred so outputs live alongside the plan)
  const discovered = discoverLatestPlanArtifact(
    workspaceRoot,
    projectName,
    options.env
  );

  let artifactDir: string;
  let hash: string | undefined;
  if (discovered) {
    artifactDir = path.dirname(discovered.planPath);
    hash = discovered.meta?.hash;
  } else {
    // Fallback: hash current inputs to create deterministic artifact dir even without a plan
    const { hash: currentHash } = await hashTerraformInputs({
      dir,
      envName: options.env,
    });
    hash = currentHash;
    artifactDir = getArtifactDir(
      workspaceRoot,
      projectName,
      options.env,
      currentHash
    );
    ensureDir(artifactDir);
  }

  if (
    options.workspaceStrategy &&
    options.workspaceStrategy !== 'none' &&
    options.env
  ) {
    // Best effort workspace select; ignore failures (e.g. workspace not created)
    await runTerraform(['workspace', 'select', options.env], dir);
  }

  logger.info(
    `Terraform output (project=${projectName}, env=${
      options.env || 'default'
    }) -> ${artifactDir}`
  );

  const result = await runTerraform(['output', '-json'], dir);
  if (result.code !== 0) {
    logger.error(result.stderr || 'terraform output failed');
    return { success: false };
  }

  let outputsObject: Record<string, any> = {};
  try {
    outputsObject = JSON.parse(result.stdout);
  } catch (e) {
    logger.error('Failed to parse terraform output JSON');
    return { success: false };
  }

  const outputsJsonPath = path.join(artifactDir, 'outputs.json');
  const outputsEnvPath = path.join(artifactDir, 'outputs.env');

  fs.writeFileSync(outputsJsonPath, JSON.stringify(outputsObject, null, 2));

  const lines: string[] = [];
  let sensitiveCount = 0;
  for (const [name, valueWrapper] of Object.entries(outputsObject)) {
    const sensitive = valueWrapper?.sensitive === true;
    let v = valueWrapper?.value;
    if (sensitive && !options.allowSensitive) {
      sensitiveCount += 1;
      lines.push(`${name}=*****`);
      continue;
    }
    if (typeof v === 'object') {
      try {
        v = JSON.stringify(v);
      } catch {
        v = String(v);
      }
    }
    lines.push(`${name}=${v}`);
  }
  fs.writeFileSync(outputsEnvPath, lines.join('\n') + '\n', 'utf-8');

  return {
    success: true,
    project: projectName,
    env: options.env,
    artifactDir,
    hash,
    outputsJsonPath,
    outputsEnvPath,
    sensitiveCount,
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
