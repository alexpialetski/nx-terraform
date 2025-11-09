import {
  CreateDependenciesContext,
  DependencyType,
  logger,
  RawProjectGraphDependency,
  StaticDependency,
  validateDependency,
} from '@nx/devkit';

/**
 * Creates a static dependency between two projects (from module references)
 */
export function createStaticDependency(
  sourceProject: string,
  targetProject: string,
  sourceFile: string
): StaticDependency {
  return {
    source: sourceProject,
    target: targetProject,
    sourceFile,
    type: DependencyType.static,
  };
}

/**
 * Validates and adds a dependency to the results if valid
 */
export function validateAndAddDependency(
  dependency: RawProjectGraphDependency,
  ctx: CreateDependenciesContext,
  results: RawProjectGraphDependency[]
): void {
  try {
    validateDependency(dependency, ctx);
    results.push(dependency);
  } catch (e) {
    logger.warn(
      `Invalid dependency from ${dependency.source} to ${dependency.target}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

export function isLocalPath(sourcePath: string): boolean {
  return sourcePath.startsWith('./') || sourcePath.startsWith('../');
}
