let currentLocale = 'en';

const translations = {
  en: {
    'hero.eyebrow': 'Step-by-step wizard',
    'hero.title': 'Configure your CMIS sync',
    'hero.description': 'Connect, choose the source folder, set the local path, and review activity logs while the app runs.',
    'action.minimizeToTray': 'Minimize to tray',
    'action.quitApp': 'Close application',
    'field.cmisUrl': 'CMIS URL',
    'placeholder.cmisUrl': 'https://server/ic2v11/atom/cmis',
    'field.username': 'Username',
    'field.secretValue': 'Password',
    'field.localFolder': 'Local sync folder',
    'field.remoteFolder': 'CMIS source folder',
    'placeholder.localFolder': '/path/to/folder',
    'action.chooseFolder': 'Choose…',
    'field.syncInterval': 'Sync interval (10 to 60 seconds)',
    'field.runInBackground': 'Keep running in the background when the window is closed',
    'action.clearConnection': 'Remove current connection',
    'action.validate': 'Validate',
    'action.validateConnection': 'Validate connection',
    'action.nextFolders': 'Next: source folders',
    'action.backConnection': 'Back: connection',
    'action.nextSchedule': 'Next: sync time',
    'action.backFolders': 'Back: source and path',
    'action.nextManage': 'Next: add or delete',
    'action.backSchedule': 'Back: sync time',
    'action.loadRemoteFolders': 'Show source folders',
    'action.selectRemoteRoot': 'Use repository root',
    'action.remoteUp': 'Back',
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
    'message.connectionValid': 'Connection works. You can choose the source folder now.',
    'message.remoteFoldersLoaded': (path) => `Source folders loaded for ${path}.`,
    'message.remoteFoldersEmpty': 'This source folder has no child folders. You can still use it as the sync origin.',
    'message.remoteFoldersFailed': (message) => `Source folders could not be loaded: ${message}`,
    'message.connectionFailed': (message) => `Connection could not be validated: ${message || 'No additional details were returned. Check the log console.'}`,
    'message.connectionRequired': 'Validate the connection before leaving the connection step.',
    'message.remoteFolderSelected': (path) => `Selected source folder: ${path}.`,
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
    'wizard.stepsLabel': 'Setup steps',
    'wizard.step.connection': 'Connection',
    'wizard.step.folders': 'Source and path',
    'wizard.step.schedule': 'Sync time',
    'wizard.step.manage': 'Manage',
    'wizard.connection.title': '1. Connection',
    'wizard.connection.description': 'Enter the CMIS server and credentials first. Use Validate connection before choosing folders.',
    'wizard.folders.title': '2. Source folder and local path',
    'wizard.folders.description': 'Load the CMIS source folders, pick where synchronization should start, then choose the local destination.',
    'wizard.schedule.title': '3. Synchronization time',
    'wizard.schedule.description': 'Choose how often the app checks CMIS and whether it keeps running in the background.',
    'wizard.manage.title': '4. Add a new option or delete the current one',
    'wizard.manage.description': 'Save this setup as the active sync option, or remove the current connection and start over.',
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
    'hero.eyebrow': 'Asistente por pasos',
    'hero.title': 'Configura tu sincronización CMIS',
    'hero.description': 'Conecta, elige la carpeta de origen, define la ruta local y revisa los logs mientras la aplicación trabaja.',
    'action.minimizeToTray': 'Minimizar a bandeja',
    'action.quitApp': 'Cerrar aplicación',
    'field.cmisUrl': 'URL CMIS',
    'placeholder.cmisUrl': 'https://servidor/ic2v11/atom/cmis',
    'field.username': 'Usuario',
    'field.secretValue': 'Contraseña',
    'field.localFolder': 'Carpeta local de sincronización',
    'field.remoteFolder': 'Carpeta de origen CMIS',
    'placeholder.localFolder': '/ruta/a/carpeta',
    'action.chooseFolder': 'Elegir…',
    'field.syncInterval': 'Intervalo de sincronización (10 a 60 segundos)',
    'field.runInBackground': 'Seguir ejecutando en segundo plano al cerrar la ventana',
    'action.clearConnection': 'Eliminar conexión actual',
    'action.validate': 'Validar',
    'action.validateConnection': 'Validar conexión',
    'action.nextFolders': 'Siguiente: carpetas de origen',
    'action.backConnection': 'Volver: conexión',
    'action.nextSchedule': 'Siguiente: tiempo de sincronización',
    'action.backFolders': 'Volver: origen y ruta',
    'action.nextManage': 'Siguiente: agregar o borrar',
    'action.backSchedule': 'Volver: tiempo',
    'action.loadRemoteFolders': 'Mostrar carpetas de origen',
    'action.selectRemoteRoot': 'Usar raíz del repositorio',
    'action.remoteUp': 'Atrás',
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
    'message.connectionValid': 'La conexión funciona. Ya puedes elegir la carpeta de origen.',
    'message.remoteFoldersLoaded': (path) => `Carpetas de origen cargadas para ${path}.`,
    'message.remoteFoldersEmpty': 'Esta carpeta de origen no tiene subcarpetas. Aun así puedes usarla como origen de sincronización.',
    'message.remoteFoldersFailed': (message) => `No se pudieron cargar las carpetas de origen: ${message}`,
    'message.connectionFailed': (message) => `No se pudo validar la conexión: ${message || 'No se recibieron más detalles. Revisa la consola de log.'}`,
    'message.connectionRequired': 'Valida la conexión antes de salir de la pestaña de conexión.',
    'message.remoteFolderSelected': (path) => `Carpeta de origen seleccionada: ${path}.`,
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
    'wizard.stepsLabel': 'Pasos de configuración',
    'wizard.step.connection': 'Conexión',
    'wizard.step.folders': 'Origen y ruta',
    'wizard.step.schedule': 'Tiempo',
    'wizard.step.manage': 'Gestionar',
    'wizard.connection.title': '1. Conexión',
    'wizard.connection.description': 'Introduce primero el servidor CMIS y las credenciales. Usa Validar conexión antes de elegir carpetas.',
    'wizard.folders.title': '2. Carpeta de origen y ruta local',
    'wizard.folders.description': 'Carga las carpetas de origen CMIS, elige desde dónde iniciar la sincronización y luego selecciona el destino local.',
    'wizard.schedule.title': '3. Tiempo de sincronización',
    'wizard.schedule.description': 'Elige cada cuánto la aplicación revisa CMIS y si debe seguir ejecutándose en segundo plano.',
    'wizard.manage.title': '4. Agregar una nueva opción o borrar la actual',
    'wizard.manage.description': 'Guarda esta configuración como opción activa de sincronización, o elimina la conexión actual para empezar de nuevo.',
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
const remoteFolderList = document.querySelector('#remoteFolderList');
const remoteFolderLabel = document.querySelector('#remoteFolderLabel');
const wizardSteps = Array.from(document.querySelectorAll('.wizard-step'));
const stepTabs = Array.from(document.querySelectorAll('.step-tab'));
const remoteHistory = [];
let validatedConnectionKey = null;

const fields = {
  cmisUrl: document.querySelector('#cmisUrl'),
  username: document.querySelector('#username'),
  secretValue: document.querySelector('#secretValue'),
  localFolder: document.querySelector('#localFolder'),
  remoteFolderId: document.querySelector('#remoteFolderId'),
  remoteFolderPath: document.querySelector('#remoteFolderPath'),
  remoteFolderName: document.querySelector('#remoteFolderName'),
  syncIntervalSeconds: document.querySelector('#syncIntervalSeconds'),
  runInBackground: document.querySelector('#runInBackground')
};

const metrics = {
  downloaded: document.querySelector('#filesDownloaded'),
  updated: document.querySelector('#filesUpdated'),
  deleted: document.querySelector('#filesDeleted')
};

function completeIc2v11AtomPubUrl(value) {
  const cmisUrl = String(value ?? '').trim();
  if (!cmisUrl) {
    return '';
  }

  try {
    const parsed = new URL(cmisUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 1 && segments[0].toLowerCase() === 'ic2v11') {
      parsed.pathname = '/ic2v11/atom/cmis';
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString().replace(/\/+$/, '');
    }
  } catch {
    return cmisUrl;
  }

  return cmisUrl;
}

function autocompleteCmisUrlField() {
  const completedUrl = completeIc2v11AtomPubUrl(fields.cmisUrl.value);
  if (completedUrl !== fields.cmisUrl.value) {
    fields.cmisUrl.value = completedUrl;
    resetConnectionValidation();
  }
  return completedUrl;
}

function collectSettings() {
  return {
    cmisUrl: completeIc2v11AtomPubUrl(fields.cmisUrl.value),
    username: fields.username.value,
    secretKind: 'password',
    secretValue: fields.secretValue.value,
    localFolder: fields.localFolder.value,
    remoteFolder: {
      id: fields.remoteFolderId.value,
      path: fields.remoteFolderPath.value || '/',
      name: fields.remoteFolderName.value || '/'
    },
    syncIntervalSeconds: Number(fields.syncIntervalSeconds.value),
    runInBackground: fields.runInBackground.checked
  };
}

function applySettings(settings) {
  fields.cmisUrl.value = completeIc2v11AtomPubUrl(settings.cmisUrl ?? '');
  fields.username.value = settings.username ?? '';
  fields.secretValue.value = settings.secretValue ?? '';
  fields.localFolder.value = settings.localFolder ?? '';
  setRemoteFolder(settings.remoteFolder ?? { id: '', path: '/', name: '/' }, false);
  fields.syncIntervalSeconds.value = settings.syncIntervalSeconds ?? 60;
  fields.runInBackground.checked = settings.runInBackground ?? true;
  updateIntervalLabel();

  if (settings.syncStatus) {
    renderSyncStatus(settings.syncStatus);
  }
}


function getConnectionValidationKey(settings = collectSettings()) {
  return JSON.stringify({
    cmisUrl: String(settings.cmisUrl ?? '').trim(),
    username: String(settings.username ?? '').trim(),
    secretValue: settings.secretValue ?? ''
  });
}

function isConnectionValidated() {
  return validatedConnectionKey === getConnectionValidationKey();
}

function resetConnectionValidation() {
  validatedConnectionKey = null;
}

function canOpenStep(stepName) {
  if (stepName === 'connection' || isConnectionValidated()) {
    return true;
  }

  showMessage(translate('message.connectionRequired'));
  return false;
}

function navigateToStep(stepName) {
  if (!canOpenStep(stepName)) {
    return false;
  }

  setActiveStep(stepName);
  return true;
}

function setActiveStep(stepName) {
  wizardSteps.forEach((step) => step.classList.toggle('active', step.dataset.step === stepName));
  stepTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.stepTarget === stepName));
}

