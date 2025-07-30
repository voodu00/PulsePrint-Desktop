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