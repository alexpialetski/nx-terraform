import {
  uniqueName,
  runCLI,
  ensureTerraformInit,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-executor-plan hash determinism', () => {
  const projectName = uniqueName('planhash');

  it('produces identical hash & artifact dir across consecutive plans without changes', async () => {
    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );
    ensureTerraformInit(projectName);

    const first = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
    });

    expect(first.success).toBe(true);

    const firstHash = first.hash;
    const firstDir = first.artifactDir;

    const second = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
    });

    expect(second.success).toBe(true);
    expect(second.hash).toBe(firstHash);
    expect(second.artifactDir).toBe(firstDir);
  }, 180000);
});
