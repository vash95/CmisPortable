const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'es'];

const translations = {
  en: {
    'validation.cmisUrl.required': 'The CMIS URL is required.',
    'validation.cmisUrl.protocol': 'The CMIS URL must use HTTP or HTTPS.',
    'validation.cmisUrl.invalid': 'The CMIS URL is not valid.',
    'validation.username.required': 'The username is required.',
    'validation.localFolder.required': 'The local sync folder is required.',
    'validation.syncIntervalSeconds.range': 'The sync interval must be between 10 seconds and 1 minute.',
    'settings.invalid': 'Invalid configuration',
    'sync.status.idle': 'Background sync stopped.',
    'sync.status.scheduled': 'Background sync scheduled.',
    'sync.status.paused': 'Background sync paused.',
    'sync.status.stopped': 'Background sync stopped.',
    'sync.status.skipped.paused': 'Cycle skipped because sync is paused.',
    'sync.status.skipped.running': 'Cycle skipped because a sync is already running.',
    'sync.status.running': 'Sync in progress.',
    'sync.status.success': 'Sync completed successfully.'
  },
  es: {
    'validation.cmisUrl.required': 'La URL CMIS es obligatoria.',
    'validation.cmisUrl.protocol': 'La URL CMIS debe usar HTTP o HTTPS.',
    'validation.cmisUrl.invalid': 'La URL CMIS no es válida.',
    'validation.username.required': 'El usuario es obligatorio.',
    'validation.localFolder.required': 'La carpeta local de sincronización es obligatoria.',
    'validation.syncIntervalSeconds.range': 'El intervalo de sincronización debe estar entre 10 segundos y 1 minuto.',
    'settings.invalid': 'Configuración no válida',
    'sync.status.idle': 'Sincronización en segundo plano detenida.',
    'sync.status.scheduled': 'Sincronización en segundo plano programada.',
    'sync.status.paused': 'Sincronización en segundo plano pausada.',
    'sync.status.stopped': 'Sincronización en segundo plano detenida.',
    'sync.status.skipped.paused': 'Ciclo omitido porque la sincronización está pausada.',
    'sync.status.skipped.running': 'Ciclo omitido porque ya hay una sincronización en curso.',
    'sync.status.running': 'Sincronización en curso.',
    'sync.status.success': 'Sincronización completada correctamente.'
  }
};

function resolveLocale(locale) {
  const normalized = String(locale ?? '').toLowerCase();
  const language = normalized.split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(language) ? language : DEFAULT_LOCALE;
}

function createTranslator(dictionary, defaultLocale = DEFAULT_LOCALE) {
  return function translate(key, locale = defaultLocale, ...args) {
    const resolvedLocale = resolveLocale(locale);
    const value = dictionary[resolvedLocale]?.[key] ?? dictionary[defaultLocale]?.[key] ?? key;
    return typeof value === 'function' ? value(...args) : value;
  };
}

const t = createTranslator(translations);

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  translations,
  createTranslator,
  resolveLocale,
  t
};
