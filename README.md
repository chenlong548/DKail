# DKail Security Monitor

A lightweight local network security monitoring system built with Rust and Tauri.

## Features

- **Real-time Network Traffic Monitoring**: Capture and analyze network packets, identify suspicious connections
- **Process Behavior Monitoring**: Monitor system process activities, detect suspicious processes
- **Threat Detection**: Signature-based threat detection system
- **Desktop Application**: Modern desktop UI with Kali Linux inspired dark theme

## Tech Stack

### Backend
- **Rust** - High-performance, memory-safe systems programming
- **Actix-web** - Powerful HTTP framework for REST API
- **Tokio** - Async runtime for concurrent operations
- **Npcap/WinPcap** - Network packet capture library
- **Windows API** - Process monitoring and system information

### Frontend
- **Tauri 2.0** - Cross-platform desktop application framework
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Recharts** - Charting library for data visualization

## Prerequisites

### Required Software
1. **Rust** (1.95.0+ for GNU backend, nightly for Tauri UI)
2. **Node.js** (18+) and npm
3. **Npcap** - Network packet capture driver
4. **Visual Studio Build Tools** (for MSVC toolchain)
5. **MinGW-w64** (for GNU toolchain)

### Npcap Installation
Download from https://npcap.com/ and install with:
- "WinPcap API-compatible Mode" enabled
- "Support raw 802.11 traffic" enabled

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dkail.git
cd dkail
```

### 2. Build Backend Service

```powershell
# Set GNU toolchain (required for Npcap library)
rustup default stable-x86_64-pc-windows-gnu

# Build
cargo build

# Run
cargo run
```

The backend service will start at `http://127.0.0.1:8080`

### 3. Build Desktop Application

```powershell
# Navigate to UI directory
cd dkail-ui

# Set MSVC nightly toolchain (required for Tauri)
rustup override set nightly-x86_64-pc-windows-msvc

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Or build for production
npm run tauri build
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | System status |
| `/processes` | GET | Process list |
| `/network` | GET | Network connections |
| `/alerts` | GET | Security alerts |

## Project Structure

```
dkail/
├── src/                    # Rust backend source
│   ├── main.rs            # Application entry
│   ├── lib.rs             # Library exports
│   ├── network/           # Network monitoring module
│   ├── process/           # Process monitoring module
│   ├── threat/            # Threat detection module
│   └── api/               # REST API module
├── dkail-ui/              # Tauri desktop application
│   ├── src/               # React frontend
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── store/         # State management
│   └── src-tauri/         # Tauri backend
├── tests/                 # Integration tests
├── docs/                  # Documentation
└── build.rs               # Build configuration
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DKAIL_API_PORT` | API server port | 8080 |
| `DKAIL_AUTH_TOKEN` | Bearer token for API auth | None |
| `DKAIL_NETWORK_INTERFACE` | Network interface for capture | Auto-detect |
| `DKAIL_LOG_LEVEL` | Log level | Info |

## Security Notes

- The application uses `PROCESS_QUERY_LIMITED_INFORMATION` for minimal privilege process monitoring
- API authentication is optional via `DKAIL_AUTH_TOKEN` environment variable
- Network capture requires Npcap driver installation
- All unsafe code blocks use RAII pattern for proper resource management

### Security Features

- **API Authentication**: Bearer token authentication with constant-time comparison
- **Rate Limiting**: 100 requests per 60 seconds per IP address
- **CORS Protection**: Configurable cross-origin resource sharing
- **Path Sanitization**: Sensitive information (usernames) is masked in API responses
- **Error Handling**: Proper error responses without exposing internal details

### Security Best Practices

1. **Set a strong authentication token**:
   ```powershell
   $env:DKAIL_AUTH_TOKEN = "your-secure-random-token-here"
   ```

2. **Run with minimal privileges**: The application only requires `PROCESS_QUERY_LIMITED_INFORMATION`

3. **Monitor logs**: Check logs for authentication failures and rate limit violations

## License

MIT License

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Version History

- **1.0.0** (2026-04-22) - Initial release
  - Real-time network monitoring
  - Process behavior monitoring
  - Threat detection
  - Desktop UI application
  - Security fixes: API authentication, rate limiting, CORS, path sanitization
