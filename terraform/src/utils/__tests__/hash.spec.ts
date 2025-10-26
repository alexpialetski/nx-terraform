import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { hashTerraformInputs } from '../../utils/hash';

function setupTempTerraformDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-hash-'));
  fs.writeFileSync(
    path.join(dir, 'main.tf'),
    'resource "null_resource" "example" {}'
  );
  fs.mkdirSync(path.join(dir, 'tfvars'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'tfvars', 'dev.tfvars'),
    'example_var = "value"'
  );
  return dir;
}

describe('hashTerraformInputs', () => {
  it('is deterministic for identical content', async () => {
    const dir = setupTempTerraformDir();
    const first = await hashTerraformInputs({ dir, envName: 'dev' });
    const second = await hashTerraformInputs({ dir, envName: 'dev' });
    expect(first.hash).toBe(second.hash);
    expect(first.files.sort()).toEqual(second.files.sort());
  });

  it('changes when a tracked file content changes', async () => {
    const dir = setupTempTerraformDir();
    const initial = await hashTerraformInputs({ dir, envName: 'dev' });
    fs.appendFileSync(path.join(dir, 'main.tf'), '\n# change');
    const changed = await hashTerraformInputs({ dir, envName: 'dev' });
    expect(changed.hash).not.toBe(initial.hash);
  });

  it('includes env name influence', async () => {
    const dir = setupTempTerraformDir();
    const dev = await hashTerraformInputs({ dir, envName: 'dev' });
    const prod = await hashTerraformInputs({ dir, envName: 'prod' });
    expect(dev.hash).not.toBe(prod.hash);
  });
});
