import * as path from 'path';
import * as fs from 'fs';

export function getArtifactDir(
  workspaceRoot: string,
  projectName: string,
  envName: string | undefined,
  hash: string
): string {
  return path.join(
    workspaceRoot,
    '.nx',
    'terraform',
    projectName,
    envName || 'default',
    hash
  );
}

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}
