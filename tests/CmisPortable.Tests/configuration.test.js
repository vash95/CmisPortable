const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { validateSettings, normalizeSettings, completeIc2v11AtomPubUrl } = require('../../src/CmisPortable.Core/configuration');
const { resolveLocale } = require('../../src/CmisPortable.Core/i18n');
const { SettingsStore } = require('../../src/CmisPortable.Core/settingsStore');

test('normalizeSettings applies the default one minute sync interval', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.syncIntervalSeconds, 60);
  assert.equal(settings.runInBackground, true);
  assert.deepEqual(settings.remoteFolder, { id: '', name: '/', path: '/' });
});

test('normalizeSettings autocompletes bare ic2v11 CMIS URLs to AtomPub endpoints', () => {
  assert.equal(
    normalizeSettings({ cmisUrl: 'https://example.test/ic2v11' }).cmisUrl,
    'https://example.test/ic2v11/atom/cmis'
  );
  assert.equal(
    completeIc2v11AtomPubUrl('https://example.test/ic2v11/'),
    'https://example.test/ic2v11/atom/cmis'
  );
  assert.equal(
    completeIc2v11AtomPubUrl('https://example.test/ic2v11/atom/cmis'),
    'https://example.test/ic2v11/atom/cmis'
  );
});

test('normalizeSettings always treats credentials as passwords', () => {
  const settings = normalizeSettings({ secret: { kind: 'token', protectedValue: 'stored' } });
  assert.equal(settings.secret.kind, 'password');
  assert.equal(settings.secret.protectedValue, 'stored');
});

test('validateSettings rejects missing required wizard fields', () => {
  const result = validateSettings({});
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ['cmisUrl', 'username', 'localFolder']);
});


test('validateSettings defaults to English messages and supports Spanish messages', () => {
  const english = validateSettings({});
  const spanish = validateSettings({}, { locale: 'es-ES' });

  assert.equal(english.errors[0].message, 'The CMIS URL is required.');
  assert.equal(spanish.errors[0].message, 'La URL CMIS es obligatoria.');
});

test('resolveLocale detects supported OS language and falls back to English', () => {
  assert.equal(resolveLocale('es-ES'), 'es');
  assert.equal(resolveLocale('fr-FR'), 'en');
  assert.equal(resolveLocale(undefined), 'en');
});

test('normalizeSettings clamps the sync interval to the 10 to 60 second range', () => {
  assert.equal(normalizeSettings({ syncIntervalSeconds: 5 }).syncIntervalSeconds, 10);
  assert.equal(normalizeSettings({ syncIntervalSeconds: 90 }).syncIntervalSeconds, 60);
});

test('validateSettings accepts sync intervals from 10 seconds to 1 minute', () => {
  const baseSettings = {
    cmisUrl: 'https://example.test/cmis/browser',
    username: 'ana',
    localFolder: '/tmp/cmis'
  };

  assert.equal(validateSettings({ ...baseSettings, syncIntervalSeconds: 10 }).valid, true);
  assert.equal(validateSettings({ ...baseSettings, syncIntervalSeconds: 60 }).valid, true);
  assert.equal(validateSettings({ ...baseSettings, syncIntervalSeconds: 5 }).valid, false);
  assert.equal(validateSettings({ ...baseSettings, syncIntervalSeconds: 61 }).valid, false);
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
  assert.deepEqual(result.settings.remoteFolder, { id: '', name: '/', path: '/' });
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
  assert.equal(saved.secret.kind, 'password');
  assert.equal(loaded.secret.protectedValue, 'protected:secret-token');
  assert.equal(revealed, 'secret-token');
  assert.deepEqual(calls, [
    ['protect', 'secret-token'],
    ['unprotect', 'protected:secret-token']
  ]);
});

test('SettingsStore rejects sync intervals outside the allowed range', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-portable-test-'));
  const store = new SettingsStore({
    settingsPath: path.join(tempDir, 'settings.json'),
    secureStorage: {
      async protect(value) {
        return { value, storage: 'test-secure-storage' };
      }
    }
  });

  await assert.rejects(
    () => store.save({
      cmisUrl: 'https://example.test/cmis',
      username: 'ana',
      secretValue: 'secret-token',
      localFolder: tempDir,
      syncIntervalSeconds: 61,
      runInBackground: true
    }),
    /between 10 seconds and 1 minute/
  );
});


test('SettingsStore clears persisted connection and stored credentials', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-portable-test-'));
  const settingsPath = path.join(tempDir, 'settings.json');
  const store = new SettingsStore({
    settingsPath,
    secureStorage: {
      async protect(value) {
        return { value: `protected:${value}`, storage: 'test-secure-storage' };
      },
      async unprotect(secret) {
        return secret.protectedValue.replace('protected:', '');
      }
    }
  });

  await store.save({
    cmisUrl: 'https://example.test/cmis',
    username: 'ana',
    secretValue: 'secret-token',
    localFolder: tempDir,
    syncIntervalSeconds: 30,
    runInBackground: true
  });

  const cleared = await store.clear();
  const loadedAfterClear = await store.load();

  assert.equal(cleared.cmisUrl, '');
  assert.equal(cleared.username, '');
  assert.equal(cleared.secret.protectedValue, '');
  assert.deepEqual(loadedAfterClear, cleared);
  await assert.rejects(() => fs.stat(settingsPath), { code: 'ENOENT' });
});
