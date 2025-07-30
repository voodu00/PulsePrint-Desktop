# Contributing to PulsePrint Desktop

Thank you for your interest in contributing to PulsePrint Desktop! We welcome contributions from the community and are excited to work with you.

## 🚀 Quick Start

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Set up** the development environment
4. **Create** a feature branch
5. **Make** your changes
6. **Test** thoroughly
7. **Submit** a pull request

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Community Resources](#community-resources)

## Code of Conduct

This project follows a standard code of conduct. Be respectful, inclusive, and professional in all interactions. We're here to build great software together! 🤝

## Development Setup

### Prerequisites

- **Rust** (latest stable) - Install from [rustup.rs](https://rustup.rs/)
- **Node.js** v16+ and **yarn** - For the React frontend
- **Git** - For version control

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pulseprint-desktop-app.git
cd pulseprint-desktop-app

# Install frontend dependencies
cd frontend-react
yarn install
cd ..

# Install Tauri CLI (if not already installed)
cargo install tauri-cli
```

### Running the Development Environment

```bash
# From the project root
cargo tauri dev
```

This starts both the Rust backend and React frontend with hot reload.

## How to Contribute

### 🐛 Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Include detailed information**: OS, version, steps to reproduce
4. **Add screenshots or logs** when helpful

### ✨ Suggesting Features

1. **Check the [roadmap](ROADMAP.md)** to see if it's already planned
2. **Use the feature request template**
3. **Explain the use case** and problem it solves
4. **Consider the scope** - features should align with 3D printer monitoring

### 💻 Contributing Code

We welcome code contributions! Here are areas where help is especially appreciated:

- **Bug fixes** - Always welcome
- **Feature implementation** - Check the roadmap for planned features
- **Testing** - Unit tests, integration tests, E2E tests
- **Documentation** - Code comments, user guides, API docs
- **Performance improvements** - Optimizations and efficiency gains

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/system-tray-support`
- `fix/mqtt-connection-timeout`
- `docs/update-readme`
- `test/add-printer-card-tests`

### Pre-commit Checks

**Always run these before committing:**

```bash
# Fast checks (required before every commit)
cd src-tauri
make pre-commit

# Full validation (before pushing)
make pre-push-full
```

### Commit Messages

Follow conventional commit format:
- `feat: add system tray support`
- `fix: resolve MQTT connection timeout`
- `docs: update installation instructions`
- `test: add printer card component tests`

## Coding Standards

### Rust (Backend)

- **Follow Rust conventions** and use `cargo fmt`
- **Address clippy warnings** with `cargo clippy`
- **Use meaningful names** for functions and variables
- **Add documentation** for public APIs
- **Handle errors explicitly** - avoid unwrap() in production code

```rust
// Good
pub async fn add_printer(&self, config: PrinterConfig) -> Result<()> {
    // Implementation with proper error handling
}

// Avoid
pub async fn add_printer(&self, config: PrinterConfig) {
    // Implementation that panics on errors
}
```

### TypeScript/React (Frontend)

- **Use TypeScript strictly** - avoid `any` types
- **Follow React best practices** - hooks, functional components
- **Use existing UI components** from shadcn/ui
- **Format with Prettier** - `yarn format`
- **Lint with ESLint** - `yarn lint`

```typescript
// Good
interface PrinterCardProps {
  printer: Printer;
  onStatusUpdate: (id: string, status: PrinterStatus) => void;
}

// Avoid
interface PrinterCardProps {
  printer: any;
  onStatusUpdate: Function;
}
```

### Database

- **Use migrations** for schema changes
- **Write reversible migrations** when possible
- **Test migration scripts** before submitting

## Testing Guidelines

### Running Tests

```bash
# Frontend tests
cd frontend-react
yarn test

# Backend tests
cd src-tauri
make test

# E2E tests
cd src-tauri
make test-e2e
```

### Writing Tests

- **Unit tests** for individual functions and components
- **Integration tests** for feature workflows
- **E2E tests** for critical user journeys
- **Mock external dependencies** (MQTT, file system)

### Test Coverage

- Aim for **80%+ coverage** on new code
- **Test edge cases** and error conditions
- **Include both happy path and failure scenarios**

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following coding standards
3. **Add/update tests** for your changes
4. **Run pre-commit checks** to ensure quality
5. **Write a clear PR description** using the template
6. **Link related issues** using "Fixes #123"
7. **Be responsive** to code review feedback

### PR Requirements

- [ ] **Tests pass** - all existing and new tests
- [ ] **Code quality** - passes linting and formatting
- [ ] **Documentation** - updated if needed
- [ ] **No breaking changes** - or clearly documented
- [ ] **Descriptive title** - clear summary of changes

### Code Review Process

1. **Automated checks** run on all PRs
2. **Maintainer review** for code quality and design
3. **Testing feedback** from the community
4. **Merge** once approved and all checks pass

## Issue Guidelines

### Good Issue Reports Include

- **Clear title** that summarizes the problem
- **Detailed description** of the issue or feature
- **Steps to reproduce** (for bugs)
- **Expected vs actual behavior** (for bugs)
- **Environment details** (OS, version, printer model)
- **Screenshots or logs** when helpful

### Issue Labels

We use labels to organize issues:
- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation related
- `good first issue` - Good for newcomers
- `help wanted` - Community help appreciated
- `triage` - Needs initial review

## Community Resources

### Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and community chat
- **Pull Requests** - Code contributions and technical discussions

### Documentation

- **[README.md](README.md)** - Project overview and setup
- **[FEATURES.md](FEATURES.md)** - Current implementation status
- **[ROADMAP.md](ROADMAP.md)** - Future development plans
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

### Development Resources

- **[CLAUDE.md](CLAUDE.md)** - Development guidance and architecture
- **[Tauri Documentation](https://tauri.app/v1/guides/)** - Framework docs
- **[OpenBambuAPI](https://github.com/Doridian/OpenBambuAPI)** - Printer protocol reference

## Getting Help

### New to Open Source?

- Start with issues labeled `good first issue`
- Ask questions in GitHub Discussions
- Read through existing code to understand patterns
- Don't hesitate to ask for help!

### Development Questions?

- **Technical questions** - GitHub Discussions
- **Bug reports** - GitHub Issues with bug template
- **Feature ideas** - GitHub Issues with feature template

### Stuck on Something?

- Check existing issues and discussions
- Review the documentation
- Ask specific questions with context
- Include relevant code snippets and error messages

---

## 🎉 Thank You!

Every contribution makes PulsePrint Desktop better for the entire 3D printing community. Whether you're fixing typos, reporting bugs, or implementing major features - thank you for being part of our open source journey!

**Happy coding!** 🚀

---

*This contributing guide is a living document. If you find ways to improve it, please submit a PR!*