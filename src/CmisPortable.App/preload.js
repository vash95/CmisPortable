const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cmisPortable', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  validateSettings: (settings) => ipcRenderer.invoke('settings:validate', settings),
  testConnection: (settings) => ipcRenderer.invoke('connection:test', settings),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  clearSettings: () => ipcRenderer.invoke('settings:clear'),
  getLocale: () => ipcRenderer.invoke('app:locale'),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  listRemoteFolders: (draft) => ipcRenderer.invoke('remoteFolders:list', draft),
  minimizeToTray: () => ipcRenderer.invoke('window:minimizeToTray'),
  quitApp: () => ipcRenderer.invoke('window:quit'),
  startSync: () => ipcRenderer.invoke('sync:start'),
  pauseSync: () => ipcRenderer.invoke('sync:pause'),
  forceSync: () => ipcRenderer.invoke('sync:force'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  getLogs: () => ipcRenderer.invoke('logs:get'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  onSyncStatus: (callback) => ipcRenderer.on('sync:status', (_event, payload) => callback(payload)),
  onLogEntry: (callback) => ipcRenderer.on('logs:entry', (_event, payload) => callback(payload)),
  onShowSettings: (callback) => ipcRenderer.on('window:showSettings', () => callback()),
  onShowLogConsole: (callback) => ipcRenderer.on('logs:showConsole', () => callback())
});
