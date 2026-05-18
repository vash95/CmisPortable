const path = require('node:path');
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, safeStorage } = require('electron');
const { SettingsStore } = require('../CmisPortable.Core/settingsStore');
const { validateSettings } = require('../CmisPortable.Core/configuration');
const { CmisSyncService } = require('../CmisPortable.Core/cmisSyncService');
const { BrowserBindingCmisClient } = require('../CmisPortable.Core/browserBindingCmisClient');
const { BackgroundSyncWorker } = require('../CmisPortable.Core/backgroundSyncWorker');
const { createElectronSecureStorage } = require('./secureStorage');
const { createTranslator, resolveLocale } = require('../CmisPortable.Core/i18n');
const { MAIN_TRANSLATIONS } = require('./mainTranslations');

let mainWindow;
let tray;
let store;
let backgroundSyncWorker;
let logBuffer;
let shouldRunInBackgroundOnClose = true;
let appLocale = 'en';

const MAX_LOG_ENTRIES = 200;
const hasSingleInstanceLock = app.requestSingleInstanceLock();
const appIconPath = path.join(
  __dirname,
  'assets',
  process.platform === 'win32' ? 'cmis-sync-icon.ico' : 'cmis-sync-icon.png'
);

function createAppIcon(size) {
  const icon = nativeImage.createFromPath(appIconPath);

  if (!size) {
    return icon;
  }

  return icon.resize({ width: size, height: size });
}


const translateMain = createTranslator(MAIN_TRANSLATIONS);

function mt(key, ...args) {
  return translateMain(key, appLocale, ...args);
}


function createStore() {
  return new SettingsStore({
    settingsPath: path.join(app.getPath('userData'), 'settings.json'),
    secureStorage: createElectronSecureStorage(safeStorage),
    locale: appLocale
  });
}

function createBackgroundSyncWorker() {
  const worker = new BackgroundSyncWorker({
    syncNow: runConfiguredSync,
    logger: createAppLogger('sync'),
    locale: appLocale
  });

  worker.on('status', (status) => {
    mainWindow?.webContents.send('sync:status', status);
    updateTrayMenu();
  });

  return worker;
}

async function runConfiguredSync() {
  const settings = await store.load();
  const validation = validateSettings(settings, { locale: appLocale });
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => error.message).join(' '));
  }

  logInfo('sync', mt('log.sync.prepare'), {
    localFolder: settings.localFolder,
    remoteFolder: settings.remoteFolder?.path ?? '/',
    intervalSeconds: settings.syncIntervalSeconds
  });

  const password = await store.revealSecret(settings);
  const syncService = new CmisSyncService({
    cmisClient: createCmisClient(),
    localRoot: settings.localFolder,
    logger: createAppLogger('cmis')
  });

  return syncService.SyncAsync({
    url: settings.cmisUrl,
    username: settings.username,
    password,
    remoteFolder: settings.remoteFolder
  });
}

function createCmisClient() {
  return new BrowserBindingCmisClient();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 940,
    minHeight: 680,
    title: 'CmisIC2',
    icon: createAppIcon(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    if (shouldRunInBackgroundOnClose) {
      event.preventDefault();
      minimizeMainWindowToTray();
    }
  });

  mainWindow.on('close', (event) => {
    if (app.isQuiting) {
      return;
    }

    if (shouldRunInBackgroundOnClose) {
      event.preventDefault();
      minimizeMainWindowToTray();
      return;
    }

    app.isQuiting = true;
  });
}

function createTray() {
  if (tray) {
    return tray;
  }

  tray = new Tray(createAppIcon(16));
  tray.setToolTip('CmisIC2');
  updateTrayMenu();
  tray.on('double-click', showSettingsWindow);
  return tray;
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const status = backgroundSyncWorker?.getStatus();
  const isPaused = status?.paused ?? true;

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: mt('tray.openSettings'), click: showSettingsWindow },
    { label: mt('tray.openLogs'), click: showLogConsoleFromTray },
    {
      label: mt('tray.syncNow'),
      click: () => backgroundSyncWorker?.forceSync('tray')
    },
    {
      label: isPaused ? mt('tray.resumeSync') : mt('tray.pauseSync'),
      click: () => toggleBackgroundSync()
    },
    { type: 'separator' },
    {
      label: mt('tray.quit'),
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]));
}


function minimizeMainWindowToTray() {
  createTray();
  mainWindow?.hide();
  logInfo('app', mt('log.app.minimizedToTray'));
  updateTrayMenu();
  return true;
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function sendRendererCommand(channel) {
  if (!mainWindow) {
    return;
  }

  const sendCommand = () => mainWindow?.webContents.send(channel);
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', sendCommand);
    return;
  }

  sendCommand();
}

