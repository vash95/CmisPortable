let currentLocale = 'en';

const translations = {
  en: {
    'hero.eyebrow': 'Setup wizard',
    'hero.title': 'Configure your CMIS sync',
    'hero.description': 'Define the server, credentials, and local folder. The application can keep running in the system tray.',
    'action.minimizeToTray': 'Minimize to tray',
    'action.quitApp': 'Close application',
    'field.cmisUrl': 'CMIS URL',
    'placeholder.cmisUrl': 'https://server/cmis/browser',
    'field.username': 'Username',
    'field.secretKind': 'Secret type',
    'secretKind.password': 'Password',
    'secretKind.token': 'Token',
    'field.secretValue': 'Password or token',
    'field.localFolder': 'Local sync folder',
    'placeholder.localFolder': '/path/to/folder',
    'action.chooseFolder': 'Choose…',
    'field.syncInterval': 'Sync interval (10 to 60 seconds)',
    'field.runInBackground': 'Keep running in the background when the window is closed',
    'action.clearConnection': 'Remove current connection',
    'action.validate': 'Validate',
    'action.saveConnection': 'Save new connection',
    'sync.title': 'Sync status',
    'sync.waiting': 'Waiting for saved configuration.',
    'sync.metricsLabel': 'Last sync result',
    'metric.downloaded': 'Downloaded',
    'metric.updated': 'Updated',
    'metric.deleted': 'Deleted',
    'action.startSync': 'Start sync',
    'action.pauseSync': 'Pause sync',
    'action.forceSync': 'Sync now',
    'action.refreshStatus': 'View latest status',
    'log.title': 'Log console',
    'log.description': 'Recent sync and configuration activity.',
    'action.clearLogs': 'Clear log',
    'log.eventsLabel': 'Application events',
    'message.noDescription': 'Event without description',
    'message.validSettings': 'The configuration is valid.',
    'message.syncUpdateFailed': (message) => `Sync could not be updated: ${message}`,
    'message.syncStarted': 'Background sync started.',
    'message.syncPaused': 'Background sync paused.',
    'message.manualSyncDone': 'Manual sync executed.',
    'message.statusRefreshed': 'Latest status refreshed.',
    'message.clearConfirm': 'The current connection and stored credentials will be removed. You can create a new connection afterwards. Continue?',
    'message.connectionCleared': 'Current connection removed. Enter the details to create a new connection.',
    'message.connectionClearFailed': (message) => `Current connection could not be removed: ${message}`,
    'message.connectionSaved': 'New connection saved. Credentials will be remembered when you reopen the application.',
    'message.existingLoaded': 'Existing configuration and stored credentials loaded.',
    'message.loadFailed': (message) => `Configuration could not be loaded: ${message}`,
    'sync.noDate': 'no date',
    'sync.noSuccess': 'no successful syncs',
    'sync.noStatus': 'No status available',
    'sync.statusTemplate': ({ message, updatedAt, lastSuccess, intervalSeconds }) => `${message} Last update: ${updatedAt}. Last success: ${lastSuccess}. Interval: ${intervalSeconds} seconds.`,
    'interval.minute': '1 minute',
    'interval.seconds': (value) => `${value} seconds`,
    'state.idle': 'Not started',
    'state.scheduled': 'Scheduled',
    'state.running': 'Running',
    'state.success': 'Successful',
    'state.error': 'Error',
    'state.skipped': 'Skipped',
    'state.stopped': 'Stopped',
    'state.paused': 'Paused',
    'state.unknown': 'Unknown'
  },
  es: {
    'hero.eyebrow': 'Asistente inicial',
    'hero.title': 'Configura tu sincronización CMIS',
    'hero.description': 'Define el servidor, credenciales y carpeta local. La aplicación puede permanecer en segundo plano desde la bandeja del sistema.',
    'action.minimizeToTray': 'Minimizar a bandeja',
    'action.quitApp': 'Cerrar aplicación',
    'field.cmisUrl': 'URL CMIS',
    'placeholder.cmisUrl': 'https://servidor/cmis/browser',
    'field.username': 'Usuario',
    'field.secretKind': 'Tipo de secreto',
    'secretKind.password': 'Contraseña',
    'secretKind.token': 'Token',
    'field.secretValue': 'Contraseña o token',
    'field.localFolder': 'Carpeta local de sincronización',
    'placeholder.localFolder': '/ruta/a/carpeta',
    'action.chooseFolder': 'Elegir…',
    'field.syncInterval': 'Intervalo de sincronización (10 a 60 segundos)',
    'field.runInBackground': 'Seguir ejecutando en segundo plano al cerrar la ventana',
    'action.clearConnection': 'Eliminar conexión actual',
    'action.validate': 'Validar',
    'action.saveConnection': 'Guardar nueva conexión',
    'sync.title': 'Estado de sincronización',
    'sync.waiting': 'Esperando configuración guardada.',
    'sync.metricsLabel': 'Último resultado de sincronización',
    'metric.downloaded': 'Descargados',
    'metric.updated': 'Actualizados',
    'metric.deleted': 'Eliminados',
    'action.startSync': 'Iniciar sincronización',
    'action.pauseSync': 'Pausar sincronización',
    'action.forceSync': 'Sincronizar ahora',
    'action.refreshStatus': 'Ver último estado',
    'log.title': 'Consola de log',
    'log.description': 'Actividad reciente de la sincronización y de la configuración.',
    'action.clearLogs': 'Limpiar log',
    'log.eventsLabel': 'Eventos de la aplicación',
    'message.noDescription': 'Evento sin descripción',
    'message.validSettings': 'La configuración es válida.',
    'message.syncUpdateFailed': (message) => `No se pudo actualizar la sincronización: ${message}`,
    'message.syncStarted': 'Sincronización en segundo plano iniciada.',
    'message.syncPaused': 'Sincronización en segundo plano pausada.',
    'message.manualSyncDone': 'Sincronización manual ejecutada.',
    'message.statusRefreshed': 'Último estado actualizado.',
    'message.clearConfirm': 'Se eliminará la conexión actual y las credenciales almacenadas. Después podrás crear una nueva conexión. ¿Continuar?',
    'message.connectionCleared': 'Conexión actual eliminada. Introduce los datos para crear una nueva conexión.',
    'message.connectionClearFailed': (message) => `No se pudo eliminar la conexión actual: ${message}`,
    'message.connectionSaved': 'Nueva conexión guardada. Las credenciales se recordarán al volver a abrir la aplicación.',
    'message.existingLoaded': 'Configuración existente y credenciales almacenadas cargadas.',
    'message.loadFailed': (message) => `No se pudo cargar la configuración: ${message}`,
    'sync.noDate': 'sin fecha',
    'sync.noSuccess': 'sin sincronizaciones exitosas',
    'sync.noStatus': 'Sin estado disponible',
    'sync.statusTemplate': ({ message, updatedAt, lastSuccess, intervalSeconds }) => `${message} Última actualización: ${updatedAt}. Último éxito: ${lastSuccess}. Intervalo: ${intervalSeconds} segundos.`,
    'interval.minute': '1 minuto',
    'interval.seconds': (value) => `${value} segundos`,
    'state.idle': 'Sin iniciar',
    'state.scheduled': 'Programada',
    'state.running': 'En curso',
    'state.success': 'Correcta',
    'state.error': 'Error',
    'state.skipped': 'Omitida',
    'state.stopped': 'Detenida',
    'state.paused': 'Pausada',
    'state.unknown': 'Desconocida'
  }
};

