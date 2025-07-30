# PulsePrint Desktop

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Alpha Release](https://img.shields.io/badge/status-alpha-orange.svg)](CHANGELOG.md)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8DB.svg)](https://tauri.app/)

A cross-platform desktop application for monitoring and controlling Bambu Lab 3D printers. Built with Tauri, Rust, and React for performance, security, and native desktop integration.

> 🚀 **Alpha Release**: PulsePrint Desktop is in active development. Core features are stable and ready for community testing. See [CHANGELOG.md](CHANGELOG.md) for verified features and [features.md](features.md) for the complete roadmap.

## ✨ Key Features

### 🖥️ Multi-Printer Dashboard  
- **Real-time MQTT Monitoring** - Live temperature, progress, and status updates via secure MQTT over TLS
- **Dual View Support** - Switch between card view and table view with persistent preferences
- **Multi-printer Support** - Connect and monitor 1-5+ printers simultaneously
- **Smart Status Detection** - Intelligent status recognition (idle, printing, paused, error, offline)

### 🎛️ Printer Control & Management
- **Remote Control** - Pause, resume, and stop print jobs remotely
- **Printer Configuration** - Add printers manually or import from JSON, CSV, YAML, TXT files
- **Temperature Monitoring** - Real-time hotend, bed, and chamber temperature displays
- **Progress Tracking** - Detailed layer information, completion percentage, and time remaining

### 🎨 User Experience
- **Dark/Light Mode** - Theme switching with system preference support
- **Responsive Design** - Optimized layouts for various screen sizes and printer counts
- **Real-time Updates** - Live visual indicators with color-coded status and flash animations
- **Mock Service Mode** - Development and testing mode with simulated printer data

### 💾 Data & Configuration
- **SQLite Database** - Persistent storage for all settings and printer configurations
- **Cross-platform Storage** - Platform-specific app data directories with automatic migrations
- **Settings Persistence** - User preferences maintained across application sessions
- **Import/Export Support** - Backup and share printer configurations in multiple formats

## Prerequisites

- **Rust**: Install from [rustup.rs](https://rustup.rs/)
- **Node.js**: Version 16 or higher
- **npm** or **yarn**: For managing frontend dependencies

## Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd pulseprint-desktop
   ```

2. **Install frontend dependencies**:

   ```bash
   cd frontend-react
   npm install
   cd ..
   ```

3. **Install Tauri CLI** (if not already installed):
   ```bash
   cargo install tauri-cli
   ```

## Development

> 📋 **Quick Start**: See [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) for comprehensive development workflows, pre-commit checks, and release procedures.

### Before You Commit

```bash
cd src-tauri
make pre-commit    # Fast checks (~30s)
```

### Before You Push

```bash
cd src-tauri
make pre-push-full    # Full validation (~3min)
```

### Running the Development Server

```bash
# From the project root
cargo tauri dev
```

This will start both the Rust backend and React frontend in development mode with hot reload.

### Building for Production

```bash
# Build the application
cargo tauri build
```

Built applications will be available in `src-tauri/target/release/bundle/`.

### Testing

```bash
# Quick tests
cd src-tauri && make test

# Full E2E validation (before releases)
cd src-tauri && make pre-release-full
```

For detailed testing information, see the [E2E Test Coverage Summary](./frontend-react/tests/e2e/COVERAGE_SUMMARY.md).

## Configuration

### Adding Printers

1. Open the application
2. Navigate to Settings
3. Add printer with:
   - **Name**: Display name for the printer
   - **IP Address**: Local IP address of your Bambu Lab printer
   - **Access Code**: Found in printer settings under "LAN Mode"
   - **Serial Number**: Printer's serial number

### MQTT Connection

The application connects to Bambu Lab printers using MQTT over port 8883 with TLS encryption. Ensure your printer has:

- LAN Mode enabled
- Access Code configured
- Network connectivity to your computer

## Architecture

### Backend (Rust/Tauri)

- **MQTT Service**: Handles connections to Bambu Lab printers
- **State Management**: Accumulates and processes printer data over time
- **Commands**: Provides printer control functionality
- **Events**: Real-time updates to frontend via Tauri's event system
- **Database**: SQLite database for persistent storage of settings and configurations

### Frontend (React/TypeScript)

- **Component-based Architecture**: Modular UI components
- **shadcn/ui**: Modern UI component library
- **TauriMqttService**: Frontend service for backend communication
- **Database Storage**: All settings and configurations stored in SQLite via tauri-plugin-sql

## Project Structure

```
pulseprint-desktop/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Application entry point
│   │   ├── mqtt.rs           # MQTT service and state management
│   │   ├── commands.rs       # Tauri commands and database operations
│   │   ├── database.rs       # Database schema and migrations
│   │   └── lib.rs            # Application setup and configuration
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
├── frontend-react/            # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── services/         # Frontend services
│   │   ├── contexts/         # React contexts for state management
│   │   └── App.tsx           # Main application component
│   ├── package.json          # Node.js dependencies
│   └── tailwind.config.js    # Tailwind CSS configuration
└── README.md                 # This file
```

## Data Storage

The application uses a **SQLite database** for all persistent storage:

- **Settings**: User preferences, view modes, notification settings
- **Printer Configurations**: Saved printer connections and settings
- **Database Location**: Platform-specific app data directory
  - macOS: `~/Library/Application Support/PrintPulse/`
  - Windows: `%APPDATA%/PrintPulse/`
  - Linux: `~/.local/share/PrintPulse/`

### Database Schema

- `user_preferences`: Key-value storage for application settings
- `printers`: Printer configurations and connection details
- Automatic migrations ensure schema updates

## Troubleshooting

### Common Issues

1. **Printer shows as "idle" after restart**:

   - This is normal behavior - the app builds state from incremental MQTT updates
   - Wait a few moments for the printer to send status updates
   - The app requests initial status when connecting

2. **Connection issues**:

   - Verify printer IP address and access code
   - Ensure LAN Mode is enabled on the printer
   - Check network connectivity between computer and printer

3. **Build errors**:

   - Ensure Rust and Node.js are properly installed
   - Try cleaning build artifacts: `cargo clean` and `npm clean-install`

4. **Settings not persisting**:
   - Check app data directory permissions
   - Database file should be created automatically on first run
   - Settings are stored in SQLite database, not browser storage

### Development Tips

- Use the mock service toggle in settings for testing UI without a real printer
- Check the console for detailed MQTT message logging
- The app avoids frequent polling to prevent hardware lag on P1P printers
- Database operations are handled through tauri-plugin-sql for type safety

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (including database migrations)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Open Source

PulsePrint Desktop is fully open source with no feature restrictions. We believe in transparent development and community-driven innovation for the 3D printing ecosystem.

## Acknowledgments

- Built with [Tauri](https://tauri.app/) for cross-platform desktop development
- Uses [OpenBambuAPI](https://github.com/Doridian/OpenBambuAPI) documentation for printer communication
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database operations via [tauri-plugin-sql](https://github.com/tauri-apps/plugins-workspace)