function showSettingsWindow() {
  showMainWindow();
  sendRendererCommand('window:showSettings');
}

function showLogConsoleFromTray() {
  showMainWindow();
  sendRendererCommand('logs:showConsole');
}

function configureBackgroundSync(settings) {
  shouldRunInBackgroundOnClose = settings.runInBackground ?? true;
  const intervalMs = (settings.syncIntervalSeconds ?? 60) * 1000;
  backgroundSyncWorker.setIntervalMs(intervalMs);
  logInfo('config', mt('log.config.interval', settings.syncIntervalSeconds ?? 60));

  if (settings.runInBackground) {
    logInfo('config', mt('log.config.backgroundEnabled'));
    backgroundSyncWorker.start();
  } else {
    logInfo('config', mt('log.config.backgroundDisabled'));
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
  ipcMain.handle('app:locale', async () => appLocale);

  ipcMain.handle('settings:load', async () => {
    const settings = await store.load();
    const secretValue = await store.revealSecret(settings);
    if (hasStoredConnection(settings)) {
      configureBackgroundSync(settings);
    } else {
      backgroundSyncWorker.stop();
      shouldRunInBackgroundOnClose = settings.runInBackground ?? true;
    }
    return {
      ...settings,
      secretValue,
      syncStatus: backgroundSyncWorker.getStatus()
    };
  });

  ipcMain.handle('settings:validate', (_event, draft) => validateSettings(draft, { locale: appLocale }));

  ipcMain.handle('settings:save', async (_event, draft) => {
    logInfo('config', mt('log.config.saving'));
    const saved = await store.save(draft);
    const syncStatus = configureBackgroundSync(saved);
    return {
      ...saved,
      secretValue: draft.secretValue ?? '',
      syncStatus
    };
  });

  ipcMain.handle('settings:clear', async () => {
    logInfo('config', mt('log.config.clearing'));
    backgroundSyncWorker.stop();
    const settings = await store.clear();
    shouldRunInBackgroundOnClose = settings.runInBackground;
    return {
      ...settings,
      secretValue: '',
      syncStatus: backgroundSyncWorker.getStatus()
    };
  });

  ipcMain.handle('connection:test', async (_event, draft = {}) => {
    const diagnostics = createConnectionDiagnostics(draft);
    let phase = 'connect';
    logInfo('connection', mt('log.connection.validationStarted'), diagnostics);

    try {
      const client = createCmisClient();
      const connection = await client.ConnectAsync(draft.cmisUrl, draft.username, draft.secretValue ?? '');
      logInfo('connection', mt('log.connection.connected'), {
        ...diagnostics,
        repositoryId: connection?.repositoryId ?? null,
        rootFolderId: connection?.rootFolderId ?? null,
        repositoryUrl: connection?.repositoryUrl ?? null
      });

      phase = 'root-folder';
      const rootFolder = await client.GetRootFolderAsync();
      logInfo('connection', mt('log.connection.rootLoaded'), {
        id: getObjectId(rootFolder),
        name: rootFolder?.name ?? '/',
        type: rootFolder?.type ?? rootFolder?.baseTypeId ?? null
      });

      logInfo('connection', mt('log.connection.validationSucceeded'), diagnostics);
      return { valid: true };
    } catch (error) {
      const message = sanitizeConnectionError(error);
      logEntry('error', 'connection', mt('log.connection.validationFailed'), {
        ...diagnostics,
        phase,
        message,
        error: serializeLogDetails(error)
      });
      return {
        valid: false,
        message
      };
    }
  });

  ipcMain.handle('remoteFolders:list', async (_event, draft = {}) => {
    logInfo('config', mt('log.config.remoteBrowse'), { parentFolder: draft.parentFolder?.path ?? '/' });
    return listRemoteFolders(draft);
  });

  ipcMain.handle('folder:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mt('dialog.chooseFolder'),
      properties: ['openDirectory', 'createDirectory']
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('window:minimizeToTray', () => minimizeMainWindowToTray());

  ipcMain.handle('window:quit', () => {
    logInfo('app', mt('log.app.quitRequested'));
    app.isQuiting = true;
    app.quit();
    return true;
  });

  ipcMain.handle('sync:start', async () => {
    logInfo('sync', mt('log.sync.resuming'));
    return backgroundSyncWorker.resume();
  });
  ipcMain.handle('sync:pause', async () => {
    logInfo('sync', mt('log.sync.pausing'));
    return backgroundSyncWorker.pause();
  });
  ipcMain.handle('sync:force', async () => {
    logInfo('sync', mt('log.sync.manual'));
    return backgroundSyncWorker.forceSync('manual');
  });
  ipcMain.handle('sync:status', async () => backgroundSyncWorker.getStatus());
  ipcMain.handle('logs:get', async () => getLogEntries());
  ipcMain.handle('logs:clear', async () => {
    clearLogEntries();
    logInfo('app', mt('log.app.logsCleared'));
    return getLogEntries();
  });
}


async function listRemoteFolders(draft = {}) {
  const client = createCmisClient();
  const password = draft.secretValue ?? '';
  await client.ConnectAsync(draft.cmisUrl, draft.username, password);

  const rootFolder = await client.GetRootFolderAsync();
  const parentFolder = draft.parentFolder?.id ? draft.parentFolder : null;
  const current = parentFolder ?? {
    id: getObjectId(rootFolder),
    name: mt('dialog.remoteRoot'),
    path: '/'
  };

  const parentId = current.id || getObjectId(rootFolder);
  const children = await client.ListChildrenAsync(parentId);
  return {
    current,
    folders: (children ?? [])
      .filter(isRemoteFolder)
      .map((folder) => {
        const id = getObjectId(folder);
        const name = String(folder.name ?? id ?? '').trim();
        return {
          id,
          name,
          path: joinRemotePath(current.path ?? '/', name)
        };
      })
      .filter((folder) => folder.id && folder.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

function getObjectId(object) {
  return object?.id ?? object?.objectId ?? object?.properties?.['cmis:objectId']?.value ?? null;
}

function isRemoteFolder(object) {
  const type = String(object?.type ?? object?.baseTypeId ?? object?.properties?.['cmis:baseTypeId']?.value ?? '').toLowerCase();
  return type.includes('folder');
}

function joinRemotePath(parent, name) {
  const cleanParent = parent && parent !== '/' ? String(parent).replace(/\/+$/, '') : '';
  const cleanName = String(name ?? '').replace(/^\/+|\/+$/g, '');
  return `/${[cleanParent.replace(/^\//, ''), cleanName].filter(Boolean).join('/')}`;
}

function createConnectionDiagnostics(draft = {}) {
  const cmisUrl = String(draft.cmisUrl ?? '').trim();
  const username = String(draft.username ?? '').trim();
  return {
    cmisUrl: cmisUrl || null,
    username: username || null,
    hasPassword: Boolean(draft.secretValue),
    timestamp: new Date().toISOString()
  };
}

function createAppLogger(source) {
  return {
    info(message, details) {
      logInfo(source, message, details);
    },
    warn(message, details) {
      logEntry('warn', source, message, details);
    },
    error(message, details) {
      logEntry('error', source, message, details);
    }
  };
}

function logInfo(source, message, details) {
  logEntry('info', source, message, details);
}

function logEntry(level, source, message, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message: String(message),
    details: serializeLogDetails(details)
  };

  logBuffer ??= [];
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
  }

  const consoleMethod = console[level] ?? console.log;
  consoleMethod.call(console, `[${source}] ${message}`, details ?? '');
  mainWindow?.webContents.send('logs:entry', entry);
  return entry;
}

function sanitizeConnectionError(error) {
  const message = String(error?.message ?? error ?? '').replace(/^Error invoking remote method '[^']+':\s*/, '').trim();
  return message || mt('log.connection.unknownError');
}

function serializeLogDetails(details) {
  if (!details) {
    return null;
  }

  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      code: details.code ?? details.statusCode ?? details.status ?? null,
      status: details.status ?? details.statusCode ?? null,
      responseText: details.text ?? details.responseText ?? null,
      stack: details.stack ?? null
    };
  }

  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return String(details);
  }
}

