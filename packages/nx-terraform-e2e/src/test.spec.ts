import { ActRunner, ActExecStatus } from '@pshevche/act-test-runner';
import { createTestProject } from './testUtils';

describe('custom workflow', () => {
  test('custom workflow with inputs', async () => {
    // createTestProject('test-cicd-act', '--backendType=local');
    const result = await new ActRunner()
      .withWorkflowFile(
        '/home/aliaksei_pialetski/projects/nx/nx-terraform/tmp/test-cicd-act-dx0i7/.github/workflows/ci.yml'
      )
      .withEnvValues(['GREETING', 'Hello'], ['NAME', 'Bruce'])
      .run();
    debugger;
    expect(result.status).toBe(ActExecStatus.SUCCESS);
    const job = result.job('print_greeting')!;
    expect(job.status).toBe(ActExecStatus.SUCCESS);
    expect(job.output).toContain('Hello, Bruce!');
  }, 120000);
});
