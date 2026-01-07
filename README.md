# Pomodoro Electron

A cross-platform desktop application for the Pomodoro productivity timer, built with Electron and TypeScript.

## Overview

This Electron wrapper provides a native desktop experience for the Pomodoro web application, with features like window state persistence, native icons, and system tray integration.

## Features

- 🖥️ **Cross-platform**: Runs on Windows, macOS, and Linux
- 💾 **Window State Persistence**: Automatically saves and restores window size, position, and maximized state
- 🎨 **Native Icons**: Platform-specific icons for a native look and feel
- 🔒 **Security**: Context isolation and disabled Node integration in renderer
- 🚀 **Fast Development**: Hot-reload with Vite during development
- 📦 **Easy Distribution**: Pre-configured electron-builder for packaging

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Pomodoro-Electron
```

2. Install dependencies:
```bash
npm install
```

## Development

### Run in Development Mode

Start the Electron app with hot-reload:
```bash
npm run dev
```

Or start just the web version without Electron:
```bash
npm run dev:web
```

### Type Checking

Run TypeScript type checking:
```bash
npm run typecheck
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Building for Production

### Build for All Platforms

First, compile TypeScript and build the renderer:
```bash
npm run build
```

### Platform-Specific Builds

Build for macOS:
```bash
npm run build:mac
```

Build for Windows:
```bash
npm run build:win
```

Build for Linux:
```bash
npm run build:linux
```

The built applications will be available in the `release/` directory.

## Project Structure

```
Pomodoro-Electron/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script for IPC
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions (logging, paths, etc.)
├── public/              # Static assets (icons)
├── dist-electron/       # Compiled Electron code
├── release/             # Built application packages
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies and scripts
```

## Technologies Used

- **[Electron](https://www.electronjs.org/)** - Framework for building cross-platform desktop apps
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[electron-builder](https://www.electron.build/)** - Package and distribute Electron apps

## Configuration

### Application Settings

The app stores its configuration in the following locations:
- **Windows**: `%APPDATA%\Pomodoro`
- **macOS**: `~/Library/Application Support/Pomodoro`
- **Linux**: `~/.config/Pomodoro`

### Window Settings

Window bounds (size, position, maximized state) are automatically saved to `window-bounds.json` in the user data directory.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Electron |
| `npm run dev:web` | Start development server without Electron |
| `npm run build` | Build the application |
| `npm run build:mac` | Build for macOS (DMG, ZIP) |
| `npm run build:win` | Build for Windows (NSIS installer, portable) |
| `npm run build:linux` | Build for Linux (AppImage) |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the built renderer |

## IPC Handlers

The application exposes the following IPC handlers:

- `ping` - Connection check (returns 'pong')
- `window:updateMinWidth` - Update window minimum width
- `app:getPath` - Get Electron app paths
- `app:getVersion` - Get application version
- `app:isPackaged` - Check if app is packaged
- `app:quit` - Quit the application

## License

ISC

## Version

Current version: 1.0.0

