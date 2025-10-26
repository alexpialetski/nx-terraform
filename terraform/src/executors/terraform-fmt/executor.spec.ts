import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import fmtExecutor from './executor';

// Mock runTerraform: emulate terraform fmt output listing changed files
const runTerraformMock = jest.fn(async (args: string[], cwd: string) => {
  if (args[0] === 'fmt') {
    // Return one changed file for check mode, else empty after write
    const isCheck = args.includes('-check');
    if (isCheck) {
      return { code: 3, signal: null, stdout: 'main.tf\n', stderr: '' };
    } else {
      // simulate file was modified
      fs.writeFileSync(path.join(cwd, 'main.tf'), 'formatted');
      return { code: 0, signal: null, stdout: 'main.tf\n', stderr: '' };
    }
  }
  return { code: 0, signal: null, stdout: '', stderr: '' };
});

jest.mock('../../utils/exec', () => ({
  runTerraform: (a: string[], c: string) => runTerraformMock(a, c),
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-fmt-exec-'));
  const project = 'fmtproj';
  const projectDir = path.join(root, 'packages', project);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'main.tf'), 'unformatted');
  return { root, project, projectDir };
}

describe('terraform-fmt executor', () => {
  beforeEach(() => runTerraformMock.mockClear());

  it('reports needsFormatting in check mode when changes required', async () => {
    const { root, project } = scaffoldProject();
    const res = await fmtExecutor({ check: true }, makeContext(root, project));
    expect(res.success).toBe(false); // indicates formatting needed
    expect(res.needsFormatting).toBe(true);
    expect(res.changedCount).toBe(1);
    expect(res.changedFiles).toContain('main.tf');
  });

  it('returns success after write mode execution', async () => {
    const { root, project } = scaffoldProject();
    const res = await fmtExecutor({}, makeContext(root, project));
    expect(res.success).toBe(true);
    expect(res.changedCount).toBe(1);
  });
});
