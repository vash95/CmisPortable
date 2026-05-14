const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { CmisSyncService } = require('../../src/CmisPortable.Core/cmisSyncService');
const { ICmisClient } = require('../../src/CmisPortable.Core/cmisClient');

test('ICmisClient documents the required async CMIS operations', () => {
  const client = new ICmisClient();
  assert.equal(typeof client.ConnectAsync, 'function');
  assert.equal(typeof client.GetRootFolderAsync, 'function');
  assert.equal(typeof client.ListChildrenAsync, 'function');
  assert.equal(typeof client.DownloadDocumentAsync, 'function');
});

test('CmisSyncService creates folders, downloads documents and writes the index', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-sync-test-'));
  const client = createFakeClient({
    '/': [
      { id: 'folder-1', name: 'Projects', type: 'folder', lastModified: '2026-01-01T00:00:00Z' }
    ],
    'folder-1': [
      { id: 'doc-1', name: 'readme.txt', type: 'document', lastModified: '2026-01-02T00:00:00Z', size: 11 }
    ]
  }, {
    'doc-1': 'hello cmis!'
  });
  const service = new CmisSyncService({ cmisClient: client, localRoot: tempDir, retryDelayMs: 1 });

  const result = await service.sync({ url: 'https://example.test/cmis', username: 'ana', password: 'secret' });

  assert.equal(result.errors.length, 0);
  assert.equal(result.downloaded, 1);
  assert.equal(result.updated, 0);
  assert.equal(result.deleted, 0);
  assert.equal(await fs.readFile(path.join(tempDir, 'Projects', 'readme.txt'), 'utf8'), 'hello cmis!');

  const index = JSON.parse(await fs.readFile(path.join(tempDir, '.cmisportable', 'index.json'), 'utf8'));
  assert.equal(index.mirrorPolicy, 'server-readonly');
  assert.equal(index.entries.some((entry) => entry.cmisObjectId === 'doc-1' && entry.remotePath === '/Projects/readme.txt'), true);
});

test('CmisSyncService updates modified documents and removes items missing from CMIS', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-sync-test-'));
  const client = createFakeClient({
    '/': [
      { id: 'doc-1', name: 'manual.txt', type: 'document', lastModified: '2026-01-01T00:00:00Z', size: 3 },
      { id: 'doc-2', name: 'obsolete.txt', type: 'document', lastModified: '2026-01-01T00:00:00Z', size: 8 }
    ]
  }, {
    'doc-1': 'one',
    'doc-2': 'obsolete'
  });
  const service = new CmisSyncService({ cmisClient: client, localRoot: tempDir, retryDelayMs: 1 });

  await service.sync({ url: 'https://example.test/cmis', username: 'ana', password: 'secret' });

  client.childrenByFolder['/'] = [
    { id: 'doc-1', name: 'manual.txt', type: 'document', lastModified: '2026-01-02T00:00:00Z', size: 3 }
  ];
  client.documents['doc-1'] = 'two';

  const result = await service.sync({ url: 'https://example.test/cmis', username: 'ana', password: 'secret' });

  assert.equal(result.errors.length, 0);
  assert.equal(result.downloaded, 0);
  assert.equal(result.updated, 1);
  assert.equal(result.deleted, 1);
  assert.equal(await fs.readFile(path.join(tempDir, 'manual.txt'), 'utf8'), 'two');
  await assert.rejects(() => fs.access(path.join(tempDir, 'obsolete.txt')), /ENOENT/);
});

test('CmisSyncService records permission errors per folder without aborting the whole sync', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-sync-test-'));
  const denied = new Error('permission denied');
  denied.status = 403;
  const client = createFakeClient({
    '/': [
      { id: 'denied-folder', name: 'Private', type: 'folder' },
      { id: 'doc-1', name: 'public.txt', type: 'document', lastModified: '2026-01-01T00:00:00Z', size: 6 }
    ],
    'denied-folder': denied
  }, {
    'doc-1': 'public'
  });
  const service = new CmisSyncService({
    cmisClient: client,
    localRoot: tempDir,
    retryDelayMs: 1,
    logger: { error() {} }
  });

  const result = await service.sync({ url: 'https://example.test/cmis', username: 'ana', password: 'secret' });

  assert.equal(await fs.readFile(path.join(tempDir, 'public.txt'), 'utf8'), 'public');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].permissionDenied, true);
});

function createFakeClient(childrenByFolder, documents) {
  return {
    childrenByFolder,
    documents,
    connectCalls: 0,
    async ConnectAsync(url, username, password) {
      this.connectCalls += 1;
      assert.equal(url, 'https://example.test/cmis');
      assert.equal(username, 'ana');
      assert.equal(password, 'secret');
    },
    async GetRootFolderAsync() {
      return { id: '/', name: '', type: 'folder' };
    },
    async ListChildrenAsync(folderId) {
      const result = this.childrenByFolder[folderId];
      if (result instanceof Error) {
        throw result;
      }
      return result ?? [];
    },
    async DownloadDocumentAsync(documentId, targetPath) {
      await fs.writeFile(targetPath, this.documents[documentId], 'utf8');
    }
  };
}
