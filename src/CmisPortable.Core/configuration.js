const DEFAULT_SYNC_INTERVAL_SECONDS = 60;

function createDefaultSettings() {
  return {
    cmisUrl: '',
    username: '',
    localFolder: '',
    syncIntervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
    secret: {
      kind: 'password',
      protectedValue: '',
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
    username: String(input.username ?? defaults.username).trim(),
    localFolder: String(input.localFolder ?? defaults.localFolder).trim(),
    syncIntervalSeconds,
    secret: {
      ...defaults.secret,
      ...(input.secret ?? {})
    },
    runInBackground: Boolean(input.runInBackground ?? defaults.runInBackground)
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

  if (!settings.username) {
    errors.push({ field: 'username', message: 'El usuario es obligatorio.' });
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

module.exports = {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  createDefaultSettings,
  normalizeSettings,
  validateSettings
};
