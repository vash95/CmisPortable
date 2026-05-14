const path = require('node:path');
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, safeStorage } = require('electron');
const { SettingsStore } = require('../CmisPortable.Core/settingsStore');
const { validateSettings } = require('../CmisPortable.Core/configuration');
const { CmisSyncService } = require('../CmisPortable.Core/cmisSyncService');
const { BrowserBindingCmisClient } = require('../CmisPortable.Core/browserBindingCmisClient');
const { BackgroundSyncWorker } = require('../CmisPortable.Core/backgroundSyncWorker');
const { createElectronSecureStorage } = require('./secureStorage');

let mainWindow;
let tray;
let store;
let backgroundSyncWorker;

function createStore() {
  return new SettingsStore({
    settingsPath: path.join(app.getPath('userData'), 'settings.json'),
    secureStorage: createElectronSecureStorage(safeStorage)
  });
}

function createBackgroundSyncWorker() {
  const worker = new BackgroundSyncWorker({
    syncNow: runConfiguredSync,
    logger: console
  });

  worker.on('status', (status) => {
    mainWindow?.webContents.send('sync:status', status);
    updateTrayMenu();
  });

  return worker;
}

async function runConfiguredSync() {
  const settings = await store.load();
  const validation = validateSettings(settings);
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => error.message).join(' '));
  }

  const password = await store.revealSecret(settings);
  const syncService = new CmisSyncService({
    cmisClient: createCmisClient(),
    localRoot: settings.localFolder,
    logger: console
  });

  return syncService.SyncAsync({
    url: settings.cmisUrl,
    username: settings.username,
    password
  });
}

function createCmisClient() {
  return new BrowserBindingCmisClient();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 760,
    minWidth: 760,
    minHeight: 620,
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
  updateTrayMenu();
  tray.on('double-click', showMainWindow);
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const status = backgroundSyncWorker?.getStatus();
  const isPaused = status?.paused ?? true;

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir configuración', click: showMainWindow },
    {
      label: 'Sincronizar ahora',
      click: () => backgroundSyncWorker?.forceSync('tray')
    },
    {
      label: isPaused ? 'Reanudar sincronización' : 'Pausar sincronización',
      click: () => toggleBackgroundSync()
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]));
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  }
  mainWindow.show();
  mainWindow.focus();
}

function configureBackgroundSync(settings) {
  const intervalMs = (settings.syncIntervalSeconds ?? 60) * 1000;
  backgroundSyncWorker.setIntervalMs(intervalMs);

  if (settings.runInBackground) {
    backgroundSyncWorker.start();
  } else {
    backgroundSyncWorker.pause();
  }

  updateTrayMenu();
  return backgroundSyncWorker.getStatus();
}

function toggleBackgroundSync() {
  const status = backgroundSyncWorker.getStatus();
  return status.paused ? backgroundSyncWorker.resume() : backgroundSyncWorker.pause();
}

function registerIpc() {
  ipcMain.handle('settings:load', async () => {
    const settings = await store.load();
    const secretValue = await store.revealSecret(settings);
    configureBackgroundSync(settings);
    return {
      ...settings,
      secretValue,
      syncStatus: backgroundSyncWorker.getStatus()
    };
  });

  ipcMain.handle('settings:validate', (_event, draft) => validateSettings(draft));

  ipcMain.handle('settings:save', async (_event, draft) => {
    const saved = await store.save(draft);
    const syncStatus = configureBackgroundSync(saved);
    return {
      ...saved,
      secretValue: draft.secretValue ?? '',
      syncStatus
    };
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

  ipcMain.handle('sync:start', async () => backgroundSyncWorker.resume());
  ipcMain.handle('sync:pause', async () => backgroundSyncWorker.pause());
  ipcMain.handle('sync:force', async () => backgroundSyncWorker.forceSync('manual'));
  ipcMain.handle('sync:status', async () => backgroundSyncWorker.getStatus());
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
  backgroundSyncWorker = createBackgroundSyncWorker();
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
  backgroundSyncWorker?.stop();
});