function resolveLocale(locale) {
  const language = String(locale ?? '').toLowerCase().split(/[-_]/)[0];
  return translations[language] ? language : 'en';
}

function translate(key, ...args) {
  const value = translations[currentLocale]?.[key] ?? translations.en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}

function applyTranslations() {
  document.documentElement.lang = currentLocale;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
  });
  updateIntervalLabel();
}

const form = document.querySelector('#settingsForm');
const messages = document.querySelector('#messages');
const syncStatus = document.querySelector('#syncStatus');
const syncBadge = document.querySelector('#syncBadge');
const syncIntervalLabel = document.querySelector('#syncIntervalLabel');
const logEntries = document.querySelector('#logEntries');

const fields = {
  cmisUrl: document.querySelector('#cmisUrl'),
  username: document.querySelector('#username'),
  secretKind: document.querySelector('#secretKind'),
  secretValue: document.querySelector('#secretValue'),
  localFolder: document.querySelector('#localFolder'),
  syncIntervalSeconds: document.querySelector('#syncIntervalSeconds'),
  runInBackground: document.querySelector('#runInBackground')
};

const metrics = {
  downloaded: document.querySelector('#filesDownloaded'),
  updated: document.querySelector('#filesUpdated'),
  deleted: document.querySelector('#filesDeleted')
};

function collectSettings() {
  return {
    cmisUrl: fields.cmisUrl.value,
    username: fields.username.value,
    secretKind: fields.secretKind.value,
    secretValue: fields.secretValue.value,
    localFolder: fields.localFolder.value,
    syncIntervalSeconds: Number(fields.syncIntervalSeconds.value),
    runInBackground: fields.runInBackground.checked
  };
}

function applySettings(settings) {
  fields.cmisUrl.value = settings.cmisUrl ?? '';
  fields.username.value = settings.username ?? '';
  fields.secretKind.value = settings.secret?.kind ?? 'password';
  fields.secretValue.value = settings.secretValue ?? '';
  fields.localFolder.value = settings.localFolder ?? '';
  fields.syncIntervalSeconds.value = settings.syncIntervalSeconds ?? 60;
  fields.runInBackground.checked = settings.runInBackground ?? true;
  updateIntervalLabel();

  if (settings.syncStatus) {
    renderSyncStatus(settings.syncStatus);
  }
}

function showMessage(text, success = false) {
  messages.textContent = text;
  messages.classList.toggle('success', success);
}

function updateIntervalLabel() {
  const value = Number(fields.syncIntervalSeconds.value || 60);
  syncIntervalLabel.textContent = value === 60 ? translate('interval.minute') : translate('interval.seconds', value);
}

