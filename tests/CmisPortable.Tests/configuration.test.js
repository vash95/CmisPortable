const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { validateSettings, normalizeSettings } = require('../../src/CmisPortable.Core/configuration');
const { SettingsStore } = require('../../src/CmisPortable.Core/settingsStore');

test('normalizeSettings applies the default one minute sync interval', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.syncIntervalSeconds, 60);
  assert.equal(settings.runInBackground, true);
});

test('validateSettings rejects missing required wizard fields', () => {
  const result = validateSettings({});
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ['cmisUrl', 'username', 'localFolder']);
});

test('validateSettings accepts a complete HTTP CMIS configuration', () => {
  const result = validateSettings({
    cmisUrl: 'https://example.test/cmis/browser',
    username: 'ana',
    localFolder: '/tmp/cmis',
    syncIntervalSeconds: 60
  });

  assert.equal(result.valid, true);
  assert.equal(result.settings.cmisUrl, 'https://example.test/cmis/browser');
});

test('SettingsStore persists configuration and delegates secrets to secure storage', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-portable-test-'));
  const calls = [];
  const store = new SettingsStore({
    settingsPath: path.join(tempDir, 'settings.json'),
    secureStorage: {
      async protect(value) {
        calls.push(['protect', value]);
        return { value: `protected:${value}`, storage: 'test-secure-storage' };
      },
      async unprotect(secret) {
        calls.push(['unprotect', secret.protectedValue]);
        return secret.protectedValue.replace('protected:', '');
      }
    }
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

  const loaded = await store.load();
  const revealed = await store.revealSecret(loaded);

  assert.equal(saved.secret.storage, 'test-secure-storage');
  assert.equal(loaded.secret.protectedValue, 'protected:secret-token');
  assert.equal(revealed, 'secret-token');
  assert.deepEqual(calls, [
    ['protect', 'secret-token'],
    ['unprotect', 'protected:secret-token']
  ]);
});
