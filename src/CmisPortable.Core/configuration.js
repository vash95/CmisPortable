const DEFAULT_SYNC_INTERVAL_SECONDS = 60;

function createDefaultSettings() {
  return {
    cmisUrl: '',
    localFolder: '',
    syncIntervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
    secret: {
      kind: 'password',
      credentialId: '',
      storage: 'none'
    },
    runInBackground: true
  };
}

function normalizeSettings(input = {}) {
  const defaults = createDefaultSettings();
  const rawInterval = Number(input.syncIntervalSeconds ?? defaults.syncIntervalSeconds);
  const syncIntervalSeconds = Number.isFinite(rawInterval) && rawInterval > 0
    ? Math.max(15, Math.round(rawInterval))
    : defaults.syncIntervalSeconds;

  return {
    ...defaults,
    cmisUrl: String(input.cmisUrl ?? defaults.cmisUrl).trim(),
    localFolder: String(input.localFolder ?? defaults.localFolder).trim(),
    syncIntervalSeconds,
    secret: normalizeSecretMetadata(input.secret ?? defaults.secret),
    runInBackground: Boolean(input.runInBackground ?? defaults.runInBackground)
  };
}

function normalizeSecretMetadata(secret = {}) {
  return {
    kind: String(secret.kind ?? 'password'),
    credentialId: String(secret.credentialId ?? '').trim(),
    storage: String(secret.storage ?? 'none')
  };
}

function validateSettings(input = {}) {
  const settings = normalizeSettings(input);
  const errors = [];

  if (!settings.cmisUrl) {
    errors.push({ field: 'cmisUrl', message: 'La URL CMIS es obligatoria.' });
  } else {
    try {
      const url = new URL(settings.cmisUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: 'cmisUrl', message: 'La URL CMIS debe usar HTTP o HTTPS.' });
      }
    } catch {
      errors.push({ field: 'cmisUrl', message: 'La URL CMIS no es válida.' });
    }
  }

  if (!settings.localFolder) {
    errors.push({ field: 'localFolder', message: 'La carpeta local de sincronización es obligatoria.' });
  }

  if (settings.syncIntervalSeconds < 15) {
    errors.push({ field: 'syncIntervalSeconds', message: 'El intervalo mínimo de sincronización es de 15 segundos.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    settings
  };
}

function validateCredentialDraft(input = {}) {
  const errors = [];
  const username = String(input.username ?? '').trim();
  const secretValue = String(input.secretValue ?? '');

  if (!username) {
    errors.push({ field: 'username', message: 'El usuario es obligatorio.' });
  }

  if (!secretValue && !input.secret?.credentialId) {
    errors.push({ field: 'secretValue', message: 'La contraseña o token es obligatorio.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    username,
    secretValue
  };
}

module.exports = {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  createDefaultSettings,
  normalizeSettings,
  normalizeSecretMetadata,
  validateSettings,
  validateCredentialDraft
};
