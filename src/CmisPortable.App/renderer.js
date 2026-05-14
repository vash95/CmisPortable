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
  syncIntervalLabel.textContent = value === 60 ? '1 minuto' : `${value} segundos`;
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
  message.textContent = entry.message ?? 'Evento sin descripción';

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
    showMessage('La configuración es válida.', true);
    return true;
  }

  showMessage(result.errors.map((error) => error.message).join(' '));
  return false;
}

function renderSyncStatus(status = {}) {
  const result = status.result ?? {};
  const updatedAt = status.updatedAt ? new Date(status.updatedAt).toLocaleString() : 'sin fecha';
  const lastSuccess = status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleString() : 'sin sincronizaciones exitosas';
  const intervalSeconds = Math.round((status.intervalMs ?? 60_000) / 1000);

  syncBadge.textContent = getStateLabel(status.state, status.paused);
  syncBadge.dataset.state = status.state ?? 'idle';
  syncStatus.textContent = `${status.message ?? 'Sin estado disponible'} Última actualización: ${updatedAt}. Último éxito: ${lastSuccess}. Intervalo: ${intervalSeconds} segundos.`;
  metrics.downloaded.textContent = result.downloaded ?? 0;
  metrics.updated.textContent = result.updated ?? 0;
  metrics.deleted.textContent = result.deleted ?? 0;
}

function getStateLabel(state, paused) {
  if (paused) {
    return 'Pausada';
  }

  const labels = {
    idle: 'Sin iniciar',
    scheduled: 'Programada',
    running: 'En curso',
    success: 'Correcta',
    error: 'Error',
    skipped: 'Omitida',
    stopped: 'Detenida'
  };
  return labels[state] ?? 'Desconocida';
}

async function runSyncAction(action, successMessage) {
  try {
    const status = await action();
    renderSyncStatus(status);
    showMessage(successMessage, true);
  } catch (error) {
    showMessage(`No se pudo actualizar la sincronización: ${error.message}`);
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

document.querySelector('#startSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.startSync(), 'Sincronización en segundo plano iniciada.');
});

document.querySelector('#pauseSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.pauseSync(), 'Sincronización en segundo plano pausada.');
});

document.querySelector('#forceSync').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.forceSync(), 'Sincronización manual ejecutada.');
});

document.querySelector('#refreshSyncStatus').addEventListener('click', () => {
  runSyncAction(() => window.cmisPortable.getSyncStatus(), 'Último estado actualizado.');
});

document.querySelector('#clearLogs').addEventListener('click', async () => {
  const entries = await window.cmisPortable.clearLogs();
  renderLogEntries(entries);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const isValid = await validateDraft();
  if (!isValid) {
    return;
  }

  const saved = await window.cmisPortable.saveSettings(collectSettings());
  applySettings(saved);
  showMessage('Configuración guardada. La sincronización en segundo plano está programada.', true);
});

window.cmisPortable.onSyncStatus(renderSyncStatus);
window.cmisPortable.onLogEntry(appendLogEntry);

updateIntervalLabel();
window.cmisPortable.getLogs().then(renderLogEntries);

window.cmisPortable.loadSettings()
  .then((settings) => {
    applySettings(settings);
    if (settings.cmisUrl) {
      showMessage('Configuración existente cargada.', true);
    }
  })
  .catch((error) => showMessage(`No se pudo cargar la configuración: ${error.message}`));
