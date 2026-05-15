const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { BrowserBindingCmisClient, parseJsonResponse } = require('../../src/CmisPortable.Core/browserBindingCmisClient');
const { CmisSyncService } = require('../../src/CmisPortable.Core/cmisSyncService');

test('BrowserBindingCmisClient connects, lists children and downloads content through CMIS Browser Binding', async (t) => {
  const server = await createBrowserBindingServer();
  t.after(() => server.close());

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-browser-client-test-'));
  const targetPath = path.join(tempDir, 'manual.txt');
  const client = new BrowserBindingCmisClient();

  const connection = await client.ConnectAsync(server.repositoryUrl, 'ana', 'secret');
  const root = await client.GetRootFolderAsync();
  const children = await client.ListChildrenAsync(root.id);
  await client.DownloadDocumentAsync('doc-1', targetPath);

  assert.equal(connection.repositoryId, 'repo-1');
  assert.equal(root.id, 'root-folder');
  assert.equal(root.type, 'folder');
  assert.deepEqual(children.map((child) => ({ id: child.id, name: child.name, type: child.type })), [
    { id: 'folder-1', name: 'Projects', type: 'folder' },
    { id: 'doc-1', name: 'manual.txt', type: 'document' }
  ]);
  assert.equal(await fs.readFile(targetPath, 'utf8'), 'browser binding document');
  assert.equal(server.requests.every((request) => request.authorization === 'Basic YW5hOnNlY3JldA=='), true);
});


test('BrowserBindingCmisClient reports XML responses as Browser Binding URL errors', () => {
  assert.throws(
    () => parseJsonResponse('<?xml version="1.0"?><service />'),
    /El servidor devolvió XML en lugar de JSON/
  );
});

test('CmisSyncService can sync folders and documents using BrowserBindingCmisClient', async (t) => {
  const server = await createBrowserBindingServer();
  t.after(() => server.close());

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-browser-sync-test-'));
  const client = new BrowserBindingCmisClient();
  const service = new CmisSyncService({ cmisClient: client, localRoot: tempDir, retryDelayMs: 1 });

  const result = await service.sync({ url: server.repositoryUrl, username: 'ana', password: 'secret' });

  assert.equal(result.errors.length, 0);
  assert.equal(result.downloaded, 2);
  assert.equal(await fs.readFile(path.join(tempDir, 'manual.txt'), 'utf8'), 'browser binding document');
  assert.equal(await fs.readFile(path.join(tempDir, 'Projects', 'plan.txt'), 'utf8'), 'nested plan');

  const index = JSON.parse(await fs.readFile(path.join(tempDir, '.cmisportable', 'index.json'), 'utf8'));
  assert.equal(index.entries.some((entry) => entry.remotePath === '/Projects/plan.txt' && entry.cmisObjectId === 'doc-2'), true);
});

async function createBrowserBindingServer() {
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      selector: url.searchParams.get('cmisselector'),
      objectId: url.searchParams.get('objectId'),
      authorization: request.headers.authorization
    });

    if (request.headers.authorization !== 'Basic YW5hOnNlY3JldA==') {
      writeJson(response, 401, { message: 'unauthorized' });
      return;
    }

    if (url.pathname !== '/cmis/browser/repo-1') {
      writeJson(response, 404, { message: 'not found' });
      return;
    }

    const selector = url.searchParams.get('cmisselector');
    const objectId = url.searchParams.get('objectId');

    if (selector === 'repositoryInfo') {
      writeJson(response, 200, {
        repositoryId: 'repo-1',
        rootFolderId: 'root-folder'
      });
      return;
    }

    if (selector === 'object' && objectId === 'root-folder') {
      writeJson(response, 200, cmisObject({ id: 'root-folder', name: '', baseTypeId: 'cmis:folder' }));
      return;
    }

    if (selector === 'children' && objectId === 'root-folder') {
      writeJson(response, 200, {
        objects: [
          { object: cmisObject({ id: 'folder-1', name: 'Projects', baseTypeId: 'cmis:folder' }) },
          { object: cmisObject({ id: 'doc-1', name: 'manual.txt', baseTypeId: 'cmis:document', size: 24 }) }
        ]
      });
      return;
    }

    if (selector === 'children' && objectId === 'folder-1') {
      writeJson(response, 200, {
        objects: [
          { object: cmisObject({ id: 'doc-2', name: 'plan.txt', baseTypeId: 'cmis:document', size: 11 }) }
        ]
      });
      return;
    }

    if (selector === 'content' && objectId === 'doc-1') {
      writeText(response, 200, 'browser binding document');
      return;
    }

    if (selector === 'content' && objectId === 'doc-2') {
      writeText(response, 200, 'nested plan');
      return;
    }

    writeJson(response, 404, { message: 'not found' });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    requests,
    repositoryUrl: `http://127.0.0.1:${port}/cmis/browser/repo-1`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

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

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function writeText(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'text/plain' });
  response.end(body);
}
