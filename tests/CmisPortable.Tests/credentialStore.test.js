const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PlatformCredentialStore,
  createCredentialId,
  getPlatformStorageName
} = require('../../src/CmisPortable.Core/credentialStore');

test('createCredentialId generates stable non-secret identifiers', () => {
  const first = createCredentialId({ cmisUrl: 'https://example.test/cmis', username: 'ana' });
  const second = createCredentialId({ cmisUrl: 'https://example.test/cmis', username: 'ana' });

  assert.equal(first, second);
  assert.match(first, /^CmisPortable:[a-f0-9]{32}$/);
  assert.equal(first.includes('ana'), false);
  assert.equal(first.includes('example'), false);
});

test('PlatformCredentialStore selects Windows Credential Manager metadata on Windows', async () => {
  const calls = [];
  const store = new PlatformCredentialStore({
    platform: 'win32',
    execFile: async (file, args, options) => {
      calls.push({ file, args, env: options.env });
      return { stdout: '', stderr: '' };
    }
  });

  const metadata = await store.saveCredential({
    credentialId: 'CmisPortable:test',
    username: 'ana',
    secret: 'secret-token',
    kind: 'token'
  });

  assert.equal(metadata.storage, 'windows-credential-manager');
  assert.equal(calls[0].file, 'powershell.exe');
  assert.equal(calls[0].env.CMIS_PORTABLE_SECRET, 'secret-token');
});

test('getPlatformStorageName maps supported platform stores', () => {
  assert.equal(getPlatformStorageName('win32'), 'windows-credential-manager');
  assert.equal(getPlatformStorageName('darwin'), 'macos-keychain');
  assert.equal(getPlatformStorageName('linux'), 'linux-secret-service');
});
