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

export function uniqueName(prefix: string): string {
  const randomSevenDigitNumber = Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, '0');

  return `${prefix}-${randomSevenDigitNumber}`;
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

/** Run an Nx CLI command at workspace root returning string output (stderr merged). */
export function runCLI(command: string, opts: { verbose?: boolean } = {}) {
  const root = getWorkspaceRoot();

  try {
    const out = execSync(`npx nx ${command}`, {
      cwd: root,
      stdio: 'pipe',
      env: { ...process.env, NX_DAEMON: 'false', CI: 'true', FORCE_COLOR: '0' },
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (opts.verbose) {
      // eslint-disable-next-line no-console
      console.log(out);
    }

    return out as string;
  } catch (e: any) {
    if (opts.verbose) {
      // eslint-disable-next-line no-console
      console.error(e.stdout, e.stderr);
    }

    throw e;
  }
}

/** Convenience JSON reader relative to workspace root. */
export function readJson<T = any>(relativePath: string): T {
  const root = getWorkspaceRoot();

  const full = path.join(root, relativePath);

  return JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
}

/** Assert listed files (relative to workspace) exist. */
export function checkFilesExist(...relative: string[]) {
  const root = getWorkspaceRoot();

  for (const r of relative) {
    const full = path.join(root, r);

    if (!fs.existsSync(full)) {
      throw new Error(`Expected file not found: ${full}`);
    }
  }
}

/** Build a minimal executor context for programmatic executor invocation. */
export function createExecutorContext(projectName: string): any {
  const root = getWorkspaceRoot();

  return {
    projectName,
    root,
    cwd: root,
    projectsConfigurations: {
      version: 2,
      projects: { [projectName]: { root: `packages/${projectName}` } },
    },
  };
}

// ---------------- Executor abstraction ----------------

const executorCache: Record<string, any> = {};

/** Resolve a built executor implementation from dist by its folder name (e.g. terraform-plan). */
export function getExecutor(
  name: string
): (options: any, context: any) => Promise<any> | any {
  if (!executorCache[name]) {
    const root = getWorkspaceRoot();
    const modPath = path.join(
      root,
      'dist',
      'terraform',
      'src',
      'executors',
      name,
      'executor.js'
    );
    if (!fs.existsSync(modPath)) {
      throw new Error(
        `Executor dist file not found for ${name}. Did you run build? Expected at ${modPath}`
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    executorCache[name] = require(modPath).default;
  }
  return executorCache[name];
}

/** Run a terraform executor by name with automatic context construction. */
export async function runTerraformExecutor(
  projectName: string,
  executorName: string,
  options: any
) {
  const context = createExecutorContext(projectName);

  const execFn = getExecutor(executorName);

  return await execFn(options, context);
}
