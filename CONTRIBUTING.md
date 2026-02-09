# Contributing to nx-terraform

Thank you for your interest in contributing to nx-terraform! This guide will help you get started.

## Code of Conduct

Be respectful and constructive in all interactions. We aim to foster an inclusive and welcoming community.

## Ways to Contribute

- **Report bugs** - Help us identify and fix issues
- **Suggest features** - Share ideas for improvements
- **Improve documentation** - Fix typos, clarify explanations, add examples
- **Submit pull requests** - Fix bugs or implement new features
- **Answer questions** - Help others in GitHub Discussions

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Terraform CLI (optional but recommended for testing)
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/<your-username>/nx-terraform.git
cd nx-terraform
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the plugin**

```bash
nx build nx-terraform
```

4. **Run tests**

```bash
nx test nx-terraform
nx e2e nx-terraform-e2e
```

### Project Structure

```
nx-terraform/
├── packages/
│   ├── nx-terraform/           # Main plugin package
│   │   ├── src/
│   │   │   ├── dependencies/   # Dependency detection logic
│   │   │   ├── generators/     # Code generators (init, preset, etc.)
│   │   │   ├── targets/        # Target/task inference
│   │   │   └── types.ts        # Type definitions
│   │   └── project.json
│   ├── nx-terraform-e2e/       # End-to-end tests
│   └── nx-terraform-docs/      # Documentation (Docusaurus)
└── README.md
```

## Development Workflow

### Making Changes

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

Follow the coding style and conventions used in the project.

3. **Add tests**

All new features and bug fixes should include tests:
- Unit tests in `*.spec.ts` files
- E2E tests in `packages/nx-terraform-e2e/src/`

4. **Run tests locally**

```bash
# Unit tests
nx test nx-terraform

# E2E tests
nx e2e nx-terraform-e2e

# Lint
nx lint nx-terraform
```

5. **Update documentation**

If your changes affect user-facing behavior:
- Update relevant docs in `packages/nx-terraform-docs/docs/`
- Add examples if appropriate
- Update the README if needed

6. **Commit your changes**

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add support for Azure backend"
git commit -m "fix: resolve dependency detection for nested modules"
git commit -m "docs: clarify caching behavior for stateful projects"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

7. **Push and create a pull request**

```bash
git push origin feature/your-feature-name
```

## Testing

### Unit Tests

Located in `packages/nx-terraform/src/**/*.spec.ts`:

```bash
# Run all unit tests
nx test nx-terraform

# Run specific test file
nx test nx-terraform --testFile=createNodes.spec.ts

# Watch mode
nx test nx-terraform --watch
```

### E2E Tests

Located in `packages/nx-terraform-e2e/src/`:

```bash
# Run all E2E tests
nx e2e nx-terraform-e2e

# Run specific test
nx e2e nx-terraform-e2e --testFile=create-nx-terraform-app.spec.ts
```

### Writing Tests

**Unit test example:**

```typescript
describe('createDependencies', () => {
  it('should detect module dependencies from source paths', () => {
    const projects = {
      'web-infra': { /* ... */ },
      'networking': { /* ... */ }
    };

    const dependencies = createDependencies(projects);

    expect(dependencies).toContainEqual({
      source: 'web-infra',
      target: 'networking',
      type: 'static'
    });
  });
});
```

**E2E test example:**

```typescript
describe('create-nx-terraform-app', () => {
  it('should create a workspace with Terraform projects', async () => {
    const workspace = await createTestWorkspace();

    const projects = listProjects(workspace);
    expect(projects).toContain('terraform-setup');
    expect(projects).toContain('terraform-infra');

    const graph = await runNxCommand('graph', workspace);
    expect(graph).toShowDependency('terraform-infra', 'terraform-setup');
  }, 120000);
});
```

## Pull Request Guidelines

### Before Submitting

- ✅ All tests pass locally
- ✅ Code follows existing style and conventions
- ✅ Documentation updated (if applicable)
- ✅ Commit messages follow Conventional Commits
- ✅ No merge conflicts with `main`

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them

## Checklist
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Follows code style guidelines
- [ ] Added/updated tests for changes
```

### PR Review Process

1. **Automated checks** - CI runs tests and linting
2. **Code review** - Maintainer reviews code and provides feedback
3. **Address feedback** - Make requested changes
4. **Approval** - Maintainer approves PR
5. **Merge** - Maintainer merges PR

## Documentation

Documentation is written in Markdown using Docusaurus.

### Running Documentation Locally

```bash
cd packages/nx-terraform-docs
npm install
npm start
```

Open http://localhost:3000 to view the docs.

### Documentation Structure

```
packages/nx-terraform-docs/docs/
├── intro.md                    # Introduction
├── getting-started/            # Getting started guides
├── tutorials/                  # Step-by-step tutorials
├── guides/                     # Conceptual guides
├── reference/                  # API reference
│   ├── generators/             # Generator docs
│   └── targets/                # Target docs
└── examples/                   # Real-world examples
```

### Writing Documentation

- **Be clear and concise** - Use simple language
- **Include examples** - Show, don't just tell
- **Add expected outputs** - Help users verify success
- **Use code blocks** - Make examples copy-paste ready
- **Cross-link** - Link to related docs
- **Keep it updated** - Update docs with code changes

## Reporting Bugs

### Before Reporting

1. **Search existing issues** - Someone may have already reported it
2. **Use latest version** - Bug might already be fixed
3. **Verify it's a bug** - Not a configuration issue

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- nx-terraform version: (run `npm list nx-terraform`)
- Nx version: (run `nx --version`)
- Terraform version: (run `terraform --version`)
- Node version: (run `node --version`)
- Operating system:

## Additional Context
Any other relevant information, logs, or screenshots
```

## Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information
```

## Coding Guidelines

### TypeScript Style

- Use TypeScript for all code
- Prefer `interface` over `type` for object types
- Use explicit return types for functions
- Avoid `any` - use proper types
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Code Organization

- Keep functions small and focused
- Use descriptive variable and function names
- Extract magic numbers/strings to constants
- Group related code together
- Add JSDoc comments for public APIs

### Example

```typescript
/**
 * Detects dependencies between Terraform projects.
 *
 * @param projects - Map of project names to project configurations
 * @param context - Nx plugin context
 * @returns Array of dependencies between projects
 */
export function createDependencies(
  projects: Record<string, ProjectConfiguration>,
  context: CreateDependenciesContext
): RawProjectGraphDependency[] {
  const dependencies: RawProjectGraphDependency[] = [];

  // Detect backend dependencies
  for (const [projectName, config] of Object.entries(projects)) {
    const backendProject = getBackendProject(config);
    if (backendProject) {
      dependencies.push({
        source: projectName,
        target: backendProject,
        type: 'static'
      });
    }
  }

  return dependencies;
}
```

## Release Process

(For maintainers)

1. **Update version** in `packages/nx-terraform/package.json`
2. **Update CHANGELOG.md** with release notes
3. **Create git tag**: `git tag v1.2.3`
4. **Push tag**: `git push origin v1.2.3`
5. **GitHub Actions** automatically publishes to npm
6. **Create GitHub release** with release notes

## Getting Help

- 📖 [Documentation](https://alexpialetski.github.io/nx-terraform/)
- 💬 [GitHub Discussions](https://github.com/alexpialetski/nx-terraform/discussions) - Ask questions
- 🐛 [GitHub Issues](https://github.com/alexpialetski/nx-terraform/issues) - Report bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to nx-terraform! 🎉
