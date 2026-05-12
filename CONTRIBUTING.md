# Layer3CDK Contributing Guide

## Welcome

Welcome to the Layer3CDK repository! We are thrilled to have you as a contributor.

Before you start contributing, please read the following guidelines.

## Guidelines

### Branching & PRs

- Fork the repository and create a branch from `main`.
- Use descriptive branch names (e.g., `feat/aurora-construct`, `fix/dynamo-validation`).
- Create a Pull Request (PR) back to `main` with a clear description of your changes.
- All PRs require at least **1 approval** from a maintainer and must pass the **Integration** CI check before merge.

### Coding

- Follow strategies and patterns from the existing constructs. We use TypeScript and OO design patterns.
- Extend the [`BaseConstruct`](src/core/base.construct.ts) class. Override only the methods your construct supports — the base class provides safe no-op defaults.
- This is Infrastructure as Code — it will not run in production. It generates CloudFormation templates.

### Core Package

- The `src/core/` package holds shared code for all constructs (config, naming, env resolution).
- Changes here affect every construct. Be careful — a simple rename can have cascading effects.

### Documentation

- Document your code with JSDoc on exported classes and constructors.
- Every package should have a `README.md` with usage examples.

### Code Style

- Consistent code style is enforced by Prettier and ESLint.
- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `chore:`). A commit-msg hook validates this.
- The pre-commit hook auto-formats and fixes lint issues.

### Testing

- Include unit tests for all new constructs and changes.
- Use `Template` assertions from `aws-cdk-lib/assertions`.
- Coverage thresholds are enforced (75% statements/branches/lines, 60% functions).
- Test your changes locally: `pnpm run build && pnpm run lint && pnpm test`

### Testing in a Real Project

- Once your PR is approved, test the construct in a real CDK project before final merge.
- You can link to your local build using `pnpm link` or install from a branch build.

## CI/CD

### Integration (automatic)

Runs on every PR and push to `main`:

- Format check, lint, and test coverage.
- **Must pass** before merge is allowed.

### Publishing (manual, admin only)

- Publishing to GitHub Packages is triggered manually via `workflow_dispatch` by a maintainer.
- The `npm-publish` environment requires admin approval (configure this in GitHub repo settings).
- Uses pnpm provenance for supply chain security.

## Release Process

1. Ensure all changes are merged to `main` and CI is green.
2. Update the version: `pnpm version <major|minor|patch>`.
3. Update `CHANGELOG.md` following [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).
4. Push with tags: `git push --follow-tags`.
5. A maintainer triggers the **Publish to GitHub Packages** workflow from the Actions tab.

## Branch Protection (for maintainers)

Configure these rules on the `main` branch in GitHub Settings > Branches:

- Require pull request reviews (at least 1)
- Require status checks to pass (`Integration / Build, Lint & Test`)
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

## Versioning

All changes must follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** — incompatible API changes
- **MINOR** — new features (backward-compatible)
- **PATCH** — bug fixes

Breaking changes must be documented in the CHANGELOG with migration guidance.

---

Thank you for contributing to Layer3CDK!
