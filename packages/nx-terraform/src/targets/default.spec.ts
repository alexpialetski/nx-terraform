import { getTerraformOutputTarget } from './default';

describe('getTerraformOutputTarget', () => {
  it('should use tfvars format (key=value) when outputFormat is tfvars', () => {
    const target = getTerraformOutputTarget({ outputFormat: 'tfvars' });
    expect(target.executor).toBe('nx:run-commands');
    expect(target.dependsOn).toContain('terraform-init');
    expect(target.outputs).toContain('{projectRoot}/terraform-outputs.env');
    const cmd = target.options?.command as string;
    expect(cmd).toContain('terraform output -json');
    expect(cmd).toContain('to_entries[]');
    expect(cmd).toContain('.key)=\\(.value.value)');
    expect(cmd).not.toContain('ascii_upcase');
    expect(cmd).toContain('> terraform-outputs.env');
  });

  it('should use env format (UPPERCASE keys) when outputFormat is env', () => {
    const target = getTerraformOutputTarget({ outputFormat: 'env' });
    const cmd = target.options?.command as string;
    expect(cmd).toContain('ascii_upcase');
    expect(cmd).toContain('.value.value)');
    expect(cmd).toContain('> terraform-outputs.env');
  });
});
