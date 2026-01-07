import { contextBridge, ipcRenderer } from 'electron';
import { createLogger } from './utils/logger';

const logger = createLogger('Preload');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // Connection Check
  ping(): Promise<string> {
    return ipcRenderer.invoke('ping');
  },

  // Window Control
  updateMinWidth: (sidebarExpanded: boolean): Promise<void> =>
    ipcRenderer.invoke('window:updateMinWidth', sidebarExpanded),

  // App info
  getPath: (name: string): Promise<string> => ipcRenderer.invoke('app:getPath', name),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke('app:isPackaged'),

  // App Control
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
});

logger.info('Electron API exposed (Typescript)');
