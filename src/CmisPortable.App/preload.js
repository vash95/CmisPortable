const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cmisPortable', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  validateSettings: (settings) => ipcRenderer.invoke('settings:validate', settings),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  deleteCredentials: () => ipcRenderer.invoke('credentials:delete'),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  minimizeToTray: () => ipcRenderer.invoke('window:minimizeToTray'),
  startSync: () => ipcRenderer.invoke('sync:start'),
  pauseSync: () => ipcRenderer.invoke('sync:pause'),
  forceSync: () => ipcRenderer.invoke('sync:force'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  onSyncStatus: (callback) => ipcRenderer.on('sync:status', (_event, payload) => callback(payload))
});
