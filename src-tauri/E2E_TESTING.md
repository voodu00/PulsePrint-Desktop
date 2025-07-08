# E2E Testing Setup for PulsePrint Desktop

This document describes how to run end-to-end (e2e) tests for the PulsePrint Desktop application using Cargo and Playwright.

## Overview

The e2e testing setup includes:

- **Network mocking** to prevent external network calls
- **MQTT mocking** to simulate printer responses
- **Coordinated app lifecycle** management
- **Cargo integration** for running tests from the Rust build system

## Prerequisites

1. **Node.js and npm** - Required for running the React frontend
2. **Playwright** - Will be automatically installed when running tests
3. **Cargo and Rust** - Required for building and running the Tauri app

## Running E2E Tests

### Quick Setup Tests

These tests verify that the e2e testing infrastructure is properly set up:

```bash
# Run basic e2e setup tests
make test-e2e

# Or directly with cargo
cargo test --test e2e_integration
```

### Full E2E Tests

These tests run the complete e2e test suite with a real Tauri app:

```bash
# Run full e2e tests (takes longer, requires full environment)
make test-e2e-full

# Or directly with cargo
cargo test --test e2e_integration -- --ignored --nocapture
```

### Individual Test Commands

```bash
# Test that Tauri app can be built
cargo test --test e2e_integration test_tauri_app_startup

# Test that frontend can be built
cargo test --test e2e_integration test_frontend_build

# Test that Playwright is configured
cargo test --test e2e_integration test_playwright_config

# Test that e2e script exists and is executable
cargo test --test e2e_integration test_e2e_script_exists

# Run the full e2e test suite
cargo test --test e2e_integration test_run_e2e_tests -- --ignored --nocapture
```

## Test Structure

### Network Isolation

All e2e tests are configured to block external network requests to ensure:

- Tests don't depend on internet connectivity
- Tests don't make actual calls to external services
- Tests run consistently in CI/CD environments

The network mocking allows:

- `http://localhost` requests (for the app)
- `file://` requests (for local resources)
- `tauri://` requests (for Tauri-specific resources)

### MQTT Mocking

MQTT connections are mocked to simulate printer responses without requiring actual printers:

- Mock printer status responses
- Mock temperature data
- Mock print progress information

### Test Helpers

Common test operations are abstracted into helper functions:

- `setupNetworkMocking()` - Configures network request blocking
- `setupMqttMocking()` - Configures MQTT response mocking
- `waitForAppReady()` - Waits for the app to load completely
- `addTestPrinter()` - Adds a test printer without network calls
- `removeTestPrinter()` - Removes a test printer
- `navigateToSettings()` - Navigates to the settings page
- `toggleSetting()` - Toggles a setting on/off

## File Structure

```
src-tauri/
├── tests/
│   └── e2e_integration.rs     # Cargo integration tests
├── scripts/
│   └── run-e2e-tests.sh       # E2E test coordination script
└── Makefile                   # Build and test commands

frontend-react/
├── tests/
│   └── e2e/
│       ├── test-helpers.ts    # Common test utilities
│       ├── basic-app.spec.ts  # Basic app functionality tests
│       └── debug-printer-add.spec.ts  # Printer management tests
└── playwright.config.ts       # Playwright configuration
```

## Adding New E2E Tests

1. Create a new `.spec.ts` file in `frontend-react/tests/e2e/`
2. Import the test helpers: `import { setupNetworkMocking, waitForAppReady } from './test-helpers';`
3. Set up network mocking in `beforeEach`:
   ```typescript
   test.beforeEach(async ({ page }) => {
   	await setupNetworkMocking(page)
   })
   ```
4. Use helper functions for common operations
5. Ensure tests are isolated and don't depend on external state

## Troubleshooting

### Tests Timing Out

If tests are timing out:

- Increase timeout values in `playwright.config.ts`
- Check if the Tauri app is starting properly
- Verify that network requests aren't being blocked incorrectly

### App Not Starting

If the Tauri app fails to start:

- Check that the frontend builds successfully
- Verify that all dependencies are installed
- Check the Tauri configuration in `tauri.conf.json`

### Network Requests Failing

If legitimate requests are being blocked:

- Update the network mocking configuration in `test-helpers.ts`
- Add additional allowed URL patterns
- Check the browser console for blocked requests

## CI/CD Integration

The e2e tests can be integrated into CI/CD pipelines:

```bash
# Run all checks including e2e tests
make ci-full

# Run only setup tests (faster, for basic validation)
make ci
```

## Performance Considerations

- **Setup tests** run quickly and verify the testing infrastructure
- **Full e2e tests** take longer as they start the complete application
- Use `make test-e2e` for quick validation during development
- Use `make test-e2e-full` for comprehensive testing before releases
