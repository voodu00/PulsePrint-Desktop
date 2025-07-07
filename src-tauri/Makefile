# Makefile for PulsePrint Desktop Rust/Tauri Development

.PHONY: help test lint fmt check build clean dev all-checks

# Default target
help:
	@echo "PulsePrint Desktop - Rust/Tauri Commands"
	@echo "========================================"
	@echo ""
	@echo "Development Commands:"
	@echo "  make test        - Run all tests"
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
	@echo "  make ci          - Run CI-style checks"
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

# Linting
lint:
	@echo "🔍 Running Clippy linter..."
	cargo clippy --all-targets --all-features -- -D warnings

lint-fix:
	@echo "🔧 Running Clippy with automatic fixes..."
	cargo clippy --fix --allow-dirty --allow-staged

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

# Install dependencies (for CI)
install-deps:
	@echo "📦 Installing Rust dependencies..."
	rustup update
	rustup component add clippy rustfmt 