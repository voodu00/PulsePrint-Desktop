# CI/CD Setup for PrintPulse Desktop

This directory contains the GitHub Actions workflows and configuration files for the PrintPulse Desktop application's CI/CD pipeline.

## 🚀 Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**

- **Frontend Code Quality**: ESLint, Prettier, TypeScript compilation, Unit tests
- **Rust Code Quality**: Clippy, rustfmt, Rust tests, Build verification
- **Build Test**: Cross-platform build verification (Ubuntu, Windows, macOS)

### 2. Security Audit (`security.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests, Weekly schedule

**Jobs:**

- **Frontend Security**: npm audit, vulnerability scanning
- **Rust Security**: cargo audit for known vulnerabilities
- **Dependency Review**: GitHub's dependency review for PRs

### 3. Code Quality (`code-quality.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**

- **SonarCloud Analysis**: Code quality metrics and security analysis
- **Complexity Analysis**: Code complexity reporting
- **Bundle Analysis**: Frontend bundle size analysis

### 4. Integration Tests (`integration-tests.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**

- **Integration Tests**: Cross-platform Tauri integration tests
- **E2E Tests**: End-to-end testing with Playwright (planned)

### 5. Dependabot Auto-merge (`dependabot-auto-merge.yml`)

**Triggers:** Dependabot PRs

**Features:**

- Auto-approves and merges minor/patch updates
- Requires manual review for major updates
- Adds appropriate labels and comments

## 🔧 Configuration Files

### Frontend (React/TypeScript)

- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to exclude from formatting
- `audit-ci.json` - Vulnerability scanning configuration

### Backend (Rust/Tauri)

- `rustfmt.toml` - Rust formatting configuration
- `clippy.toml` - Clippy linting rules

### Analysis Tools

- `sonar-project.properties` - SonarCloud configuration
- `dependabot.yml` - Automated dependency updates

## 🛠️ Setup Instructions

### 1. Repository Secrets

Add these secrets to your GitHub repository:

```
SONAR_TOKEN          # SonarCloud token for code analysis
CODECOV_TOKEN        # Codecov token for coverage reporting (optional)
```

### 2. SonarCloud Setup

1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Import your repository
3. Update `sonar-project.properties`:
   - Replace `your-org-name` with your SonarCloud organization
   - Update project key if needed
4. Add the `SONAR_TOKEN` to repository secrets

### 3. Dependabot Configuration

Update `.github/dependabot.yml`:

- Replace `your-username` with your GitHub username
- Adjust schedules and limits as needed

### 4. Branch Protection Rules

Recommended branch protection for `main`:

- Require status checks to pass before merging
- Require branches to be up to date before merging
- Required status checks:
  - `Frontend Code Quality`
  - `Rust Code Quality`
  - `Build Test (ubuntu-latest)`
  - `Security Audit`

## 📊 Quality Gates

### Frontend

- ✅ ESLint passes with max 0 warnings
- ✅ Prettier formatting is consistent
- ✅ TypeScript compilation succeeds
- ✅ Unit tests pass with coverage reporting
- ✅ No high/critical vulnerabilities

### Rust/Tauri

- ✅ Clippy passes with no warnings
- ✅ rustfmt formatting is consistent
- ✅ All tests pass
- ✅ Build succeeds on all platforms
- ✅ No known security vulnerabilities

### Integration

- ✅ Cross-platform builds succeed
- ✅ Application starts without errors
- ✅ Integration tests pass

## 🔍 Monitoring

### Coverage Reports

- Frontend coverage is uploaded to Codecov
- Reports are generated for each PR
- Coverage trends are tracked over time

### Security Scanning

- Weekly automated security audits
- Dependency vulnerability scanning
- SonarCloud security hotspots

### Code Quality

- SonarCloud quality gate must pass
- Code complexity is monitored
- Bundle size is tracked

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
- [ ] Implement E2E tests with Playwright
- [ ] Add deployment workflows (when ready)
- [ ] Integrate with additional security tools
- [ ] Add automated changelog generation
- [ ] Implement semantic versioning automation

## 🤝 Contributing

When contributing to this project:

1. Ensure all CI checks pass
2. Follow the established code style
3. Add tests for new features
4. Update documentation as needed

The CI/CD pipeline will automatically run on your PRs and provide feedback on code quality, security, and functionality.
