import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Locate the Nx workspace root by walking up from this file until an `nx.json` is found.
 * This is more robust than relying on a fixed relative path which broke when tests moved.
 */
let _cachedRoot: string | undefined;
export function getWorkspaceRoot(): string {
  if (_cachedRoot) return _cachedRoot;
  let dir = __dirname;
  const rootFs = path.parse(dir).root;
  while (true) {
    if (fs.existsSync(path.join(dir, 'nx.json'))) {
      _cachedRoot = dir;
      return dir;
    }
    if (dir === rootFs) {
      throw new Error(
        `Could not locate workspace root containing nx.json (started from ${__dirname})`
      );
    }
    dir = path.dirname(dir);
  }
}

export function uniqueName(base: string): string {
  return `${base}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface PlanArtifactInfo {
  artifactDir: string; // deepest hash dir
  envDir: string; // environment directory (may be implicit)
  hash: string | undefined;
  planPath: string;
  summaryPath: string;
  metaPath: string | undefined;
}

/** Run terraform-plan target and locate latest artifact directory (hash folder). */
export function runPlanAndLocateArtifacts(
  projectName: string
): PlanArtifactInfo {
  const root = getWorkspaceRoot();
  execSync(`npx nx run ${projectName}:terraform-plan`, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NX_DAEMON: 'false' },
  });
  const base = path.join(root, '.nx', 'terraform', projectName);
  if (!fs.existsSync(base)) {
    throw new Error(`Artifact base not found for project ${projectName}`);
  }
  const envDirs = fs
    .readdirSync(base)
    .filter((f) => fs.statSync(path.join(base, f)).isDirectory());
  if (envDirs.length === 0) throw new Error('No env directory produced');
  const envDir = path.join(base, envDirs[0]);
  const hashDirs = fs
    .readdirSync(envDir)
    .filter((f) => fs.statSync(path.join(envDir, f)).isDirectory());
  if (hashDirs.length === 0) throw new Error('No hash directory produced');
  // sort for determinism (iso timestamp or hash); pick latest by mtime desc
  hashDirs.sort((a, b) => {
    const statA = fs.statSync(path.join(envDir, a));
    const statB = fs.statSync(path.join(envDir, b));
    return statB.mtimeMs - statA.mtimeMs;
  });
  const artifactDir = path.join(envDir, hashDirs[0]);
  const planPath = path.join(artifactDir, 'plan.json');
  const summaryPath = path.join(artifactDir, 'summary.json');
  const metaPath = fs.existsSync(path.join(artifactDir, 'plan.meta.json'))
    ? path.join(artifactDir, 'plan.meta.json')
    : undefined;
  let hash: string | undefined;
  if (metaPath) {
    try {
      hash = JSON.parse(fs.readFileSync(metaPath, 'utf-8')).hash;
    } catch {}
  }
  return { artifactDir, envDir, hash, planPath, summaryPath, metaPath };
}

export function mutateTerraformFile(
  projectName: string,
  file = 'main.tf',
  comment = '# mutation'
) {
  const root = getWorkspaceRoot();
  const target = path.join(root, 'packages', projectName, file);
  fs.appendFileSync(target, `\n${comment}`);
}

export function runApply(projectName: string, configuration?: string) {
  const root = getWorkspaceRoot();
  const config = configuration ? ` --configuration=${configuration}` : '';
  return execSync(`npx nx run ${projectName}:terraform-apply${config}`, {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, NX_DAEMON: 'false' },
  }).toString();
}

/** Ensure `terraform init` has been performed for a generated project. */
export function ensureTerraformInit(projectName: string) {
  const root = getWorkspaceRoot();
  const projectRoot = path.join(root, 'packages', projectName);
  const lockFile = path.join(projectRoot, '.terraform.lock.hcl');
  const terraformDir = path.join(projectRoot, '.terraform');
  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project root not found for init: ${projectRoot}`);
  }
  if (!fs.existsSync(lockFile) || !fs.existsSync(terraformDir)) {
    execSync('terraform init', { cwd: projectRoot, stdio: 'inherit' });
  }
}
