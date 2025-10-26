import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('terraform-apply executor', () => {
  const workspaceRoot = path.join(__dirname, '..', '..');
  const projectName = `tf-apply-${Date.now()}`;
  const projectRoot = path.join(workspaceRoot, 'packages', projectName);

  it('plans, applies, detects stale plan, replans, reapplies', () => {
    // Generate generic project with single dev env
    const gen = `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`;
    execSync(gen, { cwd: workspaceRoot, stdio: 'inherit', env: process.env });

    // Initial plan (dev)
    execSync(`npx nx run ${projectName}:terraform-plan --configuration=dev`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });

    // First apply succeeds (runs plan+apply due to dependsOn)
    execSync(`npx nx run ${projectName}:terraform-apply --configuration=dev`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });

    // Remove dependsOn from apply target to simulate stale plan scenario later
    const pjPath = path.join(projectRoot, 'project.json');
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf-8'));
    if (pj.targets['terraform-apply']?.dependsOn) {
      delete pj.targets['terraform-apply'].dependsOn;
      fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));
    }

    // Mutate file to change hash (no new plan yet)
    const mainTf = path.join(projectRoot, 'main.tf');
    fs.appendFileSync(mainTf, '\n# hash change');

    // Apply should now fail with stale plan detection (because plan hash differs)
    let staleDetected = false;
    try {
      execSync(`npx nx run ${projectName}:terraform-apply --configuration=dev`, {
        cwd: workspaceRoot,
        stdio: 'pipe',
        env: process.env,
      });
    } catch (e: any) {
      const output = String(e.stdout) + String(e.stderr);
      if (/Stale plan detected/i.test(output)) staleDetected = true;
    }
    expect(staleDetected).toBe(true);

    // Re-plan and apply again (without dependsOn) now succeeds
    execSync(`npx nx run ${projectName}:terraform-plan --configuration=dev`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });
    execSync(`npx nx run ${projectName}:terraform-apply --configuration=dev`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });
  }, 240000);
});
