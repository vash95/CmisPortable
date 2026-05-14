const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { validateSettings, normalizeSettings, validateCredentialDraft } = require('../../src/CmisPortable.Core/configuration');
const { SettingsStore } = require('../../src/CmisPortable.Core/settingsStore');

class MemoryCredentialStore {
  constructor() {
    this.credentials = new Map();
    this.calls = [];
  }

  async saveCredential(credential) {
    this.calls.push(['saveCredential', credential.credentialId, credential.username, credential.secret]);
    this.credentials.set(credential.credentialId, credential);
    return {
      kind: credential.kind,
      credentialId: credential.credentialId,
      storage: 'memory-credential-store'
    };
  }

  async getCredential(credentialId) {
    this.calls.push(['getCredential', credentialId]);
    return this.credentials.get(credentialId) ?? null;
  }

  async deleteCredential(credentialId) {
    this.calls.push(['deleteCredential', credentialId]);
    return this.credentials.delete(credentialId);
  }
}

test('normalizeSettings applies the default one minute sync interval', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.syncIntervalSeconds, 60);
  assert.equal(settings.runInBackground, true);
});

test('validateSettings rejects missing required non-sensitive configuration fields', () => {
  const result = validateSettings({});
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ['cmisUrl', 'localFolder']);
});

test('validateCredentialDraft rejects missing credential fields', () => {
  const result = validateCredentialDraft({});

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ['username', 'secretValue']);
});

test('validateSettings accepts a complete HTTP CMIS configuration', () => {
  const result = validateSettings({
    cmisUrl: 'https://example.test/cmis/browser',
    localFolder: '/tmp/cmis',
    syncIntervalSeconds: 60
  });

  assert.equal(result.valid, true);
  assert.equal(result.settings.cmisUrl, 'https://example.test/cmis/browser');
});

test('SettingsStore persists only metadata and delegates secrets to the credential store', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-portable-test-'));
  const credentialStore = new MemoryCredentialStore();
  const store = new SettingsStore({
    settingsPath: path.join(tempDir, 'settings.json'),
    credentialStore
  });

  const saved = await store.save({
    cmisUrl: 'https://example.test/cmis',
    username: 'ana',
    secretKind: 'token',
    secretValue: 'secret-token',
    localFolder: tempDir,
    syncIntervalSeconds: 30,
    runInBackground: true
  });

  const settingsFile = await fs.readFile(path.join(tempDir, 'settings.json'), 'utf8');
  const loaded = await store.load();
  const credential = await store.revealCredential(loaded);

  assert.equal(saved.secret.storage, 'memory-credential-store');
  assert.ok(saved.secret.credentialId.startsWith('CmisPortable:'));
  assert.equal(settingsFile.includes('secret-token'), false);
  assert.equal(settingsFile.includes('ana'), false);
  assert.equal(loaded.secret.credentialId, saved.secret.credentialId);
  assert.equal(credential.username, 'ana');
  assert.equal(credential.secret, 'secret-token');
});

test('SettingsStore deletes saved credentials and clears credential metadata', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-portable-test-'));
  const credentialStore = new MemoryCredentialStore();
  const store = new SettingsStore({
    settingsPath: path.join(tempDir, 'settings.json'),
    credentialStore
  });

  const saved = await store.save({
    cmisUrl: 'https://example.test/cmis',
    username: 'ana',
    secretKind: 'password',
    secretValue: 'secret-token',
    localFolder: tempDir,
    syncIntervalSeconds: 30,
    runInBackground: true
  });
  const result = await store.deleteSavedCredential(saved);

  assert.equal(result.deleted, true);
  assert.equal(result.settings.secret.credentialId, '');
  assert.equal(result.settings.secret.storage, 'none');
  assert.equal(await store.revealCredential(result.settings), null);
});
