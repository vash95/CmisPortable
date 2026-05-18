let currentLocale = 'en';

const translations = {
  en: {
    'hero.eyebrow': 'CmisIC2',
    'hero.title': 'Sincronización automática de carpetas del producto IC2',
    'hero.description': '',
    'action.minimizeToTray': 'Minimize to tray',
    'action.quitApp': 'Close application',
    'action.startTutorial': 'Open tutorial',
    'action.closeTutorial': 'Close tutorial',
    'action.tutorialPrevious': 'Previous',
    'action.tutorialNext': 'Next',
    'action.tutorialFinish': 'Finish',
    'action.tutorialShowStep': 'Show this step',
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
    'action.clearConnection': 'Delete configured connection',
    'action.validate': 'Validate',
    'action.validateConnection': 'Validate connection',
    'action.nextFolders': 'Next: source folders',
    'action.backConnection': 'Back: connection',
    'action.nextSchedule': 'Next: sync time',
    'action.backFolders': 'Back: source and path',
    'action.nextManage': 'Next: save',
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
    'connections.title': 'Configured connections',
    'connections.description': 'Saved CMIS sync options available in this app. Delete a connection here when you no longer need it.',
    'connections.empty': 'No configured connections yet. Save a new connection to see it here.',
    'connections.active': 'Active',
    'connections.url': 'URL',
    'connections.user': 'User',
    'connections.remoteFolder': 'Remote folder',
    'connections.localFolder': 'Local folder',
    'connections.interval': 'Interval',
    'action.showLogs': 'Show log console',
    'action.hideLogs': 'Hide log console',
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
    'message.clearConfirm': 'This configured connection and its stored credentials will be deleted. You can create a new connection afterwards. Continue?',
    'message.connectionCleared': 'Configured connection deleted. Enter the details to create a new connection.',
    'message.connectionClearFailed': (message) => `Configured connection could not be deleted: ${message}`,
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
    'tutorial.eyebrow': 'Guided help',
    'tutorial.title': 'Need help getting started?',
    'tutorial.description': 'Launch the tutorial to see what each step does before you save your first CMIS connection.',
    'tutorial.stepCount': ({ current, total }) => `Step ${current} of ${total}`,
    'tutorial.connection.title': 'Connect to CMIS',
    'tutorial.connection.body': 'Start by entering the CMIS endpoint and your credentials. The Validate connection button confirms that the app can reach the repository.',
    'tutorial.connection.checklist': ['Use the full AtomPub CMIS URL.', 'Enter the user that has access to the documents.', 'Validate before moving to folder selection.'],
    'tutorial.folders.title': 'Choose the source and destination',
    'tutorial.folders.body': 'Load the remote folders, pick the CMIS folder to sync from, and select the local folder where files will be copied.',
    'tutorial.folders.checklist': ['Show source folders after validating the connection.', 'Select a remote folder or use the repository root.', 'Choose an empty or dedicated local folder.'],
    'tutorial.schedule.title': 'Set the sync rhythm',
    'tutorial.schedule.body': 'Decide how frequently CmisPortable checks the server and whether it should keep syncing from the tray when the window is closed.',
    'tutorial.schedule.checklist': ['Use shorter intervals for active workspaces.', 'Keep background mode enabled for unattended sync.', 'You can still pause sync later from the status panel.'],
    'tutorial.manage.title': 'Save and monitor',
    'tutorial.manage.body': 'Save the configuration, review the active connection, then use the status and log panels to monitor synchronization.',
    'tutorial.manage.checklist': ['Save the new connection once all required fields are complete.', 'Start or pause sync from the status card.', 'Open the log console if you need troubleshooting details.'],
    'wizard.connection.title': '1. Connection',
    'wizard.connection.description': 'Enter the CMIS server and credentials first. Use Validate connection before choosing folders.',
    'wizard.folders.title': '2. Source folder and local path',
    'wizard.folders.description': 'Load the CMIS source folders, pick where synchronization should start, then choose the local destination.',
    'wizard.schedule.title': '3. Synchronization time',
    'wizard.schedule.description': 'Choose how often the app checks CMIS and whether it keeps running in the background.',
    'wizard.manage.title': '4. Save this option',
    'wizard.manage.description': 'Save this setup as the active sync option. Saved connections can be deleted from Configured connections.',
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
    'hero.eyebrow': 'CmisIC2',
    'hero.title': 'Sincronización automática de carpetas del producto IC2',
    'hero.description': '',
    'action.minimizeToTray': 'Minimizar a bandeja',
    'action.quitApp': 'Cerrar aplicación',
    'action.startTutorial': 'Abrir tutorial',
    'action.closeTutorial': 'Cerrar tutorial',
    'action.tutorialPrevious': 'Anterior',
    'action.tutorialNext': 'Siguiente',
    'action.tutorialFinish': 'Finalizar',
    'action.tutorialShowStep': 'Mostrar este paso',
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
    'action.clearConnection': 'Eliminar conexión configurada',
    'action.validate': 'Validar',
    'action.validateConnection': 'Validar conexión',
    'action.nextFolders': 'Siguiente: carpetas de origen',
    'action.backConnection': 'Volver: conexión',
    'action.nextSchedule': 'Siguiente: tiempo de sincronización',
    'action.backFolders': 'Volver: origen y ruta',
    'action.nextManage': 'Siguiente: guardar',
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
    'connections.title': 'Conexiones configuradas',
    'connections.description': 'Opciones de sincronización CMIS guardadas en esta aplicación. Elimina desde aquí una conexión cuando ya no la necesites.',
    'connections.empty': 'Todavía no hay conexiones configuradas. Guarda una nueva conexión para verla aquí.',
    'connections.active': 'Activa',
    'connections.url': 'URL',
    'connections.user': 'Usuario',
    'connections.remoteFolder': 'Carpeta remota',
    'connections.localFolder': 'Carpeta local',
    'connections.interval': 'Intervalo',
    'action.showLogs': 'Mostrar consola de log',
    'action.hideLogs': 'Ocultar consola de log',
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
    'message.clearConfirm': 'Se eliminará esta conexión configurada y sus credenciales almacenadas. Después podrás crear una nueva conexión. ¿Continuar?',
    'message.connectionCleared': 'Conexión configurada eliminada. Introduce los datos para crear una nueva conexión.',
    'message.connectionClearFailed': (message) => `No se pudo eliminar la conexión configurada: ${message}`,
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
    'tutorial.eyebrow': 'Ayuda guiada',
    'tutorial.title': '¿Necesitas ayuda para empezar?',
    'tutorial.description': 'Abre el tutorial para ver qué hace cada paso antes de guardar tu primera conexión CMIS.',
    'tutorial.stepCount': ({ current, total }) => `Paso ${current} de ${total}`,
    'tutorial.connection.title': 'Conecta con CMIS',
    'tutorial.connection.body': 'Empieza introduciendo el endpoint CMIS y tus credenciales. El botón Validar conexión confirma que la app puede acceder al repositorio.',
    'tutorial.connection.checklist': ['Usa la URL CMIS AtomPub completa.', 'Introduce un usuario con acceso a los documentos.', 'Valida antes de pasar a la selección de carpetas.'],
    'tutorial.folders.title': 'Elige origen y destino',
    'tutorial.folders.body': 'Carga las carpetas remotas, selecciona la carpeta CMIS desde la que sincronizar y elige la carpeta local donde se copiarán los archivos.',
    'tutorial.folders.checklist': ['Muestra las carpetas de origen después de validar la conexión.', 'Selecciona una carpeta remota o usa la raíz del repositorio.', 'Elige una carpeta local vacía o dedicada.'],
    'tutorial.schedule.title': 'Define el ritmo de sincronización',
    'tutorial.schedule.body': 'Decide cada cuánto CmisPortable revisa el servidor y si debe seguir sincronizando desde la bandeja al cerrar la ventana.',
    'tutorial.schedule.checklist': ['Usa intervalos cortos para espacios de trabajo activos.', 'Mantén el segundo plano activado para sincronización desatendida.', 'Después puedes pausar la sincronización desde el panel de estado.'],
    'tutorial.manage.title': 'Guarda y monitoriza',
    'tutorial.manage.body': 'Guarda la configuración, revisa la conexión activa y usa los paneles de estado y logs para seguir la sincronización.',
    'tutorial.manage.checklist': ['Guarda la nueva conexión cuando todos los campos requeridos estén completos.', 'Inicia o pausa la sincronización desde la tarjeta de estado.', 'Abre la consola de log si necesitas detalles para solucionar problemas.'],
    'wizard.connection.title': '1. Conexión',
    'wizard.connection.description': 'Introduce primero el servidor CMIS y las credenciales. Usa Validar conexión antes de elegir carpetas.',
    'wizard.folders.title': '2. Carpeta de origen y ruta local',
    'wizard.folders.description': 'Carga las carpetas de origen CMIS, elige desde dónde iniciar la sincronización y luego selecciona el destino local.',
    'wizard.schedule.title': '3. Tiempo de sincronización',
    'wizard.schedule.description': 'Elige cada cuánto la aplicación revisa CMIS y si debe seguir ejecutándose en segundo plano.',
    'wizard.manage.title': '4. Guardar esta opción',
    'wizard.manage.description': 'Guarda esta configuración como opción activa de sincronización. Las conexiones guardadas se eliminan desde Conexiones configuradas.',
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
const configuredConnections = document.querySelector('#configuredConnections');
const toggleLogConsoleButton = document.querySelector('#toggleLogConsole');
const logConsole = document.querySelector('.log-console');
const logConsoleContent = document.querySelector('#logConsoleContent');
const remoteFolderList = document.querySelector('#remoteFolderList');
const remoteFolderLabel = document.querySelector('#remoteFolderLabel');
const wizardSteps = Array.from(document.querySelectorAll('.wizard-step'));
const stepTabs = Array.from(document.querySelectorAll('.step-tab'));
const tutorialOverlay = document.querySelector('#tutorialOverlay');
const tutorialStepCount = document.querySelector('#tutorialStepCount');
const tutorialStepTitle = document.querySelector('#tutorialStepTitle');
const tutorialStepBody = document.querySelector('#tutorialStepBody');
const tutorialStepChecklist = document.querySelector('#tutorialStepChecklist');
const tutorialPreviousButton = document.querySelector('#tutorialPrevious');
const tutorialNextButton = document.querySelector('#tutorialNext');
const tutorialShowStepButton = document.querySelector('#tutorialShowStep');
const remoteHistory = [];
let validatedConnectionKey = null;
let currentTutorialStep = 0;

const tutorialSteps = [
  { stepName: 'connection', titleKey: 'tutorial.connection.title', bodyKey: 'tutorial.connection.body', checklistKey: 'tutorial.connection.checklist' },
  { stepName: 'folders', titleKey: 'tutorial.folders.title', bodyKey: 'tutorial.folders.body', checklistKey: 'tutorial.folders.checklist' },
  { stepName: 'schedule', titleKey: 'tutorial.schedule.title', bodyKey: 'tutorial.schedule.body', checklistKey: 'tutorial.schedule.checklist' },
  { stepName: 'manage', titleKey: 'tutorial.manage.title', bodyKey: 'tutorial.manage.body', checklistKey: 'tutorial.manage.checklist' }
];

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

  renderConfiguredConnections(settings);

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

function openTutorial(stepIndex = 0) {
  currentTutorialStep = Math.min(Math.max(stepIndex, 0), tutorialSteps.length - 1);
  tutorialOverlay.hidden = false;
  renderTutorialStep();
  tutorialNextButton.focus();
}

function closeTutorial() {
  tutorialOverlay.hidden = true;
  clearTutorialHighlight();
}

function renderTutorialStep() {
  const step = tutorialSteps[currentTutorialStep];
  const checklist = translate(step.checklistKey);

  tutorialStepCount.textContent = translate('tutorial.stepCount', {
    current: currentTutorialStep + 1,
    total: tutorialSteps.length
  });
  tutorialStepTitle.textContent = translate(step.titleKey);
  tutorialStepBody.textContent = translate(step.bodyKey);
  tutorialStepChecklist.replaceChildren(...checklist.map((item) => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    return listItem;
  }));
  tutorialPreviousButton.disabled = currentTutorialStep === 0;
  tutorialNextButton.textContent = translate(currentTutorialStep === tutorialSteps.length - 1
    ? 'action.tutorialFinish'
    : 'action.tutorialNext');
}

function showTutorialStepInWizard() {
  const step = tutorialSteps[currentTutorialStep];
  setActiveStep(step.stepName);
  clearTutorialHighlight();
  const activeStep = wizardSteps.find((wizardStep) => wizardStep.dataset.step === step.stepName);
  activeStep?.classList.add('tutorial-highlight');
  activeStep?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearTutorialHighlight() {
  wizardSteps.forEach((step) => step.classList.remove('tutorial-highlight'));
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

function renderConfiguredConnections(settings = {}) {
  const hasConnection = Boolean(String(settings.cmisUrl ?? '').trim());
  if (!hasConnection) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'connection-empty';
    emptyItem.textContent = translate('connections.empty');
    configuredConnections.replaceChildren(emptyItem);
    return;
  }

  const item = document.createElement('li');
  item.className = 'connection-card';

  const titleRow = document.createElement('div');
  titleRow.className = 'connection-title-row';

  const title = document.createElement('strong');
  title.textContent = settings.remoteFolder?.path ?? '/';

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.dataset.state = 'success';
  badge.textContent = translate('connections.active');

  const titleMain = document.createElement('div');
  titleMain.className = 'connection-title-main';
  titleMain.append(title, badge);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'secondary danger';
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete-configured-connection';
  deleteButton.textContent = translate('action.clearConnection');

  titleRow.append(titleMain, deleteButton);

  const details = document.createElement('dl');
  details.className = 'connection-details';
  appendConnectionDetail(details, translate('connections.url'), settings.cmisUrl);
  appendConnectionDetail(details, translate('connections.user'), settings.username);
  appendConnectionDetail(details, translate('connections.remoteFolder'), settings.remoteFolder?.path ?? '/');
  appendConnectionDetail(details, translate('connections.localFolder'), settings.localFolder);
  appendConnectionDetail(details, translate('connections.interval'), settings.syncIntervalSeconds === 60
    ? translate('interval.minute')
    : translate('interval.seconds', settings.syncIntervalSeconds ?? 60));

  item.append(titleRow, details);
  configuredConnections.replaceChildren(item);
}

function appendConnectionDetail(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value || '—';

  list.append(term, description);
}

function setLogConsoleExpanded(expanded) {
  logConsole.classList.toggle('is-collapsed', !expanded);
  logConsoleContent.hidden = !expanded;
  toggleLogConsoleButton.setAttribute('aria-expanded', String(expanded));
  toggleLogConsoleButton.textContent = translate(expanded ? 'action.hideLogs' : 'action.showLogs');
}

function showLogConsolePanel() {
  logConsole.hidden = false;
  setLogConsoleExpanded(true);
}

function hideLogConsolePanel() {
  setLogConsoleExpanded(false);
  logConsole.hidden = true;
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

document.querySelector('#startTutorial').addEventListener('click', () => openTutorial());
document.querySelector('#startTutorialCard').addEventListener('click', () => openTutorial());
document.querySelector('#closeTutorial').addEventListener('click', closeTutorial);
tutorialPreviousButton.addEventListener('click', () => {
  currentTutorialStep -= 1;
  renderTutorialStep();
});
tutorialNextButton.addEventListener('click', () => {
  if (currentTutorialStep === tutorialSteps.length - 1) {
    closeTutorial();
    return;
  }

  currentTutorialStep += 1;
  renderTutorialStep();
});
tutorialShowStepButton.addEventListener('click', showTutorialStepInWizard);
tutorialOverlay.addEventListener('click', (event) => {
  if (event.target === tutorialOverlay) {
    closeTutorial();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !tutorialOverlay.hidden) {
    closeTutorial();
  }
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

toggleLogConsoleButton.addEventListener('click', () => {
  setLogConsoleExpanded(logConsoleContent.hidden);
});

document.querySelector('#clearLogs').addEventListener('click', async () => {
  const entries = await window.cmisPortable.clearLogs();
  renderLogEntries(entries);
});

configuredConnections.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('[data-action="delete-configured-connection"]');
  if (!deleteButton) {
    return;
  }

  const confirmed = window.confirm(translate('message.clearConfirm'));
  if (!confirmed) {
    return;
  }

  try {
    deleteButton.disabled = true;
    const cleared = await window.cmisPortable.clearSettings();
    applySettings(cleared);
    showMessage(translate('message.connectionCleared'), true);
  } catch (error) {
    deleteButton.disabled = false;
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
window.cmisPortable.onShowSettings(hideLogConsolePanel);
window.cmisPortable.onShowLogConsole(showLogConsolePanel);

async function initialize() {
  currentLocale = resolveLocale(await window.cmisPortable.getLocale());
  applyTranslations();
  hideLogConsolePanel();
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
