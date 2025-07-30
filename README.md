# PulsePrint Desktop

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Alpha Release](https://img.shields.io/badge/status-alpha-orange.svg)](CHANGELOG.md)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8DB.svg)](https://tauri.app/)

A cross-platform desktop application for monitoring and controlling Bambu Lab 3D printers. Built with Tauri, Rust, and React for performance, security, and native desktop integration.

> 🚀 **Alpha Release**: PulsePrint Desktop is in active development. Core features are stable and ready for community testing. See [CHANGELOG.md](CHANGELOG.md) for verified features, [FEATURES.md](FEATURES.md) for current implementation status, and [ROADMAP.md](ROADMAP.md) for future development plans.

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

## 🚀 Installation

### Download for Your Platform

**Alpha releases are available on GitHub:**

[![Download Latest](https://img.shields.io/github/v/release/voodu00/pulseprint-desktop-app?include_prereleases&label=Download%20Alpha&style=for-the-badge)](https://github.com/voodu00/pulseprint-desktop-app/releases)

- **Windows**: Download the `.msi` installer
- **macOS**: Download the `.dmg` file  
- **Linux**: Download the `.AppImage` file

### Quick Setup

1. **Download** the installer for your platform
2. **Install** the application (double-click installer)
3. **Launch** PulsePrint Desktop
4. **Add your printer** in Settings with:
   - Printer name and IP address
   - Access code from printer's LAN settings
   - Serial number

## 🖨️ Printer Setup

### Bambu Lab Printer Configuration

1. **Enable LAN Mode** on your printer:
   - Go to printer settings → Network → LAN Mode
   - Enable LAN access and note the access code

2. **Find Printer IP**:
   - Check your router's connected devices
   - Or use network scanning tools

3. **Add to PulsePrint**:
   - Open Settings → Add Printer
   - Enter name, IP address, access code, and serial number

### Supported Printers
- Bambu Lab A1 / A1 mini
- Bambu Lab P1P / P1S  
- Bambu Lab X1 / X1C
- *More models coming soon*

## 🛠️ Development

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

### Quick Development Setup

```bash
# Prerequisites: Rust, Node.js 16+, yarn
git clone https://github.com/voodu00/pulseprint-desktop-app.git
cd pulseprint-desktop-app

# Install dependencies
cd frontend-react && yarn install && cd ..

# Run development server
cargo tauri dev
```

## ❓ Troubleshooting

### Common Issues

**Printer shows as "offline" or "connecting"**
- Verify printer IP address is correct
- Check that LAN Mode is enabled on printer
- Ensure both devices are on the same network
- Try restarting the application

**Settings not saving**
- Check that the application has write permissions
- Database is stored in your OS app data folder
- Try running as administrator/with elevated permissions

**Connection timeout errors**
- Verify the access code from printer settings
- Check firewall settings (allow port 8883)
- Ensure printer firmware is up to date

### Getting Help

- 🐛 **Found a bug?** [Report it here](https://github.com/voodu00/pulseprint-desktop-app/issues/new?template=bug_report.yml)
- ✨ **Have a feature idea?** [Suggest it here](https://github.com/voodu00/pulseprint-desktop-app/issues/new?template=feature_request.yml)  
- ❓ **Need help?** [Ask in discussions](https://github.com/voodu00/pulseprint-desktop-app/discussions)

## 🤝 Contributing

We welcome contributions from the community! PulsePrint Desktop is fully open source.

- 💻 **Code contributions** - See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines
- 🐛 **Bug reports** - Help us improve by reporting issues  
- ✨ **Feature requests** - Share your ideas for new functionality
- 📚 **Documentation** - Help improve our guides and documentation
- 🧪 **Testing** - Try alpha releases and provide feedback

### Quick Links
- [Development Setup](CONTRIBUTING.md#development-setup)
- [Coding Standards](CONTRIBUTING.md#coding-standards)  
- [Issue Templates](https://github.com/voodu00/pulseprint-desktop-app/issues/new/choose)
- [Discussions](https://github.com/voodu00/pulseprint-desktop-app/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Open Source

PulsePrint Desktop is fully open source with no feature restrictions. We believe in transparent development and community-driven innovation for the 3D printing ecosystem.

## Acknowledgments

- Built with [Tauri](https://tauri.app/) for cross-platform desktop development
- Uses [OpenBambuAPI](https://github.com/Doridian/OpenBambuAPI) documentation for printer communication
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database operations via [tauri-plugin-sql](https://github.com/tauri-apps/plugins-workspace)
