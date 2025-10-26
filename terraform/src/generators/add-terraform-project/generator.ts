import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  addProjectConfiguration,
  ProjectConfiguration,
  logger,
} from '@nx/devkit';
import * as path from 'path';

interface SchemaOptions {
  name: string;
  directory?: string;
  provider?: 'null' | 'aws';
  envs?: string; // comma separated
  withBackend?: boolean;
  tags?: string;
}

interface NormalizedOptions {
  name: string;
  projectRoot: string;
  provider: 'null' | 'aws';
  envList: string[];
  withBackend: boolean;
  tags: string[];
}

export default async function generator(tree: Tree, raw: SchemaOptions) {
  const opts = normalizeOptions(raw);
  if (tree.exists(opts.projectRoot)) {
    throw new Error(`Directory already exists: ${opts.projectRoot}`);
  }

  scaffoldTerraformProject(tree, opts);
  addNxProject(tree, opts);
  await formatFiles(tree);
  logger.info(`Terraform project created at ${opts.projectRoot}`);
}

function normalizeOptions(raw: SchemaOptions): NormalizedOptions {
  const name = names(raw.name).fileName;
  const projectRoot = raw.directory
    ? raw.directory
    : joinPathFragments('packages', name);
  const provider: 'null' | 'aws' = (raw.provider as any) || 'null';
  const envList = (raw.envs || 'dev')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const withBackend = raw.withBackend ?? false;
  const tags = raw.tags
    ? raw.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return { name, projectRoot, provider, envList, withBackend, tags };
}

function scaffoldTerraformProject(tree: Tree, opts: NormalizedOptions) {
  const templateDir = path.join(__dirname, 'files');
  generateFiles(tree, templateDir, opts.projectRoot, {
    tmpl: '',
    projectName: opts.name,
    provider: opts.provider,
    withBackend: opts.withBackend,
  });
  // backend optional: if not requested remove generated backend.tf
  if (
    !opts.withBackend &&
    tree.exists(joinPathFragments(opts.projectRoot, 'backend.tf'))
  ) {
    tree.delete(joinPathFragments(opts.projectRoot, 'backend.tf'));
  }
  // generate tfvars for each env
  const tfvarsDir = joinPathFragments(opts.projectRoot, 'tfvars');
  if (!tree.exists(tfvarsDir)) tree.write(tfvarsDir + '/.gitkeep', '');
  opts.envList.forEach((env) => {
    const content = tfvarsTemplate(opts.provider, env);
    tree.write(joinPathFragments(tfvarsDir, `${env}.tfvars`), content);
  });
}

function tfvarsTemplate(provider: string, env: string) {
  switch (provider) {
    case 'aws':
      return `region = "us-east-1"\nname_prefix = "example-${env}"\n`;
    default:
      return `name_prefix = "example-${env}"\n`;
  }
}

function addNxProject(tree: Tree, opts: NormalizedOptions) {
  // Build configurations map for plan/destroy referencing tfvars
  const planConfigs: Record<string, any> = {};
  const destroyConfigs: Record<string, any> = {};
  opts.envList.forEach((env) => {
    planConfigs[env] = { env, varFile: `tfvars/${env}.tfvars` };
    destroyConfigs[env] = { env, varFile: `tfvars/${env}.tfvars` };
  });

  const projectConfig: ProjectConfiguration = {
    name: opts.name,
    root: opts.projectRoot,
    sourceRoot: opts.projectRoot,
    projectType: 'application',
    tags: opts.tags,
    targets: {
      'terraform-init': { executor: 'terraform:terraform-init' },
      'terraform-plan': {
        executor: 'terraform:terraform-plan',
        dependsOn: ['terraform-init'],
        defaultConfiguration: opts.envList[0],
        configurations: planConfigs,
      },
      'terraform-apply': {
        executor: 'terraform:terraform-apply',
        dependsOn: ['terraform-plan'],
        defaultConfiguration: opts.envList[0],
        configurations: Object.fromEntries(
          opts.envList.map((e) => [e, { env: e }])
        ),
      },
      'terraform-destroy': {
        executor: 'nx:run-commands',
        defaultConfiguration: opts.envList[0],
        configurations: Object.fromEntries(
          Object.entries(destroyConfigs).map(([k, v]) => [k, { env: v.env }])
        ),
        options: {
          cwd: opts.projectRoot,
          command: 'terraform destroy -auto-approve',
        },
      },
      'terraform-fmt': {
        executor: 'nx:run-commands',
        options: {
          cwd: opts.projectRoot,
          command: 'terraform fmt -write=true',
        },
      },
      'terraform-validate': {
        executor: 'nx:run-commands',
        dependsOn: ['terraform-init'],
        options: { cwd: opts.projectRoot, command: 'terraform validate' },
      },
      'terraform-output': {
        executor: 'nx:run-commands',
        dependsOn: ['terraform-init'],
        options: { cwd: opts.projectRoot, command: 'terraform output' },
      },
    },
  };
  addProjectConfiguration(tree, opts.name, projectConfig);
}
