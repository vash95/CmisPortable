let currentLocale = 'en';

const translations = window.cmisPortableRendererTranslations;

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
const appTabs = Array.from(document.querySelectorAll('.app-tab'));
const appTabPanels = Array.from(document.querySelectorAll('.tab-panel'));
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

function setActiveAppTab(tabName) {
  appTabs.forEach((tab) => {
    const isActive = tab.dataset.appTabTarget === tabName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  appTabPanels.forEach((panel) => {
    const isActive = panel.dataset.appTab === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
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
  setActiveAppTab('configuration');
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
    localFolder: draft.localFolder || '/tmp/cmisic2-validation'
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

appTabs.forEach((button) => {
  button.addEventListener('click', () => setActiveAppTab(button.dataset.appTabTarget));
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
