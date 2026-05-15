const { t } = require('./i18n');

const DEFAULT_SYNC_INTERVAL_SECONDS = 60;
const MIN_SYNC_INTERVAL_SECONDS = 10;
const MAX_SYNC_INTERVAL_SECONDS = 60;

function createDefaultSettings() {
  return {
    cmisUrl: '',
    username: '',
    localFolder: '',
    remoteFolder: {
      id: '',
      name: '/',
      path: '/'
    },
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
    ? clamp(Math.round(rawInterval), MIN_SYNC_INTERVAL_SECONDS, MAX_SYNC_INTERVAL_SECONDS)
    : defaults.syncIntervalSeconds;

  return {
    ...defaults,
    cmisUrl: String(input.cmisUrl ?? defaults.cmisUrl).trim(),
    username: String(input.username ?? defaults.username).trim(),
    localFolder: String(input.localFolder ?? defaults.localFolder).trim(),
    remoteFolder: normalizeRemoteFolder(input.remoteFolder, input.remoteFolderId),
    syncIntervalSeconds,
    secret: {
      ...defaults.secret,
      ...(input.secret ?? {}),
      kind: 'password'
    },
    runInBackground: Boolean(input.runInBackground ?? defaults.runInBackground)
  };
}

function validateSettings(input = {}, options = {}) {
  const settings = normalizeSettings(input);
  const locale = options.locale;
  const errors = [];
  const rawInterval = Number(input.syncIntervalSeconds ?? settings.syncIntervalSeconds);

  if (!settings.cmisUrl) {
    errors.push({ field: 'cmisUrl', message: t('validation.cmisUrl.required', locale) });
  } else {
    try {
      const url = new URL(settings.cmisUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: 'cmisUrl', message: t('validation.cmisUrl.protocol', locale) });
      }
    } catch {
      errors.push({ field: 'cmisUrl', message: t('validation.cmisUrl.invalid', locale) });
    }
  }

  if (!settings.username) {
    errors.push({ field: 'username', message: t('validation.username.required', locale) });
  }

  if (!settings.localFolder) {
    errors.push({ field: 'localFolder', message: t('validation.localFolder.required', locale) });
  }

  if (!Number.isFinite(rawInterval) || rawInterval < MIN_SYNC_INTERVAL_SECONDS || rawInterval > MAX_SYNC_INTERVAL_SECONDS) {
    errors.push({ field: 'syncIntervalSeconds', message: t('validation.syncIntervalSeconds.range', locale) });
  }

  return {
    valid: errors.length === 0,
    errors,
    settings
  };
}

function normalizeRemoteFolder(remoteFolder = {}, legacyRemoteFolderId = '') {
  const id = String(remoteFolder?.id ?? legacyRemoteFolderId ?? '').trim();
  const rawPath = String(remoteFolder?.path ?? '/').trim() || '/';
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const name = String(remoteFolder?.name ?? (path === '/' ? '/' : path.split('/').filter(Boolean).at(-1)) ?? '/').trim() || '/';

  return { id, name, path };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  MIN_SYNC_INTERVAL_SECONDS,
  MAX_SYNC_INTERVAL_SECONDS,
  createDefaultSettings,
  normalizeSettings,
  validateSettings,
  normalizeRemoteFolder
};
