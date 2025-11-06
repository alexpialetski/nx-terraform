#!/usr/bin/env node
import * as pc from 'picocolors';
import * as enquirer from 'enquirer';
import * as yargs from 'yargs';
import {
  determineDefaultBase,
  determineNxCloud,
  determinePackageManager,
} from 'create-nx-workspace/src/internal-utils/prompts';
import {
  withAllPrompts,
  withGitOptions,
  withNxCloud,
  withOptions,
  withPackageManager,
} from 'create-nx-workspace/src/internal-utils/yargs-options';
import { createWorkspace, CreateWorkspaceOptions } from 'create-nx-workspace';
import { output } from 'create-nx-workspace/src/utils/output';
import type { PackageManager } from 'create-nx-workspace/src/utils/package-manager';
import { Arguments } from 'yargs';

export const yargsDecorator = {
  'Options:': `${pc.green(`Options`)}:`,
  'Examples:': `${pc.green(`Examples`)}:`,
  boolean: `${pc.blue(`boolean`)}`,
  count: `${pc.blue(`count`)}`,
  string: `${pc.blue(`string`)}`,
  array: `${pc.blue(`array`)}`,
  required: `${pc.blue(`required`)}`,
  'default:': `${pc.blue(`default`)}:`,
  'choices:': `${pc.blue(`choices`)}:`,
  'aliases:': `${pc.blue(`aliases`)}:`,
};

const presetVersion = require('../package.json').version;

async function determineProjectName(
  parsedArgs: CreateNxTerraformArguments
): Promise<string> {
  if (parsedArgs.projectName) {
    return parsedArgs.projectName;
  }

  const results = await enquirer.prompt<{ projectName: string }>([
    {
      name: 'projectName',
      message: `Project name                       `,
      type: 'input',
      validate: (s_1) => (s_1.length ? true : 'Project name cannot be empty'),
    },
  ]);
  return results.projectName;
}

async function determineBackendType(
  parsedArgs: CreateNxTerraformArguments
): Promise<'aws-s3' | 'local' | undefined> {
  if (parsedArgs.backendType !== undefined) {
    return parsedArgs.backendType;
  }

  const results = await enquirer.prompt<{
    backendType: 'aws-s3' | 'local' | 'skip';
  }>([
    {
      name: 'backendType',
      message: `Terraform backend type (aws-s3 | local) (optional)`,
      type: 'select',
      choices: [
        { name: 'skip', message: 'Skip backend setup' },
        { name: 'local', message: 'Local backend' },
        { name: 'aws-s3', message: 'AWS S3 remote backend' },
      ],
      initial: 0,
    },
  ]);
  return results.backendType === 'skip' ? undefined : results.backendType;
}

interface CreateNxTerraformArguments extends CreateWorkspaceOptions {
  projectName: string;
  packageManager: PackageManager;
  allPrompts: boolean;
  backendType?: 'aws-s3' | 'local';
}

export const commandsObject: yargs.Argv<CreateNxTerraformArguments> = yargs
  .wrap(yargs.terminalWidth())
  .parserConfiguration({
    'strip-dashed': true,
    'dot-notation': true,
  })
  .command(
    // this is the default and only command
    '$0 [name] [options]',
    'Create a new Nx workspace',
    (yargs) =>
      withOptions(
        yargs
          .positional('projectName', {
            describe: pc.dim(`Project name`),
            type: 'string',
            alias: ['name'],
          })
          .option('backendType', {
            describe:
              'Terraform backend type to configure (aws-s3 | local). If not provided, no backend will be created.',
            choices: ['aws-s3', 'local'] as const,
            type: 'string',
          }),
        withNxCloud,
        withAllPrompts,
        withPackageManager,
        withGitOptions
      ),
    async (argv: yargs.ArgumentsCamelCase<CreateNxTerraformArguments>) => {
      await main(argv).catch((error) => {
        const { version } = require('../package.json');
        output.error({
          title: `Something went wrong! v${version}`,
        });
        throw error;
      });
    },
    [normalizeArgsMiddleware]
  )
  .help('help', pc.dim(`Show help`))
  .updateLocale(yargsDecorator)
  .version(
    'version',
    pc.dim(`Show version`),
    presetVersion
  ) as yargs.Argv<CreateNxTerraformArguments>;

let rawArgs: Arguments<CreateNxTerraformArguments>;

async function main(parsedArgs: yargs.Arguments<CreateNxTerraformArguments>) {
  const populatedArguments: CreateNxTerraformArguments = {
    ...parsedArgs,
    name: parsedArgs.projectName.includes('/')
      ? parsedArgs.projectName.split('/')[1]
      : parsedArgs.projectName,
  };

  await createWorkspace<CreateNxTerraformArguments>(
    `nx-terraform@${presetVersion}`,
    populatedArguments,
    rawArgs
  );
}

/**
 * This function is used to normalize the arguments passed to the command.
 * It would:
 * - normalize the preset.
 * @param argv user arguments
 */
async function normalizeArgsMiddleware(
  argv: yargs.Arguments<CreateNxTerraformArguments>
): Promise<void> {
  rawArgs = { ...argv };
  output.log({
    title: "Let's create a new NX terraform workspace",
  });

  try {
    const projectName = await determineProjectName(argv);
    const packageManager = await determinePackageManager(argv);
    const defaultBase = await determineDefaultBase(argv);
    const backendType = await determineBackendType(argv);
    const nxCloud = await determineNxCloud(argv);

    Object.assign(argv, {
      projectName,
      backendType,
      nxCloud,
      packageManager,
      defaultBase,
    } satisfies Partial<CreateNxTerraformArguments>);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// Trigger Yargs
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
commandsObject.argv;
