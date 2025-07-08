# PulsePrint Desktop

A cross-platform desktop application for monitoring and controlling Bambu Lab 3D printers, built with Tauri, Rust, and React.

## Features

- **Real-time Monitoring**: Live temperature, progress, and status updates via MQTT
- **Printer Control**: Pause, resume, and stop print jobs remotely
- **Multi-printer Support**: Connect and monitor multiple printers simultaneously
- **Statistics Overview**: View printing statistics and printer health
- **Settings Management**: Configure notifications, display options, and system preferences
- **Dual Service Support**: Toggle between mock data and real MQTT for testing
- **Persistent Configuration**: Printer configurations saved locally and restored on startup

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

### Frontend (React/TypeScript)

- **Component-based Architecture**: Modular UI components
- **shadcn/ui**: Modern UI component library
- **TauriMqttService**: Frontend service for backend communication
- **localStorage**: Persistent configuration storage

## Project Structure

```
pulseprint-desktop/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Application entry point
│   │   ├── mqtt.rs           # MQTT service and state management
│   │   └── lib.rs            # Tauri commands and events
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
├── frontend-react/            # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── services/         # Frontend services
│   │   └── App.tsx           # Main application component
│   ├── package.json          # Node.js dependencies
│   └── tailwind.config.js    # Tailwind CSS configuration
└── README.md                 # This file
```

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

### Development Tips

- Use the mock service toggle in settings for testing UI without a real printer
- Check the console for detailed MQTT message logging
- The app avoids frequent polling to prevent hardware lag on P1P printers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Acknowledgments

- Built with [Tauri](https://tauri.app/) for cross-platform desktop development
- Uses [OpenBambuAPI](https://github.com/Doridian/OpenBambuAPI) documentation for printer communication
- UI components from [shadcn/ui](https://ui.shadcn.com/)
