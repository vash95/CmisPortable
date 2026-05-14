const fs = require('node:fs/promises');
const path = require('node:path');
const { createDefaultSettings, normalizeSettings, validateSettings } = require('./configuration');

class SettingsStore {
  constructor(options) {
    if (!options?.settingsPath) {
      throw new Error('settingsPath is required');
    }

    this.settingsPath = options.settingsPath;
    this.secureStorage = options.secureStorage ?? createBase64FallbackSecureStorage();
  }

  async load() {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf8');
      return normalizeSettings(JSON.parse(content));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return createDefaultSettings();
      }
      throw error;
    }
  }

  async save(plainSettings) {
    const protectedSecret = await this.secureStorage.protect(String(plainSettings.secretValue ?? ''));
    const validation = validateSettings({
      ...plainSettings,
      secret: {
        kind: plainSettings.secretKind ?? 'password',
        protectedValue: protectedSecret.value,
        storage: protectedSecret.storage
      }
    });

    if (!validation.valid) {
      const message = validation.errors.map((error) => `${error.field}: ${error.message}`).join('; ');
      throw new Error(`Configuración inválida: ${message}`);
    }

    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, `${JSON.stringify(validation.settings, null, 2)}\n`, 'utf8');
    return validation.settings;
  }

  async revealSecret(settings) {
    if (!settings?.secret?.protectedValue) {
      return '';
    }
    return this.secureStorage.unprotect(settings.secret);
  }
}

function createBase64FallbackSecureStorage() {
  return {
    async protect(value) {
      return {
        value: Buffer.from(value, 'utf8').toString('base64'),
        storage: 'base64-fallback'
      };
    },
    async unprotect(secret) {
      return Buffer.from(secret.protectedValue, 'base64').toString('utf8');
    }
  };
}

module.exports = {
  SettingsStore,
  createBase64FallbackSecureStorage
};
