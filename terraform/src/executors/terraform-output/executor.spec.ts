import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import outputExecutor from './executor';

// Mock runTerraform to avoid needing real terraform binary/state
jest.mock('../../utils/exec', () => ({
  runTerraform: jest.fn(async (args: string[], _cwd: string) => {
    if (args[0] === 'output') {
      return {
        code: 0,
        signal: null,
        stdout: JSON.stringify({
          visible_value: { value: 'hello', sensitive: false },
          secret_token: { value: 'shhh', sensitive: true },
        }),
        stderr: '',
      };
    }
    return { code: 0, signal: null, stdout: '', stderr: '' };
  }),
}));

// Stub hash to produce deterministic hash
jest.mock('../../utils/hash', () => ({
  hashTerraformInputs: jest.fn(async () => ({
    hash: 'abcd1234hashstub0000000000000000',
    files: ['main.tf'],
  })),
}));

function makeContext(workspaceRoot: string, projectName: string) {
  return {
    root: workspaceRoot,
    projectName,
    projectsConfigurations: {
      version: 2,
      projects: {
        [projectName]: { root: `packages/${projectName}` },
      },
    },
  } as any;
}

function scaffoldProject(): {
  root: string;
  project: string;
  projectDir: string;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-out-exec-'));
  const project = 'myproj';
  const projectDir = path.join(root, 'packages', project);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'main.tf'), '');
  return { root, project, projectDir };
}

describe('terraform-output executor', () => {
  it('writes outputs.json and masks sensitive values in outputs.env by default', async () => {
    const { root, project } = scaffoldProject();
    const res = await outputExecutor(
      { env: 'dev' },
      makeContext(root, project)
    );
    expect(res.success).toBe(true);
    const jsonPath = res.outputsJsonPath as string;
    const envPath = res.outputsEnvPath as string;
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(json.visible_value.value).toBe('hello');
    expect(json.secret_token.value).toBe('shhh');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    expect(envContent).toMatch(/visible_value=hello/);
    expect(envContent).toMatch(/secret_token=\*{5}/);
  });

  it('includes sensitive value when allowSensitive=true', async () => {
    const { root, project } = scaffoldProject();
    const res = await outputExecutor(
      { env: 'dev', allowSensitive: true },
      makeContext(root, project)
    );
    expect(res.success).toBe(true);
    const envContent = fs.readFileSync(res.outputsEnvPath as string, 'utf-8');
    expect(envContent).toMatch(/secret_token=shhh/);
  });
});
