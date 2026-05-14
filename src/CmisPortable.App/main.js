const path = require('node:path');
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, safeStorage } = require('electron');
const { SettingsStore } = require('../CmisPortable.Core/settingsStore');
const { validateSettings } = require('../CmisPortable.Core/configuration');
const { createElectronSecureStorage } = require('./secureStorage');

let mainWindow;
let tray;
let store;
let syncTimer;

function createStore() {
  return new SettingsStore({
    settingsPath: path.join(app.getPath('userData'), 'settings.json'),
    secureStorage: createElectronSecureStorage(safeStorage)
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    title: 'CmisPortable',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(createTrayIconDataUrl());
  tray = new Tray(icon);
  tray.setToolTip('CmisPortable');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir CmisPortable', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]));
  tray.on('double-click', showMainWindow);
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  }
  mainWindow.show();
  mainWindow.focus();
}

function configureBackgroundSync(settings) {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  const intervalMs = settings.syncIntervalSeconds * 1000;
  syncTimer = setInterval(() => {
    mainWindow?.webContents.send('sync:tick', {
      timestamp: new Date().toISOString(),
      cmisUrl: settings.cmisUrl,
      localFolder: settings.localFolder
    });
  }, intervalMs);
}

function registerIpc() {
  ipcMain.handle('settings:load', async () => {
    const settings = await store.load();
    const secretValue = await store.revealSecret(settings);
    configureBackgroundSync(settings);
    return {
      ...settings,
      secretValue
    };
  });

  ipcMain.handle('settings:validate', (_event, draft) => validateSettings(draft));

  ipcMain.handle('settings:save', async (_event, draft) => {
    const saved = await store.save(draft);
    configureBackgroundSync(saved);
    return saved;
  });

  ipcMain.handle('folder:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar carpeta local de sincronización',
      properties: ['openDirectory', 'createDirectory']
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('window:minimizeToTray', () => {
    mainWindow?.hide();
    return true;
  });
}

function createTrayIconDataUrl() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#2563eb"/>
      <path d="M8 11h16v3H8zm0 7h11v3H8z" fill="white"/>
      <circle cx="23" cy="20" r="3" fill="#93c5fd"/>
    </svg>
  `);
}

app.whenReady().then(() => {
  store = createStore();
  registerIpc();
  createTray();
  createWindow();

  app.on('activate', showMainWindow);
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', () => {
  app.isQuiting = true;
});
