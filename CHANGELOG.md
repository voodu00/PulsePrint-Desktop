# Changelog

All notable changes to PulsePrint Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased - Alpha Release]

### Major Features ✨

#### Multi-Printer MQTT Support
- **MQTT Client for 1-5+ Printers** (#16)
  - ✅ Subscribes to `device/{serial}/report` topics for each printer
  - ✅ Real-time status, temperature, and progress monitoring
  - ✅ Concurrent connections with individual background tasks per printer
  - ✅ Scalable HashMap architecture (no hardcoded printer limits)
  - ✅ Comprehensive status detection (idle, printing, paused, error, offline)
  - ✅ Temperature monitoring (nozzle, bed, chamber)
  - ✅ Progress tracking (percentage, layers, time-based calculations)

#### Dashboard View System
- **Card View and Table View Toggle** (#79)
  - ✅ Professional toggle component with card/table icons
  - ✅ Comprehensive table view with columns for:
    - Printer name, model, and IP address
    - Color-coded status badges with icons
    - Progress bars with time remaining and layer info
    - Filament type, color indicators, and remaining percentage
    - Real-time temperature displays
    - Context-appropriate action buttons (pause/resume/stop)
  - ✅ View preference persistence via SQLite database
  - ✅ Real-time MQTT updates work seamlessly in both views
  - ✅ Responsive design with mobile optimization
  - ✅ Smooth animations and transitions between views
  - ✅ Flash animations for idle/error printer states
  - ✅ Support for 5-10+ printers with efficient rendering

### Core Features 🔧

#### Printer Management
- **Add Printer Dialog** - Manual printer configuration with validation
- **Import/Export Printer Settings** - Support for JSON, CSV, YAML, and TXT formats
- **MQTT Integration** - Direct connection to Bambu Lab printers via MQTT over TLS (port 8883)
- **Mock Service Mode** - Development mode with simulated printer data for testing

#### User Interface & Experience
- **Dark/Light Mode** - Theme switching with system preference support
- **Responsive Design** - Optimized layouts for various screen sizes
- **Real-time Status Indicators** - Visual feedback with color-coded states
- **Temperature Displays** - Live hotend, bed, and chamber temperature monitoring
- **Progress Tracking** - Detailed layer information and time remaining displays

#### Data & Configuration
- **Persistent Settings** - SQLite database storage with automatic migrations
- **Connection Management** - Robust MQTT configuration for real printers
- **Settings Persistence** - User preferences stored across application sessions
- **Auto-refresh Configuration** - Configurable refresh intervals (15s - 5min)

### Technical Improvements 🛠️

#### Development & Code Quality
- **Comprehensive GitHub Actions Workflows**
  - Code quality analysis with SonarCloud integration
  - Security vulnerability scanning (CodeQL for JS/TS and Rust)
  - Dependency auditing with cargo-audit and yarn audit
  - Bundle size analysis and complexity tracking
  - Scheduled monitoring with proper caching strategies

#### Testing & Quality Assurance
- **Unit Test Framework** - Comprehensive test coverage for critical components
- **Integration Tests** - Backend communication and MQTT functionality testing
- **End-to-End Tests** - Automated user workflow validation with Playwright
- **Mock Service Integration** - Seamless testing without real hardware

#### Architecture & Performance
- **Event-Driven Architecture** - Efficient real-time updates via Tauri's event system
- **State Management Optimization** - Centralized printer state with efficient updates
- **Database Schema** - Automatic migrations and type-safe operations
- **Connection Pooling** - Efficient MQTT connection management per printer
- **Performance Optimizations** - Prevents hardware lag with intelligent polling strategies

### Planned for Alpha Completion 🎯

#### Notifications & Alerts
- **System Notifications** - Desktop alerts for print completion and errors
- **Sound Notifications** - Audio alerts for important events
- **Enhanced Visual Feedback** - Additional status indicators and animations

#### User Experience Enhancements  
- **Drag & Drop** - Reorder printer cards with drag-and-drop functionality
- **Enhanced Error Handling** - More comprehensive error states and recovery
- **Additional Import/Export Formats** - Extended file format support

### Technical Specifications 📋

#### Technology Stack
- **Backend**: Rust with Tauri framework v2.6+
- **Frontend**: React 18+ with TypeScript
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Database**: SQLite via tauri-plugin-sql
- **Communication**: MQTT protocol over TLS using OpenBambuAPI specification
- **State Management**: React contexts with persistent SQLite storage
- **Testing**: Jest, React Testing Library, Playwright for E2E

#### Supported Platforms
- **Windows** - Native executable with auto-updates
- **macOS** - Native .app bundle with proper code signing
- **Linux** - AppImage and native packages

#### Database Schema
- **user_preferences**: Key-value storage for application settings and view preferences
- **printers**: Printer configurations with connection details and metadata
- **Automatic Migrations**: Schema updates handled seamlessly across versions

### Open Source Transition 🌐

#### Licensing & Distribution
- **Full Open Source Model** - Transition from planned SaaS to community-driven development
- **MIT/Apache 2.0 License** - Permissive licensing for maximum community adoption
- **GitHub Releases** - Direct downloads for all supported platforms
- **Package Manager Support** - Planned distribution via Homebrew, Chocolatey, and AUR

#### Community & Development
- **Transparent Development** - Public roadmap and feature planning
- **Community-Driven Support** - GitHub discussions and issue tracking
- **Plugin Architecture** - Extensible system for community contributions
- **Comprehensive Documentation** - Developer guides and user manuals

### Verification Status ✅

- **Issue #16** - MQTT Multi-Printer Support: **FULLY IMPLEMENTED & VERIFIED**
- **Issue #79** - Card/Table View Toggle: **FULLY IMPLEMENTED & VERIFIED**
- GitHub Actions Workflows: **CONFIGURED & TESTED**
- Build System: **FUNCTIONAL** (all lint/test checks pass)
- Documentation: **UP TO DATE** with implementation status

---

**Note**: This changelog documents the current state as of the alpha release preparation. All listed features have been implemented and verified through code review and testing.