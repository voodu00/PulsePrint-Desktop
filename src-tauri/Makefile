# Makefile for PulsePrint Desktop Rust/Tauri Development

.PHONY: help test lint lint-fix fmt fmt-check check build clean dev all-checks pre-commit pre-commit-full pre-push pre-release release-check check-frontend pre-push-full pre-release-full

# Default target
help:
	@echo "PulsePrint Desktop - Rust/Tauri Commands"
	@echo "========================================"
	@echo ""
	@echo "Development Commands:"
	@echo "  make test        - Run unit tests"
	@echo "  make test-e2e    - Run e2e setup tests"
	@echo "  make test-e2e-full - Run full e2e tests with Tauri app"
	@echo "  make test-all    - Run all tests (unit + e2e)"
	@echo "  make lint        - Run Clippy linter"
	@echo "  make fmt         - Format code with rustfmt"
	@echo "  make fmt-check   - Check formatting without changes"
	@echo "  make check       - Type check without building"
	@echo "  make build       - Build the project"
	@echo "  make build-release - Build for production"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make dev         - Run Tauri app in development"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  make all-checks  - Run all quality checks (fmt, lint, test, check)"
	@echo "  make ci          - Run CI-style checks (without e2e)"
	@echo "  make ci-full     - Run full CI checks including e2e tests"
	@echo ""
	@echo "Pre-Commit & Release:"
	@echo "  make pre-commit  - Fast checks before committing (~30s)"
	@echo "  make pre-commit-full - Thorough checks including tests (~2-3min)"
	@echo "  make pre-push    - Comprehensive checks before pushing"
	@echo "  make pre-release - Full validation before release"
	@echo "  make release-check - Validate everything for production release"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs        - Generate and open documentation"
	@echo ""

# Test commands
test:
	@echo "🧪 Running tests..."
	cargo test

test-verbose:
	@echo "🧪 Running tests with verbose output..."
	cargo test -- --nocapture

test-e2e:
	@echo "🧪 Running e2e tests..."
	cargo test --test e2e_integration

test-e2e-verbose:
	@echo "🧪 Running e2e tests with verbose output..."
	cargo test --test e2e_integration -- --nocapture

test-e2e-full:
	@echo "🧪 Running full e2e tests (including ignored tests)..."
	cargo test --test e2e_integration -- --ignored --nocapture

test-all:
	@echo "🧪 Running all tests..."
	cargo test
	@echo "🧪 Running e2e tests..."
	cargo test --test e2e_integration

# Linting
lint:
	@echo "🔍 Running Clippy linter..."
	cargo clippy --all-targets --all-features -- -D warnings

# Linting with auto-fix
lint-fix:
	@echo "🔧 Running Clippy with auto-fix..."
	cargo clippy --all-targets --all-features --fix --allow-dirty -- -D warnings

# Formatting
fmt:
	@echo "✨ Formatting code..."
	cargo fmt

fmt-check:
	@echo "📝 Checking code formatting..."
	cargo fmt -- --check

# Type checking
check:
	@echo "🔍 Type checking..."
	cargo check

# Building
build:
	@echo "🔨 Building project..."
	cargo build

build-release:
	@echo "🚀 Building for production..."
	cargo build --release

# Tauri specific
dev:
	@echo "🚀 Starting Tauri development server..."
	cargo tauri dev

tauri-build:
	@echo "📦 Building Tauri app..."
	cargo tauri build

# Documentation
docs:
	@echo "📚 Generating documentation..."
	cargo doc --open --document-private-items

# Cleanup
clean:
	@echo "🧹 Cleaning build artifacts..."
	cargo clean

# Quality assurance
all-checks: fmt-check lint check test
	@echo "✅ All quality checks passed!"

ci: fmt-check lint check test build
	@echo "✅ CI checks completed successfully!"

ci-full: fmt-check lint check test build test-e2e
	@echo "✅ Full CI checks with e2e tests completed successfully!"

# Install dependencies (for CI)
install-deps:
	@echo "📦 Installing Rust dependencies..."
	rustup update
	rustup component add clippy rustfmt

# Pre-commit workflow - Fast checks for local development
pre-commit: fmt-check lint check
	@echo "✅ Pre-commit checks passed! Safe to commit."
	@echo ""
	@echo "💡 Next steps:"
	@echo "   git add ."
	@echo "   git commit -m 'your commit message'"
	@echo ""
	@echo "🔍 For more thorough validation, consider:"
	@echo "   make pre-commit-full    # Includes unit + integration tests"

# Pre-push workflow - More comprehensive checks before pushing
pre-push: fmt-check lint check test build
	@echo "✅ Pre-push checks passed! Safe to push."
	@echo ""
	@echo "💡 Next steps:"
	@echo "   git push origin your-branch"

# Pre-release workflow - Full validation including e2e tests
pre-release: fmt-check lint check test build test-e2e-full
	@echo "✅ Pre-release validation completed!"
	@echo ""
	@echo "💡 Ready for release! Consider running:"
	@echo "   make release-check    # Final production validation"
	@echo "   make tauri-build      # Build production binaries"

# Release validation - Everything needed for production
release-check: install-deps fmt-check lint check test build test-e2e-full tauri-build
	@echo "🎉 Release validation completed successfully!"
	@echo ""
	@echo "✅ All checks passed:"
	@echo "   • Code formatting ✓"
	@echo "   • Linting ✓" 
	@echo "   • Type checking ✓"
	@echo "   • Unit tests ✓"
	@echo "   • Build verification ✓"
	@echo "   • E2E tests ✓"
	@echo "   • Production build ✓"
	@echo ""
	@echo "🚀 Ready for production release!"

# Frontend integration checks
check-frontend:
	@echo "🔍 Checking frontend integration..."
	@cd ../frontend-react && yarn build
	@cd ../frontend-react && yarn test --watchAll=false
	@echo "✅ Frontend checks completed!"

# Combined frontend + backend pre-push
pre-push-full: check-frontend pre-push
	@echo "✅ Full stack pre-push validation completed!"

# Combined frontend + backend pre-release  
pre-release-full: check-frontend pre-release
	@echo "✅ Full stack pre-release validation completed!" 