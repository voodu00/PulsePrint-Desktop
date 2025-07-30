# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PulsePrint Desktop is a cross-platform desktop application for monitoring and controlling Bambu Lab 3D printers. It uses:
- **Backend**: Rust with Tauri framework
- **Frontend**: React with TypeScript
- **UI**: shadcn/ui components with Tailwind CSS
- **Database**: SQLite via tauri-plugin-sql
- **Communication**: MQTT protocol over TLS for printer communication
- **API Specification**: https://github.com/Doridian/OpenBambuAPI for Bambu Labs printer protocol (primarily LAN connections)

## Essential Commands

### Frontend Development (from `frontend-react/` directory)
```bash
# Development
yarn dev                    # Start development server
yarn build                  # Production build

# Testing
yarn test                   # Run unit tests (watch mode)
yarn test:integration       # Run integration tests
yarn test:e2e              # Run E2E tests with Playwright

# Code Quality - Run these before committing!
yarn lint                   # ESLint
yarn lint:fix              # ESLint with auto-fix
yarn format                 # Prettier formatting
yarn type-check            # TypeScript type checking
```

### Backend Development (from `src-tauri/` directory)
```bash
# Development
cargo tauri dev            # Run Tauri app in development
cargo tauri build          # Build production app

# Testing
make test                  # Run unit tests
make test-e2e              # Run E2E tests
make test-all              # Run all tests

# Code Quality - Run these before committing!
make fmt                   # Format code with rustfmt
make lint                  # Run Clippy linter
make check                # Type checking

# Development Workflow Commands
make pre-commit            # Fast checks before committing (~30s)
make pre-push              # Comprehensive checks before pushing
make pre-release           # Full validation before release
make pre-push-full         # Frontend + backend validation
```

### Testing Individual Components
```bash
# Frontend: Run specific test file
cd frontend-react && yarn test src/components/PrinterCard.test.tsx

# Backend: Run specific test
cd src-tauri && cargo test test_name

# Run tests in specific module
cd src-tauri && cargo test mqtt::tests
```

## Architecture Overview

### Frontend-Backend Communication
The app uses Tauri's command system for IPC between React frontend and Rust backend:
- Frontend invokes commands via `@tauri-apps/api/tauri`
- Backend exposes commands through `#[tauri::command]` functions in `src-tauri/src/commands.rs`
- State is managed through `MqttState` (Arc<Mutex<HashMap>>) for printer connections

### Key Backend Components
- **mqtt.rs**: Handles MQTT connections, message parsing, and state management for printers
- **commands.rs**: Tauri command handlers for frontend requests and database operations
- **database.rs**: SQLite schema definitions and migrations
- **main.rs**: Application entry point and window management

### Key Frontend Components
- **PrinterContext**: Global state management for printer data
- **DashboardView**: Main view with card/table display modes
- **PrinterCard/PrinterTable**: Display components for printer information
- **services/**: Frontend services for API calls and data transformations

### MQTT Protocol Implementation
- Uses OpenBambuAPI specification (https://github.com/Doridian/OpenBambuAPI) for Bambu Labs printer protocol
- Connects to Bambu Lab printers on port 8883 (TLS) primarily over LAN
- Subscribes to `device/{serial}/report` for printer status updates
- Publishes commands to `device/{serial}/request`
- Handles authentication with access codes and maintains persistent connections

### Database Schema
SQLite database stores:
- Printer configurations (IP, serial, access code)
- User preferences and settings
- Application state

Migrations are handled automatically on startup via `src-tauri/src/database.rs`.

## Development Patterns

### Adding New Tauri Commands
1. Add command function in `src-tauri/src/commands.rs`
2. Register in `tauri::Builder` in `src-tauri/src/lib.rs`
3. Create TypeScript interface in frontend
4. Invoke from frontend using `invoke()` function

### Adding New UI Components
1. Create component in `frontend-react/src/components/`
2. Use shadcn/ui components as base (already configured)
3. Follow existing patterns for styling with Tailwind CSS
4. Add tests alongside component files

### Working with MQTT State
- All MQTT state is centralized in `MqttState`
- Use mutex locks appropriately to avoid deadlocks
- Handle connection failures gracefully with reconnection logic

### Mock Service Mode
The app includes a mock service for development without real printers:
- Toggle via settings or environment variable
- Generates realistic printer data for testing
- Useful for UI development and testing edge cases