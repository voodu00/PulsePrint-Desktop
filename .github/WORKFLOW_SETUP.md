# GitHub Actions Setup Guide

This document outlines the setup requirements for the GitHub Actions workflows in this repository.

## Required Repository Secrets

To enable all workflows, the following secrets need to be configured in GitHub repository settings:

### SonarCloud Integration
- `SONAR_TOKEN`: SonarCloud authentication token
  - Generate at: https://sonarcloud.io/account/security
  - Required for: Code Quality workflow
  - Permissions: Execute Analysis

## Workflow Overview

### 1. **code-quality.yml**
- **Triggers**: Push/PR to main/develop branches
- **Purpose**: Code quality analysis, bundle size, complexity analysis
- **Dependencies**: 
  - `SONAR_TOKEN` secret
  - `sonar-project.properties` (✅ exists)
  - Frontend build artifacts

### 2. **codeql-analysis.yml**
- **Triggers**: Push/PR to main/develop, weekly schedule
- **Purpose**: Security vulnerability scanning
- **Dependencies**: None (uses built-in GITHUB_TOKEN)

### 3. **security.yml**
- **Triggers**: Push/PR to main/develop, weekly schedule
- **Purpose**: Dependency security auditing
- **Dependencies**: 
  - `frontend-react/audit-ci.json` (✅ exists)

### 4. **release.yml**
- **Triggers**: Push of version tags (v*)
- **Purpose**: Automated cross-platform builds and GitHub release creation
- **Dependencies**: None (uses built-in GITHUB_TOKEN)
- **Outputs**: 
  - Windows `.msi` installer
  - macOS `.dmg` files (Intel & Apple Silicon)
  - Linux `.AppImage`

## Workflow Features

### Caching Strategy
All workflows implement intelligent caching for:
- Yarn dependencies
- Rust/Cargo dependencies
- Node.js modules

### Error Handling
- Non-blocking security audits (continue on audit failures)
- Comprehensive system dependency installation
- Retry mechanisms for network operations

### Security
- Minimal required permissions
- Secure token handling
- No secret exposure in logs

## Status
- ✅ All workflow files are valid YAML
- ✅ Required configuration files exist
- ⚠️  Requires `SONAR_TOKEN` secret setup
- ✅ All dependencies properly specified

## Release Process

### Creating a New Release

1. **Update version numbers**:
   - `frontend-react/package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. **Create and push a version tag**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **Automated build process**:
   - GitHub Actions will automatically trigger the release workflow
   - Builds will run in parallel for all platforms
   - A draft release will be created with all artifacts

4. **Finalize the release**:
   - Go to GitHub Releases page
   - Edit the draft release
   - Update the changelog
   - Publish the release

### Version Tag Format
- Use semantic versioning: `v{major}.{minor}.{patch}`
- Pre-releases: `v{major}.{minor}.{patch}-{alpha|beta}.{number}`
- Examples: `v1.0.0`, `v0.2.0-beta.1`, `v0.1.0-alpha`