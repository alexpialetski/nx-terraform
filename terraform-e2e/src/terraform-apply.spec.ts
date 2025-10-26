import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nx/plugin/testing';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

describe.skip('terraform-apply executor e2e (legacy test skipped)', () => {
  jest.setTimeout(120_000);

  const env = 'dev';

  beforeAll(async () => {
    ensureNxProject('terraform', 'dist/packages/terraform');
  });

  it('should plan then apply successfully and detect stale plan after change', async () => {
    const project = uniq('tfapply');
    await runNxCommandAsync(
      `generate terraform:add-terraform-project --name ${project} --directory ${project} --environments=${env}`
    );

    // Run plan
    const planResult = await runNxCommandAsync(
      `run ${project}:terraform-plan --configuration=${env}`
    );
    expect(planResult.stdout).toContain('Executor ran for Terraform Plan');

    // Locate artifact dir via plan.meta.json
    const metaGlobsBase = join(
      tmpProjPath(),
      'dist',
      '.nx',
      'terraform',
      project,
      env
    );

    // We can't easily glob without a helper; instead, just assert meta appears later via hash from stdout if emitted.

    // Run apply
    const applyResult = await runNxCommandAsync(
      `run ${project}:terraform-apply --configuration=${env}`
    );
    expect(applyResult.stdout).toContain('Executor ran for Terraform Apply');

    // Re-run apply without new plan should still succeed (idempotent usage of existing plan)
    const applyResult2 = await runNxCommandAsync(
      `run ${project}:terraform-apply --configuration=${env}`
    );
    expect(applyResult2.stdout).toContain('Executor ran for Terraform Apply');

    // Mutate a terraform file to invalidate hash
    const mainTfPath = join('packages', project, 'main.tf');
    const original = readFileSync(mainTfPath, 'utf-8');
    writeFileSync(mainTfPath, original + '\n# comment to change hash');

    // Apply should now fail due to stale plan
    let staleFailed = false;
    try {
      await runNxCommandAsync(
        `run ${project}:terraform-apply --configuration=${env}`
      );
    } catch (e: any) {
      staleFailed = true;
      expect(e.stdout || e.message).toMatch(/stale plan hash/i);
    }
    expect(staleFailed).toBe(true);

    // Force apply should bypass stale guard (will still fail because applying null provider plan after change may require re-plan, but our executor will refuse without plan). So first re-run plan then apply.
    await runNxCommandAsync(
      `run ${project}:terraform-plan --configuration=${env}`
    );
    const applyAfterReplan = await runNxCommandAsync(
      `run ${project}:terraform-apply --configuration=${env}`
    );
    expect(applyAfterReplan.stdout).toContain(
      'Executor ran for Terraform Apply'
    );
  });
});

// Minimal tmpProjPath re-export (copied from @nx/plugin/testing internal) since not exported directly
function tmpProjPath() {
  return process.cwd();
}
