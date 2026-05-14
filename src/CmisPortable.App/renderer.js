const form = document.querySelector('#settingsForm');
const messages = document.querySelector('#messages');
const syncStatus = document.querySelector('#syncStatus');
const syncBadge = document.querySelector('#syncBadge');
const credentialStatus = document.querySelector('#credentialStatus');

const fields = {
  cmisUrl: document.querySelector('#cmisUrl'),
  username: document.querySelector('#username'),
  secretKind: document.querySelector('#secretKind'),
  secretValue: document.querySelector('#secretValue'),
  localFolder: document.querySelector('#localFolder'),
  syncIntervalSeconds: document.querySelector('#syncIntervalSeconds'),
  runInBackground: document.querySelector('#runInBackground')
};

let currentSecretMetadata = { kind: 'password', credentialId: '', storage: 'none' };

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
    secret: currentSecretMetadata,
    localFolder: fields.localFolder.value,
    syncIntervalSeconds: Number(fields.syncIntervalSeconds.value),
    runInBackground: fields.runInBackground.checked
  };
}

function applySettings(settings) {
  fields.cmisUrl.value = settings.cmisUrl ?? '';
  fields.username.value = settings.username ?? '';
  currentSecretMetadata = settings.secret ?? { kind: 'password', credentialId: '', storage: 'none' };
  fields.secretKind.value = currentSecretMetadata.kind ?? 'password';
  fields.secretValue.value = settings.secretValue ?? '';
  fields.secretValue.placeholder = settings.hasSavedCredential
    ? 'Credencial guardada; escribe un valor para reemplazarla'
    : '';
  renderCredentialStatus(settings);
  fields.localFolder.value = settings.localFolder ?? '';
  fields.syncIntervalSeconds.value = settings.syncIntervalSeconds ?? 60;
  fields.runInBackground.checked = settings.runInBackground ?? true;

  if (settings.syncStatus) {
    renderSyncStatus(settings.syncStatus);
  }
}

function showMessage(text, success = false) {
  messages.textContent = text;
  messages.classList.toggle('success', success);
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

function renderCredentialStatus(settings = {}) {
  const credentialId = settings.secret?.credentialId;
  if (!credentialId) {
    credentialStatus.textContent = 'Sin credenciales guardadas.';
    return;
  }

  credentialStatus.textContent = `Credencial guardada en ${settings.secret.storage}: ${credentialId}`;
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

document.querySelector('#deleteCredentials').addEventListener('click', async () => {
  try {
    const settings = await window.cmisPortable.deleteCredentials();
    applySettings(settings);
    showMessage(settings.credentialDeleted
      ? 'Credenciales guardadas eliminadas.'
      : 'No había credenciales guardadas para eliminar.', true);
  } catch (error) {
    showMessage(`No se pudieron eliminar las credenciales: ${error.message}`);
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
  showMessage('Configuración guardada. La sincronización en segundo plano está programada.', true);
});

window.cmisPortable.onSyncStatus(renderSyncStatus);

window.cmisPortable.loadSettings()
  .then((settings) => {
    applySettings(settings);
    if (settings.cmisUrl) {
      showMessage('Configuración existente cargada.', true);
    }
  })
  .catch((error) => showMessage(`No se pudo cargar la configuración: ${error.message}`));
