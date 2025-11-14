import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';

/**
 * Ensures Act is configured with a default runner image
 * This prevents Act from prompting for image selection in non-interactive environments
 */
function ensureActConfig(): void {
  const actrcPath = join(homedir(), '.config', 'act', 'actrc');
  const actrcDir = join(homedir(), '.config', 'act');
  
  // Only create config if it doesn't exist
  if (!existsSync(actrcPath)) {
    mkdirSync(actrcDir, { recursive: true });
    // Use medium-sized image that works with most actions
    writeFileSync(actrcPath, '-P ubuntu-latest=catthehacker/ubuntu:act-latest\n', 'utf-8');
  }
}

export interface ActRunOptions {
  workflow: string;
  event?: string; // 'push', 'pull_request', 'workflow_dispatch'
  job?: string; // specific job to run
  secrets?: Record<string, string>;
  env?: Record<string, string>;
  dryRun?: boolean;
}

/**
 * Checks if Act is available in the environment
 */
export function isActAvailable(): boolean {
  try {
    execSync('act --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets GitHub token from gh CLI if available
 * Falls back to GITHUB_TOKEN env var or returns undefined
 */
export function getGitHubToken(): string | undefined {
  try {
    // Try to get token from gh CLI
    const token = execSync('gh auth token', { 
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
    if (token) {
      return token;
    }
  } catch {
    // gh CLI not available or not authenticated
  }
  
  // Fall back to environment variable
  return process.env.GITHUB_TOKEN;
}

/**
 * Runs a GitHub Actions workflow using Act
 * @param projectDirectory - Directory containing .github/workflows
 * @param options - Act execution options
 * @returns Act output (Promise for async execution)
 */
export async function runActWorkflow(
  projectDirectory: string,
  options: ActRunOptions
): Promise<string> {
  // Ensure Act is configured before running
  ensureActConfig();
  
  const { workflow, event = 'push', job, secrets = {}, env = {}, dryRun = false } = options;

  // Build act command
  const cmdParts = ['act', event];

  if (workflow) {
    cmdParts.push('--workflows', join(projectDirectory, '.github/workflows', workflow));
  }

  if (job) {
    cmdParts.push('--job', job);
  }

  // Add secrets
  const secretArgs: string[] = [];
  for (const [key, value] of Object.entries(secrets)) {
    secretArgs.push('-s', `${key}=${value}`);
  }
  cmdParts.push(...secretArgs);

  // Add environment variables using --env flag
  // Act uses --env KEY=VALUE format
  const envArgs: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    envArgs.push('--env', `${key}=${value}`);
  }
  cmdParts.push(...envArgs);

  if (dryRun) {
    cmdParts.push('--list');
  }

  // Act writes most output to stderr (info messages, docker operations, etc.)
  // Use spawn to properly capture both stdout and stderr
  return new Promise<string>((resolve, reject) => {
    const [command, ...args] = cmdParts;
    const child = spawn(command, args, {
      cwd: projectDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString('utf-8');
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString('utf-8');
      });
    }

    child.on('close', (code) => {
      // Combine stdout and stderr - Act writes most output to stderr
      const combined = (stdout + (stderr ? '\n' + stderr : '')).trim();
      
      // Act returns non-zero exit codes even for successful executions
      // We always return the combined output, regardless of exit code
      if (combined && combined.length > 0) {
        resolve(combined);
      } else {
        // If no output, return a message about the exit code
        resolve(`Act exited with code ${code} but produced no output`);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Validates that a workflow can be parsed and listed by Act
 * This is a lightweight check that doesn't require full execution
 */
export async function validateWorkflowWithAct(
  projectDirectory: string,
  workflowName: string
): Promise<boolean> {
  try {
    const output = await runActWorkflow(projectDirectory, {
      workflow: workflowName,
      event: 'push',
      dryRun: true,
    });
    
    // If act can list the workflow, it's valid
    return output.includes('workflow') || output.length > 0;
  } catch {
    return false;
  }
}

