import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron';
import path from 'path';
import { createLogger } from './utils/logger';
import {
  electronAppExists,
  electronUserDataExists,
  electronUserDataReadFileSync,
  electronUserDataWriteFileSync,
  setElectronAppPaths,
  setElectronUserDataPath,
} from './utils/system-paths';

const logger = createLogger('Main');
// const serverLogger = createLogger('Server');

// Development Env
const isDev = !app.isPackaged;
// const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

if (isDev) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (error) {
    logger.warn('dotenv not available', (error as Error).message);
  }
}

let mainWindow: BrowserWindow | null = null;

// const MIN_WIDTH_EXPANDED = 800; // reduced - horizontal scrolling handles overflow
const MIN_WIDTH_COLLAPSED = 600; // reduced - horizontal scrolling handles overflow
const MIN_HEIGHT = 500;
const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 950;

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

let saveWindowBoundsTimeout: ReturnType<typeof setTimeout> | null = null;

function getIconPath(): string | null {
  let iconFile: string;
  if (process.platform === 'win32') {
    iconFile = 'icon.ico';
  } else if (process.platform === 'darwin') {
    iconFile = 'logo_larger.icns';
  } else {
    iconFile = 'logo_larger.png';
  }

  const iconPath = isDev
    ? path.join(__dirname, '../public', iconFile)
    : path.join(__dirname, '../dist/public', iconFile);

  try {
    if (!electronAppExists(iconPath)) {
      logger.warn(`Icon file not found: ${iconPath}`);
      return null;
    }
  } catch (error) {
    logger.warn('Icon check failed', (error as Error).message);
    return null;
  }

  return iconPath;
}

const WINDOW_BOUNDS_FILENAME = 'window-bounds.json';

function loadWindowBounds(): WindowBounds | null {
  try {
    if (electronUserDataExists(WINDOW_BOUNDS_FILENAME)) {
      const data = electronUserDataReadFileSync(WINDOW_BOUNDS_FILENAME);
      const bounds = JSON.parse(data) as WindowBounds;

      // Validate the loaded data has required fields
      if (
        typeof bounds.x === 'number' &&
        typeof bounds.y === 'number' &&
        typeof bounds.width === 'number' &&
        typeof bounds.height === 'number'
      ) {
        return bounds;
      }
    }
  } catch (error) {
    logger.warn('Failed to load window bounds', (error as Error).message);
  }

  return null;
}

function saveWindowBounds(bounds: WindowBounds): void {
  try {
    electronUserDataWriteFileSync(WINDOW_BOUNDS_FILENAME, JSON.stringify(bounds));
    logger.info('Window bounds saved successfully');
  } catch (error) {
    logger.warn('Failed to save window bounds', (error as Error).message);
  }
}

function scheduleSaveWindowBounds(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (saveWindowBoundsTimeout) {
    clearTimeout(saveWindowBoundsTimeout);
  }

  saveWindowBoundsTimeout = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const isMaximized = mainWindow.isMaximized();

    const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();

    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    });
  }, 500);
}

function validateBounds(bounds: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();

  // Check if window center is visible on any display
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  let isVisible = false;
  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    if (centerX >= x && centerX <= x + width && centerY >= y && centerY <= y + height) {
      isVisible = true;
      break;
    }
  }

  if (!isVisible) {
    // Window is off-screen, reset to primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;

    return {
      x: x + Math.floor((width - bounds.width) / 2),
      y: y + Math.floor((height - bounds.height) / 2),
      width: Math.min(bounds.width, width),
      height: Math.min(bounds.height, height),
      isMaximized: bounds.isMaximized,
    };
  }

  // Ensure minimum dimensions
  return {
    ...bounds,
    width: Math.max(bounds.width, MIN_WIDTH_COLLAPSED),
    height: Math.max(bounds.height, MIN_HEIGHT),
  };
}

function createWindow(): void {
  const iconPath = getIconPath();

  const saveBounds = loadWindowBounds();
  const validBounds = saveBounds ? validateBounds(saveBounds) : null;

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: validBounds?.width ?? DEFAULT_WIDTH,
    height: validBounds?.height ?? DEFAULT_HEIGHT,
    x: validBounds?.x ?? 0,
    y: validBounds?.y ?? 0,
    minWidth: MIN_WIDTH_COLLAPSED,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    backgroundColor: '#0a0a0a',
  };

  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state if previously maximized
  if (validBounds?.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadURL('https://pomodoro.ianfrye.dev');

  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isMaximized = mainWindow.isMaximized();
      const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
      saveWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    scheduleSaveWindowBounds();
  });

  mainWindow.on('moved', () => {
    scheduleSaveWindowBounds();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  try {
    const desiredUserDataPath = path.join(app.getPath('appData'), 'Pomodoro');

    if (app.getPath('userData') !== desiredUserDataPath) {
      app.setPath('userData', desiredUserDataPath);
      logger.info(`Changed userData path to: ${desiredUserDataPath}`);
    }
  } catch (error) {
    logger.warn('Failed to set userData path', (error as Error).message);
  }

  // Initalize centalized path helpers for electron
  // This must be done before any file operations
  setElectronUserDataPath(app.getPath('userData'));

  // In Dev mode, allow access to the entire project root (for source files, node_modules,  etc)
  // In production only allow access otot he build app dir and resources

  if (isDev) {
    const projectRoot = path.join(__dirname, '../');
    setElectronAppPaths(projectRoot);
  } else {
    setElectronAppPaths(__dirname, process.resourcesPath);
  }

  logger.info('Electron paths initialized');

  // Initalize security settings for path validation
  // Sset DATA_DIR before initializing any file operations
  process.env.DATA_DIR = app.getPath('userData');

  if (process.platform === 'darwin' && app.dock) {
    const iconPath = getIconPath();
    if (iconPath) {
      try {
        app.dock.setIcon(iconPath);
      } catch (error) {
        logger.warn('Failed to set dock icon', (error as Error).message);
      }
    }
  }

  try {
    createWindow();
  } catch (error) {
    logger.error('Failed to create main window', (error as Error).message);
    const errorMessage = (error as Error).message;
    const isNodeError = errorMessage.includes('Node.js');
    dialog.showErrorBox(
      'Pomodoro failed to start',
      `The application failed to start.\n\n${errorMessage}\n\n${
        isNodeError
          ? 'Please install Node.js from https://nodejs.org or via package manager (Homebrew, nvm, fnm).'
          : 'Please check the application logs for more details'
      }`
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  // Quit the app when all windows are closed on all platforms
  app.quit();
});

// Ping - for connection check
ipcMain.handle('ping', async () => {
  return 'pong';
});

// Window management - update minimum width based on sidebar state
// Now uses a fixed small minimum since horizontal scrolling handles overflow
ipcMain.handle('window:updateMinWidth', (_, _sidebarExpanded: boolean) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Always use the smaller minimum width - horizontal scrolling handles any overflow
  mainWindow.setMinimumSize(MIN_WIDTH_COLLAPSED, MIN_HEIGHT);
});

// App info
ipcMain.handle('app:getPath', async (_, name: Parameters<typeof app.getPath>[0]) => {
  return app.getPath(name);
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

ipcMain.handle('app:isPackaged', async () => {
  return app.isPackaged;
});

// Quit the application (used when user denies sandbox risk confirmation)
ipcMain.handle('app:quit', () => {
  logger.info('Quitting application via IPC request');
  app.quit();
});
