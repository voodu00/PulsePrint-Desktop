# Development Guide

## Pre-Push Checklist

Run these commands before pushing any changes to ensure code quality and functionality.

### Backend Validation

```bash
cd src-tauri

# 1. Format check
cargo fmt --check

# 2. Linting
cargo clippy -- -D warnings

# 3. Run tests
cargo test

# 4. Build check
cargo build
```

### Frontend Validation

```bash
cd frontend-react

# 1. Linting
yarn lint

# 2. Format check
yarn format:check

# 3. Type checking
yarn type-check

# 4. Run tests
yarn test --watchAll=false

# 5. Build check
yarn build
```

### Integration Tests

```bash
cd frontend-react

# Run integration tests
yarn test:integration
```

**Total time: ~3-5 minutes**

---

## Pre-Release Checklist

Run these commands before creating a release to ensure production readiness.

### Backend Validation

```bash
cd src-tauri

# 1. Format check
cargo fmt --check

# 2. Linting
cargo clippy -- -D warnings

# 3. Run all tests
cargo test

# 4. Release build
cargo build --release
```

### Frontend Validation

```bash
cd frontend-react

# 1. Linting
yarn lint

# 2. Format check
yarn format:check

# 3. Type checking
yarn type-check

# 4. Run unit tests
yarn test --watchAll=false

# 5. Production build
yarn build
```

### Integration Tests

```bash
cd frontend-react

# Run integration tests
yarn test:integration
```

### End-to-End Tests

```bash
cd src-tauri

# Run full e2e test suite
make test-e2e
```

### Final Production Build

```bash
cd src-tauri

# Create production Tauri app
cargo tauri build
```

**Total time: ~15-20 minutes**

---

## Quick Fixes

### Auto-Fix Issues

```bash
# Frontend fixes
cd frontend-react
yarn lint --fix
yarn format

# Backend fixes
cd src-tauri
cargo fmt
```

### Clean Build (if builds fail)

```bash
# Frontend clean
cd frontend-react
rm -rf node_modules yarn.lock
yarn install

# Backend clean
cd src-tauri
cargo clean
cargo build
```

---

## Individual Command Reference

### Frontend Commands

- `yarn dev` or `yarn start` - Start development server
- `yarn build` - Production build
- `yarn test` - Run tests in watch mode
- `yarn test --watchAll=false` - Run tests once
- `yarn test:integration` - Run integration tests
- `yarn lint` - Check linting
- `yarn lint --fix` - Fix linting issues
- `yarn format` - Format code
- `yarn format:check` - Check formatting
- `yarn type-check` - Check TypeScript types

### Backend Commands

- `cargo tauri dev` - Start development app (requires frontend dev server running first)
- `cargo tauri build` - Production build
- `cargo test` - Run tests
- `cargo fmt` - Format code
- `cargo fmt --check` - Check formatting
- `cargo clippy` - Run linter
- `cargo clippy -- -D warnings` - Run linter with warnings as errors
- `cargo build` - Development build
- `cargo build --release` - Release build

### E2E Commands

- `make test-e2e` - Run all E2E tests (from src-tauri directory)
- `yarn playwright test` - Run Playwright tests directly (requires app running)
- `yarn playwright test --ui` - Run with UI mode
- `yarn playwright test --debug` - Debug mode

---

## Troubleshooting

### Common Issues

**"yarn command not found"**

```bash
npm install -g yarn
```

**"cargo command not found"**

```bash
# Install Rust: https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Frontend build fails**

```bash
cd frontend-react
rm -rf node_modules yarn.lock
yarn install
```

**Backend build fails**

```bash
cd src-tauri
cargo clean
cargo build
```

**E2E tests fail with connection refused**

```bash
# E2E tests need the full Tauri app running
cd src-tauri
make test-e2e  # This handles app startup
```

**Type checking fails**

```bash
cd frontend-react
yarn type-check  # Shows detailed errors
```

**Linting fails**

```bash
cd frontend-react
yarn lint --fix  # Auto-fixes most issues
```

---

## IDE Integration

### VS Code

**Recommended Extensions:**

- Rust Analyzer
- Tauri
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

**Settings for auto-format on save:**

```json
{
	"editor.formatOnSave": true,
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	}
}
```

---

## Development Workflow

### Starting the Development Environment

**Terminal 1 (Frontend):**

```bash
cd frontend-react
yarn dev
```

**Terminal 2 (Tauri App):**

```bash
cd src-tauri
cargo tauri dev
```

The frontend dev server must be running on `http://localhost:3000` before starting the Tauri app.

---

## Git Workflow

### Before Every Push

```bash
# Quick validation script
cd src-tauri
cargo fmt --check && cargo clippy -- -D warnings && cargo test && cargo build

cd ../frontend-react
yarn lint && yarn format:check && yarn type-check && yarn test --watchAll=false && yarn build && yarn test:integration
```

### Before Every Release

```bash
# Full validation script
cd src-tauri
cargo fmt --check && cargo clippy -- -D warnings && cargo test && cargo build --release

cd ../frontend-react
yarn lint && yarn format:check && yarn type-check && yarn test --watchAll=false && yarn build && yarn test:integration

cd ../src-tauri
make test-e2e && cargo tauri build
```

---

## Performance Guidelines

- **Pre-push checks**: Should complete in under 5 minutes
- **Pre-release checks**: Should complete in under 20 minutes
- If commands are taking longer, consider cleaning build artifacts
- Use `cargo build` for development, `cargo build --release` only for releases
- E2E tests are the slowest part - run them only before releases unless debugging UI issues
