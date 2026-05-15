const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { BrowserBindingCmisClient, parseJsonResponse, executeCmisRequest } = require('../../src/CmisPortable.Core/browserBindingCmisClient');
const { CmisSyncService } = require('../../src/CmisPortable.Core/cmisSyncService');

test('BrowserBindingCmisClient connects, lists children and downloads content through CmisJS', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-js-client-test-'));
  const targetPath = path.join(tempDir, 'manual.txt');
  const session = new FakeCmisSession('http://127.0.0.1/cmis/browser');
  const client = new BrowserBindingCmisClient({ sessionFactory: () => session });

  const connection = await client.ConnectAsync('http://127.0.0.1/cmis/browser', 'ana', 'secret');
  const root = await client.GetRootFolderAsync();
  const children = await client.ListChildrenAsync(root.id);
  await client.DownloadDocumentAsync('doc-1', targetPath);

  assert.equal(connection.repositoryId, 'repo-1');
  assert.equal(connection.rootFolderId, 'root-folder');
  assert.equal(root.id, 'root-folder');
  assert.equal(root.type, 'folder');
  assert.deepEqual(children.map((child) => ({ id: child.id, name: child.name, type: child.type })), [
    { id: 'folder-1', name: 'Projects', type: 'folder' },
    { id: 'doc-1', name: 'manual.txt', type: 'document' }
  ]);
  assert.equal(await fs.readFile(targetPath, 'utf8'), 'browser binding document');
  assert.deepEqual(session.credentials, { username: 'ana', password: 'secret' });
  assert.equal(session.url, 'http://127.0.0.1/cmis/browser');
});

test('BrowserBindingCmisClient supports CmisJS 0.x CmisRequest callbacks', async () => {
  const request = createLegacyCmisRequest({ ok: true });
  assert.deepEqual(await executeCmisRequest(request), { ok: true });

  await assert.rejects(
    executeCmisRequest(createLegacyCmisRequest(null, { status: 403, text: 'forbidden' })),
    /HTTP 403: forbidden/
  );
});

test('BrowserBindingCmisClient reports XML responses as Browser Binding URL errors', () => {
  assert.throws(
    () => parseJsonResponse('<?xml version="1.0"?><service />'),
    /El servidor devolvió XML en lugar de JSON/
  );
});

test('CmisSyncService can sync folders and documents using BrowserBindingCmisClient with CmisJS', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-js-sync-test-'));
  const client = new BrowserBindingCmisClient({ sessionFactory: (url) => new FakeCmisSession(url) });
  const service = new CmisSyncService({ cmisClient: client, localRoot: tempDir, retryDelayMs: 1 });

  const result = await service.sync({ url: 'http://127.0.0.1/cmis/browser', username: 'ana', password: 'secret' });

  assert.equal(result.errors.length, 0);
  assert.equal(result.downloaded, 2);
  assert.equal(await fs.readFile(path.join(tempDir, 'manual.txt'), 'utf8'), 'browser binding document');
  assert.equal(await fs.readFile(path.join(tempDir, 'Projects', 'plan.txt'), 'utf8'), 'nested plan');

  const index = JSON.parse(await fs.readFile(path.join(tempDir, '.cmisportable', 'index.json'), 'utf8'));
  assert.equal(index.entries.some((entry) => entry.remotePath === '/Projects/plan.txt' && entry.cmisObjectId === 'doc-2'), true);
});

class FakeCmisSession {
  constructor(url) {
    this.url = url;
    this.credentials = null;
    this.defaultRepository = null;
  }

  setCredentials(username, password) {
    this.credentials = { username, password };
    return this;
  }

  async loadRepositories() {
    const repository = {
      repositoryId: 'repo-1',
      repositoryUrl: `${this.url}/repo-1`,
      rootFolderId: 'root-folder'
    };
    this.defaultRepository = repository;
    return { 'repo-1': repository };
  }

  async getRepositoryInfo() {
    return {
      repositoryId: 'repo-1',
      rootFolderId: 'root-folder'
    };
  }

  async getObject(objectId) {
    return cmisObject(objectsById[objectId]);
  }

  async getObjectByPath(cmisPath) {
    if (cmisPath === '/') {
      return cmisObject(objectsById['root-folder']);
    }
    throw Object.assign(new Error('not found'), { status: 404 });
  }

  async getChildren(objectId) {
    return {
      objects: (childrenByFolder[objectId] ?? []).map((id) => ({ object: cmisObject(objectsById[id]) }))
    };
  }

  async getContentStream(objectId) {
    return Buffer.from(contentByDocument[objectId] ?? '');
  }
}

const objectsById = {
  'root-folder': { id: 'root-folder', name: '', baseTypeId: 'cmis:folder' },
  'folder-1': { id: 'folder-1', name: 'Projects', baseTypeId: 'cmis:folder' },
  'doc-1': { id: 'doc-1', name: 'manual.txt', baseTypeId: 'cmis:document', size: 24 },
  'doc-2': { id: 'doc-2', name: 'plan.txt', baseTypeId: 'cmis:document', size: 11 }
};

const childrenByFolder = {
  'root-folder': ['folder-1', 'doc-1'],
  'folder-1': ['doc-2']
};

const contentByDocument = {
  'doc-1': 'browser binding document',
  'doc-2': 'nested plan'
};

function cmisObject({ id, name, baseTypeId, size }) {
  return {
    succinctProperties: {
      'cmis:objectId': id,
      'cmis:name': name,
      'cmis:baseTypeId': baseTypeId,
      'cmis:objectTypeId': baseTypeId,
      'cmis:lastModificationDate': '2026-01-02T00:00:00.000Z',
      ...(size == null ? {} : { 'cmis:contentStreamLength': size })
    }
  };
}

function createLegacyCmisRequest(body, notOkResponse = null) {
  return {
    ok(callback) {
      if (!notOkResponse) {
        process.nextTick(() => callback(body));
      }
      return this;
    },
    notOk(callback) {
      if (notOkResponse) {
        process.nextTick(() => callback(notOkResponse));
      }
      return this;
    },
    error() {
      return this;
    }
  };
}