function getLogEntries() {
  return [...(logBuffer ?? [])];
}

function clearLogEntries() {
  logBuffer = [];
}

function hasStoredConnection(settings) {
  return Boolean(settings?.cmisUrl || settings?.username || settings?.localFolder || settings?.secret?.protectedValue);
}

async function loadStoredSettingsForStartup() {
  try {
    const settings = await store.load();
    shouldRunInBackgroundOnClose = settings.runInBackground ?? true;

    if (hasStoredConnection(settings)) {
      configureBackgroundSync(settings);
      logInfo('config', mt('log.config.loaded'));
    }
  } catch (error) {
    logEntry('error', 'config', mt('log.config.loadFailed'), error);
  }
}


if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady().then(() => {
    appLocale = resolveLocale(app.getLocale());
    logBuffer = [];
    logInfo('app', mt('log.app.started'));
    store = createStore();
    backgroundSyncWorker = createBackgroundSyncWorker();
    registerIpc();
    createTray();
    loadStoredSettingsForStartup();
    createWindow();

    app.on('activate', showMainWindow);
  });

  app.on('window-all-closed', (event) => {
    if (shouldRunInBackgroundOnClose && !app.isQuiting) {
      event.preventDefault();
      return;
    }

    app.quit();
  });

  app.on('before-quit', () => {
    app.isQuiting = true;
    backgroundSyncWorker?.stop();
  });
}
