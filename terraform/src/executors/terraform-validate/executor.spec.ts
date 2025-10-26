import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import validateExecutor from './executor';

const runTerraformMock = jest.fn(async (args: string[]) => {
  if (args[0] === 'init') {
    return { code: 0, signal: null, stdout: '', stderr: '' };
  }
  if (args[0] === 'validate') {
    return { code: 0, signal: null, stdout: 'Success', stderr: '' };
  }
  return { code: 0, signal: null, stdout: '', stderr: '' };
});

jest.mock('../../utils/exec', () => ({
  runTerraform: (a: string[]) => runTerraformMock(a),
}));

function makeContext(workspaceRoot: string, projectName: string) {
  return {
    root: workspaceRoot,
    projectName,
    projectsConfigurations: {
      version: 2,
      projects: { [projectName]: { root: `packages/${projectName}` } },
    },
  } as any;
}

function scaffoldProject(): {
  root: string;
  project: string;
  projectDir: string;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-validate-exec-'));
  const project = 'valproj';
  const projectDir = path.join(root, 'packages', project);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'main.tf'), '');
  return { root, project, projectDir };
}

describe('terraform-validate executor', () => {
  beforeEach(() => runTerraformMock.mockClear());

  it('runs init then validate by default', async () => {
    const { root, project } = scaffoldProject();
    const res = await validateExecutor({}, makeContext(root, project));
    expect(res.success).toBe(true);
    // first call init, second validate
    expect(runTerraformMock.mock.calls[0][0][0]).toBe('init');
    expect(
      runTerraformMock.mock.calls.some((c) => c[0][0] === 'validate')
    ).toBe(true);
  });

  it('skips init when noInit=true', async () => {
    const { root, project } = scaffoldProject();
    runTerraformMock.mockImplementation(async (args: string[]) => {
      if (args[0] === 'validate') {
        return { code: 0, signal: null, stdout: 'Success', stderr: '' };
      }
      return { code: 0, signal: null, stdout: '', stderr: '' };
    });
    const res = await validateExecutor(
      { noInit: true },
      makeContext(root, project)
    );
    expect(res.success).toBe(true);
    expect(
      runTerraformMock.mock.calls.find((c) => c[0][0] === 'init')
    ).toBeUndefined();
  });

  it('fails when validate returns non-zero', async () => {
    runTerraformMock.mockImplementation(async (args: string[]) => {
      if (args[0] === 'init')
        return { code: 0, signal: null, stdout: '', stderr: '' };
      if (args[0] === 'validate')
        return { code: 1, signal: null, stdout: '', stderr: 'error' };
      return { code: 0, signal: null, stdout: '', stderr: '' };
    });
    const { root, project } = scaffoldProject();
    const res = await validateExecutor({}, makeContext(root, project));
    expect(res.success).toBe(false);
  });
});
