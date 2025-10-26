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
  bucketPrefix?: string;
  tags?: string;
}

export default async function generator(tree: Tree, raw: SchemaOptions) {
  const opts = normalizeOptions(raw);
  if (tree.exists(opts.projectRoot)) {
    throw new Error(`Directory already exists: ${opts.projectRoot}`);
  }

  scaffoldTerraform(tree, opts);
  addNxProject(tree, opts);
  await formatFiles(tree);
  logger.info(`AWS setup project created at ${opts.projectRoot}`);
}

function normalizeOptions(raw: SchemaOptions) {
  const name = names(raw.name).fileName;
  const projectRoot = raw.directory
    ? raw.directory
    : joinPathFragments('packages', name);
  const bucketPrefix = raw.bucketPrefix || 'tf-state';
  const tags = raw.tags
    ? raw.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return { name, projectRoot, bucketPrefix, tags };
}

function scaffoldTerraform(
  tree: Tree,
  opts: { projectRoot: string; bucketPrefix: string; name: string }
) {
  const templateDir = path.join(__dirname, 'files');
  generateFiles(tree, templateDir, opts.projectRoot, {
    tmpl: '',
    bucketPrefix: opts.bucketPrefix,
    projectName: opts.name,
  });
  // make script executable
  const scriptPath = joinPathFragments(
    opts.projectRoot,
    'scripts/check_bucket.sh'
  );
  if (tree.exists(scriptPath)) {
    const original = tree.read(scriptPath) as Buffer;
    tree.write(scriptPath, original); // Nx will preserve mode when written to FS; doc note for user to chmod if needed.
  }
}

function addNxProject(
  tree: Tree,
  opts: { projectRoot: string; name: string; tags: string[] }
) {
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
      },
      // placeholder apply until executor implemented
      'terraform-apply': {
        executor: 'terraform:terraform-apply',
        dependsOn: ['terraform-plan'],
      },
    },
  };
  addProjectConfiguration(tree, opts.name, projectConfig);
}