function renderLogEntries(entries = []) {
  logEntries.replaceChildren(...entries.map(createLogEntryElement));
  logEntries.scrollTop = logEntries.scrollHeight;
}

function appendLogEntry(entry) {
  logEntries.append(createLogEntryElement(entry));
  while (logEntries.children.length > 200) {
    logEntries.firstElementChild?.remove();
  }
  logEntries.scrollTop = logEntries.scrollHeight;
}

function createLogEntryElement(entry) {
  const item = document.createElement('li');
  item.className = 'log-entry';
  item.dataset.level = entry.level ?? 'info';

  const time = document.createElement('time');
  time.dateTime = entry.timestamp ?? '';
  time.textContent = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '--:--:--';

  const level = document.createElement('span');
  level.className = 'log-level';
  level.textContent = String(entry.level ?? 'info').toUpperCase();

  const message = document.createElement('span');
  message.className = 'log-message';
  message.textContent = entry.message ?? translate('message.noDescription');

  item.append(time, level, message);

  if (entry.details) {
    const details = document.createElement('pre');
    details.textContent = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details, null, 2);
    item.append(details);
  }

  return item;
}

async function validateDraft() {
  const result = await window.cmisPortable.validateSettings(collectSettings());
  if (result.valid) {
    showMessage(translate('message.validSettings'), true);
    return true;
  }

  showMessage(result.errors.map((error) => error.message).join(' '));
  return false;
}

function renderSyncStatus(status = {}) {
  const result = status.result ?? {};
  const updatedAt = status.updatedAt ? new Date(status.updatedAt).toLocaleString() : translate('sync.noDate');
  const lastSuccess = status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleString() : translate('sync.noSuccess');
  const intervalSeconds = Math.round((status.intervalMs ?? 60_000) / 1000);

  syncBadge.textContent = getStateLabel(status.state, status.paused);
  syncBadge.dataset.state = status.state ?? 'idle';
  syncStatus.textContent = translate('sync.statusTemplate', {
    message: status.message ?? translate('sync.noStatus'),
    updatedAt,
    lastSuccess,
    intervalSeconds
  });
  metrics.downloaded.textContent = result.downloaded ?? 0;
  metrics.updated.textContent = result.updated ?? 0;
  metrics.deleted.textContent = result.deleted ?? 0;
}

function getStateLabel(state, paused) {
  if (paused) {
    return translate('state.paused');
  }

  const stateKey = `state.${state}`;
  return translations[currentLocale]?.[stateKey] || translations.en[stateKey] || translate('state.unknown');
}

async function runSyncAction(action, successMessage) {
  try {
    const status = await action();
    renderSyncStatus(status);
    showMessage(successMessage, true);
  } catch (error) {
    showMessage(translate('message.syncUpdateFailed', error.message));
  }
}

document.querySelector('#chooseFolder').addEventListener('click', async () => {
  const folder = await window.cmisPortable.chooseFolder();
  if (folder) {
    fields.localFolder.value = folder;
  }
});

fields.syncIntervalSeconds.addEventListener('input', updateIntervalLabel);

document.querySelector('#validate').addEventListener('click', validateDraft);

document.querySelector('#minimizeToTray').addEventListener('click', () => {
  window.cmisPortable.minimizeToTray();
});

document.querySelector('#quitApp').addEventListener('click', () => {
  window.cmisPortable.quitApp();
});

document.querySelector('#startSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.startSync(), translate('message.syncStarted'));
});

document.querySelector('#pauseSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.pauseSync(), translate('message.syncPaused'));
});

document.querySelector('#forceSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.forceSync(), translate('message.manualSyncDone'));
});

document.querySelector('#refreshSyncStatus').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.getSyncStatus(), translate('message.statusRefreshed'));
});

document.querySelector('#clearLogs').addEventListener('click', async () => {
  const entries = await window.cmisPortable.clearLogs();
  renderLogEntries(entries);
});

document.querySelector('#clearConnection').addEventListener('click', async () => {
  const confirmed = window.confirm(translate('message.clearConfirm'));
  if (!confirmed) {
    return;
  }

  try {
    const cleared = await window.cmisPortable.clearSettings();
    applySettings(cleared);
    showMessage(translate('message.connectionCleared'), true);
  } catch (error) {
    showMessage(translate('message.connectionClearFailed', error.message));
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const isValid = await validateDraft();
  if (!isValid) {
    return;
  }

  const saved = await window.cmisPortable.saveSettings(collectSettings());
  applySettings(saved);
  showMessage(translate('message.connectionSaved'), true);
});

window.cmisPortable.onSyncStatus(renderSyncStatus);
window.cmisPortable.onLogEntry(appendLogEntry);

async function initialize() {
  currentLocale = resolveLocale(await window.cmisPortable.getLocale());
  applyTranslations();
  window.cmisPortable.getLogs().then(renderLogEntries);

  window.cmisPortable.loadSettings()
    .then((settings) => {
      applySettings(settings);
      if (settings.cmisUrl) {
        showMessage(translate('message.existingLoaded'), true);
      }
    })
    .catch((error) => showMessage(translate('message.loadFailed', error.message)));
}

initialize();
