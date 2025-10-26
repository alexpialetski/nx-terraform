import { spawn } from 'child_process';

export interface RunCommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export function runCommand(
  cmd: string,
  args: string[],
  opts: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    inheritStdout?: boolean;
    inheritStderr?: boolean;
  }
): Promise<RunCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (opts.inheritStdout) process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (opts.inheritStderr) process.stderr.write(d);
    });
    child.on('close', (code, signal) =>
      resolve({ code, signal, stdout, stderr })
    );
  });
}

export async function runTerraform(
  args: string[],
  cwd: string,
  options: { inherit?: boolean } = {}
) {
  return runCommand('terraform', args, {
    cwd,
    inheritStdout: options.inherit,
    inheritStderr: options.inherit,
  });
}
