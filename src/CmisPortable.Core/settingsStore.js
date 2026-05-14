const fs = require('node:fs/promises');
const path = require('node:path');
const {
  createDefaultSettings,
  normalizeSettings,
  validateCredentialDraft,
  validateSettings
} = require('./configuration');
const {
  PlatformCredentialStore,
  createCredentialId,
  createCredentialMetadata
} = require('./credentialStore');

class SettingsStore {
  constructor(options) {
    if (!options?.settingsPath) {
      throw new Error('settingsPath is required');
    }

    this.settingsPath = options.settingsPath;
    this.credentialStore = options.credentialStore ?? new PlatformCredentialStore();
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
    const settingsValidation = validateSettings(plainSettings);
    const credentialValidation = validateCredentialDraft(plainSettings);
    const errors = [...settingsValidation.errors, ...credentialValidation.errors];

    if (errors.length > 0) {
      const message = errors.map((error) => `${error.field}: ${error.message}`).join('; ');
      throw new Error(`Configuración inválida: ${message}`);
    }

    const secretKind = plainSettings.secretKind ?? plainSettings.secret?.kind ?? 'password';
    const existingCredentialId = plainSettings.secret?.credentialId;
    let credentialMetadata;

    if (credentialValidation.secretValue) {
      const credentialId = existingCredentialId || createCredentialId({
        cmisUrl: settingsValidation.settings.cmisUrl,
        username: credentialValidation.username
      });
      credentialMetadata = await this.credentialStore.saveCredential({
        credentialId,
        username: credentialValidation.username,
        secret: credentialValidation.secretValue,
        kind: secretKind
      });
    } else {
      credentialMetadata = {
        ...plainSettings.secret,
        kind: secretKind
      };
    }

    const settings = normalizeSettings({
      ...settingsValidation.settings,
      secret: credentialMetadata
    });

    await this.writeSettings(settings);
    return settings;
  }

  async revealSecret(settings) {
    const credentialId = settings?.secret?.credentialId;
    if (!credentialId) {
      return '';
    }

    const credential = await this.credentialStore.getCredential(credentialId);
    return credential?.secret ?? '';
  }

  async revealCredential(settings) {
    const credentialId = settings?.secret?.credentialId;
    if (!credentialId) {
      return null;
    }

    return this.credentialStore.getCredential(credentialId);
  }

  async deleteSavedCredential(settings = undefined) {
    const currentSettings = settings ?? await this.load();
    const credentialId = currentSettings?.secret?.credentialId;
    if (!credentialId) {
      return { deleted: false, settings: normalizeSettings(currentSettings) };
    }

    const deleted = await this.credentialStore.deleteCredential(credentialId);
    const nextSettings = normalizeSettings({
      ...currentSettings,
      secret: createCredentialMetadata('', process.platform, currentSettings.secret?.kind ?? 'password')
    });
    nextSettings.secret.storage = 'none';
    await this.writeSettings(nextSettings);
    return { deleted, settings: nextSettings };
  }

  async writeSettings(settings) {
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, `${JSON.stringify(normalizeSettings(settings), null, 2)}\n`, 'utf8');
  }
}

function createBase64FallbackSecureStorage() {
  return {
    async protect() {
      throw new Error('createBase64FallbackSecureStorage is deprecated. Use ICredentialStore instead.');
    },
    async unprotect() {
      throw new Error('createBase64FallbackSecureStorage is deprecated. Use ICredentialStore instead.');
    }
  };
}

module.exports = {
  SettingsStore,
  createBase64FallbackSecureStorage
};
