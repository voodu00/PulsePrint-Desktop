# CI/CD Setup for PulsePrint Desktop

This directory contains the GitHub Actions workflows and configuration files for the PulsePrint Desktop application's CI/CD pipeline.

## 🚀 Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**

- **Frontend**: ESLint, Prettier, TypeScript compilation, Unit tests with coverage, Codecov upload, Build
- **Backend**: rustfmt, Clippy, Rust tests, Release build
- **Integration**: E2E tests (Playwright) and Rust integration tests

### 2. Dependabot Auto-merge (`dependabot-auto-merge.yml`)

**Triggers:** Dependabot PRs

**Features:**

- Auto-approves and merges minor/patch updates
- Requires manual review for major updates
- Adds appropriate labels and comments

## 🚫 Disabled Workflows

The following workflows have been disabled for self-hosted runners without organization access:

### Security Audit (`security.yml.disabled`)

- **Frontend Security**: npm audit, vulnerability scanning
- **Rust Security**: cargo audit for known vulnerabilities
- **Dependency Review**: GitHub's dependency review for PRs

### Code Quality (`code-quality.yml.disabled`)

- **Complexity Analysis**: Code complexity reporting (disabled)
- **Bundle Analysis**: Frontend bundle size analysis (disabled)

**Note**: SonarCloud analysis is available but currently commented out in the main CI workflow.

### CodeQL Analysis (`codeql-analysis.yml.disabled`)

- **Security Scanning**: GitHub's CodeQL security analysis
- **Vulnerability Detection**: Automated security vulnerability detection

## 🔧 Configuration Files

### Frontend (React/TypeScript)

- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to exclude from formatting

### Backend (Rust/Tauri)

- `rustfmt.toml` - Rust formatting configuration
- `clippy.toml` - Clippy linting rules

### CI/CD

- `dependabot.yml` - Automated dependency updates

### Disabled Analysis Tools

- `sonar-project.properties` - SonarCloud configuration (disabled)
- `audit-ci.json` - Vulnerability scanning configuration (disabled)

## 🛠️ Setup Instructions

### 1. Repository Secrets

Add these secrets to your GitHub repository:

```
CODECOV_TOKEN        # Codecov token for coverage reporting
# SONAR_TOKEN        # SonarCloud token (commented out for now)
```

### 2. Re-enabling Code Scanning (When Repository Goes Public)

To re-enable code scanning when the repository becomes public or when organization access is available:

1. **CodeQL Analysis**: Rename `codeql-analysis.yml.disabled` to `codeql-analysis.yml`
2. **Security Audit**: Rename `security.yml.disabled` to `security.yml`
3. **Code Quality**: Rename `code-quality.yml.disabled` to `code-quality.yml`
4. **SonarCloud** (Currently Commented Out):
   - SonarCloud analysis is available but commented out in the main CI workflow
   - To enable: uncomment the SonarCloud step in `ci.yml` and add `SONAR_TOKEN` to repository secrets
   - Configuration is in `sonar-project.properties`

### 3. Dependabot Configuration

Update `.github/dependabot.yml`:

- Replace `your-username` with your GitHub username
- Adjust schedules and limits as needed

### 4. Branch Protection Rules

Recommended branch protection for `main`:

- Require status checks to pass before merging
- Require branches to be up to date before merging
- Required status checks:
  - `Frontend`
  - `Backend`
  - `Integration & E2E Tests`

## 📊 Quality Gates

### Frontend

- ✅ ESLint passes with max 50 warnings
- ✅ Prettier formatting is consistent
- ✅ TypeScript compilation succeeds
- ✅ Unit tests pass with coverage reporting

### Rust/Tauri

- ✅ Clippy passes with no warnings
- ✅ rustfmt formatting is consistent
- ✅ All tests pass
- ✅ Build succeeds on all platforms

### Integration

- ✅ Cross-platform builds succeed
- ✅ Application starts without errors
- ✅ Integration tests pass

## 🔍 Monitoring

### Build Status

- All builds must pass on self-hosted runners
- Cross-platform compatibility is verified
- Integration and E2E tests must pass

### Coverage Reports

- Frontend coverage is uploaded to Codecov
- Reports are generated for each PR
- Coverage trends are tracked over time

### Code Quality

- ESLint and Prettier enforce code standards
- TypeScript compilation ensures type safety
- Rust clippy and rustfmt maintain code quality

## 🚨 Troubleshooting

### Common Issues

**ESLint Errors:**

```bash
cd frontend-react
yarn lint:fix
```

**Prettier Formatting:**

```bash
cd frontend-react
yarn format
```

**Rust Formatting:**

```bash
cd src-tauri
cargo fmt
```

**Clippy Warnings:**

```bash
cd src-tauri
cargo clippy --fix
```

### Workflow Failures

1. Check the specific job that failed
2. Review the error logs
3. Run the same commands locally
4. Fix issues and push again

## 📈 Future Enhancements

- [ ] Add performance benchmarking
- [ ] Add deployment workflows (when ready)
- [ ] Add automated changelog generation
- [ ] Re-enable code scanning when repository goes public
- [ ] Add automated security audits when organization access is available
- [ ] Implement semantic versioning automation

## 🤝 Contributing

When contributing to this project:

1. Ensure all CI checks pass
2. Follow the established code style
3. Add tests for new features
4. Update documentation as needed

The CI/CD pipeline will automatically run on your PRs and provide feedback on code quality, security, and functionality.
