const form = document.querySelector('#settingsForm');
const messages = document.querySelector('#messages');
const syncStatus = document.querySelector('#syncStatus');

const fields = {
  cmisUrl: document.querySelector('#cmisUrl'),
  username: document.querySelector('#username'),
  secretKind: document.querySelector('#secretKind'),
  secretValue: document.querySelector('#secretValue'),
  localFolder: document.querySelector('#localFolder'),
  syncIntervalSeconds: document.querySelector('#syncIntervalSeconds'),
  runInBackground: document.querySelector('#runInBackground')
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const isValid = await validateDraft();
  if (!isValid) {
    return;
  }

  await window.cmisPortable.saveSettings(collectSettings());
  showMessage('Configuración guardada. La sincronización en segundo plano está programada.', true);
});

window.cmisPortable.onSyncTick((payload) => {
  syncStatus.textContent = `Última comprobación: ${payload.timestamp}. Servidor: ${payload.cmisUrl}. Carpeta: ${payload.localFolder}.`;
});

window.cmisPortable.loadSettings()
  .then((settings) => {
    applySettings(settings);
    if (settings.cmisUrl) {
      showMessage('Configuración existente cargada.', true);
    }
  })
  .catch((error) => showMessage(`No se pudo cargar la configuración: ${error.message}`));
