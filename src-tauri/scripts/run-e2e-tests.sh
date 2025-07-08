#!/bin/bash

# PulsePrint Desktop E2E Test Runner
# This script coordinates running e2e tests with proper Tauri app lifecycle management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[E2E]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[E2E]${NC} $1"
}

print_error() {
    echo -e "${RED}[E2E]${NC} $1"
}

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up processes..."
    
    # Kill any running Tauri processes
    pkill -f "cargo tauri dev" || true
    pkill -f "printpulse" || true
    
    # Kill any remaining node processes from the frontend
    pkill -f "react-scripts" || true
    
    # Wait a moment for processes to terminate
    sleep 2
    
    print_status "Cleanup completed"
}

# Set up trap to cleanup on exit
trap cleanup EXIT

# Change to the project root directory
cd "$(dirname "$0")/../.."

print_status "Starting PulsePrint Desktop E2E Tests"

# Step 1: Build the frontend
print_status "Building frontend..."
cd frontend-react
npm run build
if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi

# Step 2: Install Playwright if needed
print_status "Ensuring Playwright is installed..."
npx playwright install --with-deps chromium
if [ $? -ne 0 ]; then
    print_warning "Playwright installation had issues, but continuing..."
fi

# Step 3: Start the Tauri app in development mode
print_status "Starting Tauri application..."
cd ../src-tauri
cargo tauri dev --no-watch &
TAURI_PID=$!

# Wait for the app to start up
print_status "Waiting for Tauri app to start..."
sleep 15

# Check if the Tauri process is still running
if ! kill -0 $TAURI_PID 2>/dev/null; then
    print_error "Tauri app failed to start"
    exit 1
fi

# Step 4: Run the e2e tests
print_status "Running e2e tests..."
cd ../frontend-react

# Run the tests with proper configuration
npx playwright test --config playwright.config.ts
E2E_EXIT_CODE=$?

# Step 5: Generate test report if tests ran
if [ -d "playwright-report" ]; then
    print_status "Test report generated at: frontend-react/playwright-report/index.html"
fi

# Step 6: Check test results
if [ $E2E_EXIT_CODE -eq 0 ]; then
    print_status "All e2e tests passed!"
else
    print_error "Some e2e tests failed (exit code: $E2E_EXIT_CODE)"
fi

# Cleanup will be handled by the trap
exit $E2E_EXIT_CODE 