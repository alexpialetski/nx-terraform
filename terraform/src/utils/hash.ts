import * as fgModule from 'fast-glob';
type FastGlob = (
  patterns: string[] | string,
  options: fgModule.Options
) => Promise<string[]>;
const fg = fgModule as unknown as FastGlob;
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface HashOptions {
  dir: string;
  envName?: string;
  extraEnvVars?: string[]; // explicit variable names to include
}

export async function hashTerraformInputs(
  opts: HashOptions
): Promise<{ hash: string; files: string[]; terraformVersion?: string }> {
  const patterns = [
    '**/*.tf',
    'tfvars/**/*',
    'templates/**/*',
    'modules/**/*',
    '!**/.terraform/**',
  ];
  const entries = await fg(patterns, {
    cwd: opts.dir,
    dot: false,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: true,
  } as fgModule.Options);
  const h = createHash('sha256');
  const sorted = entries.sort();
  for (const rel of sorted) {
    const full = path.join(opts.dir, rel);
    try {
      const content = fs.readFileSync(full);
      h.update(rel + '\0');
      h.update(content);
    } catch {
      // ignore missing / race
    }
  }
  // include environment variables starting with TF_VAR_
  Object.keys(process.env)
    .filter((k) => k.startsWith('TF_VAR_'))
    .sort()
    .forEach((k) => h.update(`${k}=${process.env[k]}\n`));
  if (opts.envName) h.update(`ENV=${opts.envName}`);
  const lockFile = path.join(opts.dir, '.terraform.lock.hcl');
  if (fs.existsSync(lockFile)) {
    h.update('LOCKFILE\0');
    h.update(fs.readFileSync(lockFile));
  }
  let terraformVersion: string | undefined;
  try {
    // lightweight version detection (avoid JSON flag dependency)
    const raw = fs
      .readFileSync(path.join(opts.dir, '.terraform-version'), 'utf-8')
      .trim();
    if (raw) {
      terraformVersion = raw;
      h.update(`TERRAFORM_VERSION=${raw}`);
    }
  } catch {
    // optional .terraform-version file not present
  }
  return {
    hash: h.digest('hex').slice(0, 32),
    files: sorted,
    terraformVersion,
  };
}