function setRemoteFolder(folder, showFeedback = true) {
  const normalized = {
    id: folder?.id ?? '',
    path: folder?.path ?? '/',
    name: folder?.name ?? '/'
  };
  fields.remoteFolderId.value = normalized.id;
  fields.remoteFolderPath.value = normalized.path;
  fields.remoteFolderName.value = normalized.name;
  remoteFolderLabel.textContent = normalized.path;
  if (showFeedback) {
    showMessage(translate('message.remoteFolderSelected', normalized.path), true);
  }
}

function showMessage(text, success = false) {
  messages.textContent = text;
  messages.classList.toggle('success', success);
}

function formatErrorMessage(error) {
  return String(error?.message ?? error ?? '').replace(/^Error invoking remote method '[^']+':\s*/, '');
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


async function validateConnectionOnly() {
  const draft = collectSettings();
  const result = await window.cmisPortable.validateSettings({
    ...draft,
    localFolder: draft.localFolder || '/tmp/cmisportable-validation'
  });
  const blockingErrors = result.errors.filter((error) => !['localFolder', 'syncIntervalSeconds'].includes(error.field));
  if (blockingErrors.length > 0) {
    showMessage(blockingErrors.map((error) => error.message).join(' '));
    return false;
  }
  try {
    const connectionResult = await window.cmisPortable.testConnection(draft);
    if (connectionResult?.valid === false) {
      throw new Error(connectionResult.message);
    }
    validatedConnectionKey = getConnectionValidationKey(draft);
    showMessage(translate('message.connectionValid'), true);
    return true;
  } catch (error) {
    showMessage(translate('message.connectionFailed', formatErrorMessage(error)));
    return false;
  }
}

async function loadRemoteFolders(parentFolder = null) {
  const canConnect = await validateConnectionOnly();
  if (!canConnect) {
    return;
  }

  try {
    const result = await window.cmisPortable.listRemoteFolders({
      ...collectSettings(),
      parentFolder
    });
    renderRemoteFolders(result);
    showMessage(
      (result.folders ?? []).length === 0
        ? translate('message.remoteFoldersEmpty')
        : translate('message.remoteFoldersLoaded', result.current?.path ?? '/'),
      true
    );
  } catch (error) {
    showMessage(translate('message.remoteFoldersFailed', error.message));
  }
}

function renderRemoteFolders(result = {}) {
  const current = result.current ?? { id: '', name: '/', path: '/' };
  setRemoteFolder(current, false);
  remoteFolderList.replaceChildren(...(result.folders ?? []).map((folder) => {
    const item = document.createElement('li');
    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'folder-select';
    selectButton.textContent = folder.name;
    selectButton.addEventListener('click', () => setRemoteFolder(folder));

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'ghost';
    openButton.textContent = '›';
    openButton.setAttribute('aria-label', folder.path);
    openButton.addEventListener('click', () => {
      remoteHistory.push(current);
      loadRemoteFolders(folder);
    });

    item.append(selectButton, openButton);
    return item;
  }));
}

document.querySelector('#chooseFolder').addEventListener('click', async () => {
  const folder = await window.cmisPortable.chooseFolder();
  if (folder) {
    fields.localFolder.value = folder;
  }
});

fields.syncIntervalSeconds.addEventListener('input', updateIntervalLabel);
fields.cmisUrl.addEventListener('blur', autocompleteCmisUrlField);

document.querySelector('#validate').addEventListener('click', validateConnectionOnly);

document.querySelector('#loadRemoteFolders').addEventListener('click', () => loadRemoteFolders());

document.querySelector('#selectRemoteRoot').addEventListener('click', () => {
  remoteHistory.length = 0;
  setRemoteFolder({ id: '', name: '/', path: '/' });
  remoteFolderList.replaceChildren();
});

document.querySelector('#remoteFolderUp').addEventListener('click', () => {
  const previous = remoteHistory.pop();
  loadRemoteFolders(previous ?? null);
});

document.querySelectorAll('[data-next-step]').forEach((button) => {
  button.addEventListener('click', () => navigateToStep(button.dataset.nextStep));
});

stepTabs.forEach((button) => {
  button.addEventListener('click', () => navigateToStep(button.dataset.stepTarget));
});

[fields.cmisUrl, fields.username, fields.secretValue].forEach((field) => {
  field.addEventListener('input', resetConnectionValidation);
});

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
