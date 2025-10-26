import * as path from 'path';
import {
  uniqueName,
  runCLI,
  ensureTerraformInit,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-executor-output', () => {
  const projectName = uniqueName('outputproj');

  it('retrieves project_name output after apply', async () => {
    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );

    ensureTerraformInit(projectName);

    const plan = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
    });

    expect(plan.success).toBe(true);

    const apply = await runTerraformExecutor(projectName, 'terraform-apply', {
      env: 'dev',
    });

    expect(apply.success).toBe(true);

    const output = await runTerraformExecutor(projectName, 'terraform-output', {
      env: 'dev',
    });

    expect(output.success).toBe(true);

    // outputs.json should exist and contain project_name
    const fs = require('fs');
    const outputsJson = path.join(output.artifactDir, 'outputs.json');

    expect(fs.existsSync(outputsJson)).toBe(true);

    const data = JSON.parse(fs.readFileSync(outputsJson, 'utf-8'));

    expect(data.project_name.value).toBe(projectName);
  }, 180000);
});
