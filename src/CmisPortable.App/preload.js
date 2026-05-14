const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cmisPortable', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  validateSettings: (settings) => ipcRenderer.invoke('settings:validate', settings),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  minimizeToTray: () => ipcRenderer.invoke('window:minimizeToTray'),
  onSyncTick: (callback) => ipcRenderer.on('sync:tick', (_event, payload) => callback(payload))
});
