const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { BrowserBindingCmisClient, AtomPubCmisClient, parseJsonResponse, normalizeBrowserBindingUrl, executeCmisRequest } = require('../../src/CmisPortable.Core/browserBindingCmisClient');
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
  assert.deepEqual(children.map((child) => ({ id: child.id, name: child.name, type: child.type, contentStreamFileName: child.contentStreamFileName, mimeType: child.mimeType })), [
    { id: 'folder-1', name: 'Projects', type: 'folder', contentStreamFileName: undefined, mimeType: undefined },
    { id: 'doc-1', name: 'manual.txt', type: 'document', contentStreamFileName: 'manual.pdf', mimeType: 'application/pdf' }
  ]);
  assert.equal(await fs.readFile(targetPath, 'utf8'), 'browser binding document');
  assert.deepEqual(session.credentials, { username: 'ana', password: 'secret' });
  assert.equal(session.url, 'http://127.0.0.1/cmis/browser');
});

test('BrowserBindingCmisClient converts common AtomPub endpoints to Browser Binding URLs', async () => {
  const session = new FakeCmisSession('http://127.0.0.1/ic2v11/browser');
  const client = new BrowserBindingCmisClient({ sessionFactory: () => session });

  await client.ConnectAsync('http://127.0.0.1/ic2v11/atom/cmis', 'ana', 'secret');

  assert.equal(session.url, 'http://127.0.0.1/ic2v11/browser');
  assert.equal(normalizeBrowserBindingUrl('http://127.0.0.1/ic2v11/atom/cmis/'), 'http://127.0.0.1/ic2v11/browser');
  assert.equal(normalizeBrowserBindingUrl('http://127.0.0.1/ic2v11'), 'http://127.0.0.1/ic2v11/browser');
  assert.equal(normalizeBrowserBindingUrl('http://127.0.0.1/ic2v11/atom'), 'http://127.0.0.1/ic2v11/browser');
  assert.equal(normalizeBrowserBindingUrl('http://127.0.0.1/ic2v11/browser'), 'http://127.0.0.1/ic2v11/browser');
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

test('BrowserBindingCmisClient rewrites XML JSON parser failures with CMIS guidance', async () => {
  const client = new BrowserBindingCmisClient({
    sessionFactory: () => ({
      setCredentials() {},
      async loadRepositories() {
        throw new SyntaxError(`Unexpected token '<', "<?xml vers"... is not valid JSON`);
      }
    })
  });

  await assert.rejects(
    () => client.ConnectAsync('http://127.0.0.1/ic2v11/custom', 'ana', 'secret'),
    /CmisPortable necesita una URL CMIS Browser Binding JSON/
  );
});


test('BrowserBindingCmisClient reports HTTP connection failures with status and response body', async () => {
  const response = {
    status: 404,
    statusText: '',
    url: 'http://127.0.0.1/ic2v11/browser',
    clone() {
      return { text: async () => 'Not Found' };
    }
  };
  const client = new BrowserBindingCmisClient({
    sessionFactory: () => ({
      setCredentials() {},
      loadRepositories() {
        const error = new Error('');
        error.name = 'HTTPError';
        error.response = response;
        return Promise.reject(error);
      }
    })
  });

  await assert.rejects(
    () => client.ConnectAsync('http://127.0.0.1/ic2v11/browser', 'ana', 'secret'),
    (error) => {
      assert.match(error.message, /HTTP 404/);
      assert.match(error.message, /URL usada: http:\/\/127\.0\.0\.1\/ic2v11\/browser/);
      assert.match(error.message, /Respuesta: Not Found/);
      assert.equal(error.status, 404);
      assert.equal(error.responseText, 'Not Found');
      return true;
    }
  );
});


test('AtomPubCmisClient expands objectbyid templates with valid CMIS defaults', () => {
  const client = new AtomPubCmisClient();
  client.uriTemplates.set(
    'objectbyid',
    'http://127.0.0.1/ic2v11/atom/cmis/default/id?id={id}&filter={filter}&includeAllowableActions={includeAllowableActions}&includeACL={includeACL}&includePolicyIds={includePolicyIds}&includeRelationships={includeRelationships}&renditionFilter={renditionFilter}'
  );

  assert.equal(
    client.expandTemplate('objectbyid', { id: '5a40d518-ad12-4c1f-b0ab-01a69ecc03e5' }),
    'http://127.0.0.1/ic2v11/atom/cmis/default/id?id=5a40d518-ad12-4c1f-b0ab-01a69ecc03e5&filter=*&includeAllowableActions=false&includeACL=false&includePolicyIds=false&includeRelationships=none&renditionFilter=cmis%3Anone'
  );
});

test('AtomPubCmisClient expands RFC6570 query objectbyid templates with valid CMIS defaults', () => {
  const client = new AtomPubCmisClient();
  client.uriTemplates.set(
    'objectbyid',
    'http://127.0.0.1/ic2v11/atom/cmis/default/id{?id,filter,includeAllowableActions,includeACL,includePolicyIds,includeRelationships,renditionFilter}'
  );

  assert.equal(
    client.expandTemplate('objectbyid', { id: 'root folder' }),
    'http://127.0.0.1/ic2v11/atom/cmis/default/id?id=root%20folder&filter=*&includeAllowableActions=false&includeACL=false&includePolicyIds=false&includeRelationships=none&renditionFilter=cmis%3Anone'
  );
});

test('BrowserBindingCmisClient falls back to AtomPub when derived Browser Binding URL is missing', async () => {
  const originalFetch = global.fetch;
  const requestedUrls = [];
  const response404 = {
    status: 404,
    statusText: 'Not Found',
    url: 'http://127.0.0.1/ic2v11/browser',
    clone() {
      return { text: async () => 'Not Found' };
    }
  };

  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url) === 'http://127.0.0.1/ic2v11/atom/cmis') {
      return new Response(atomPubServiceDocument(), { status: 200, headers: { 'content-type': 'application/atomsvc+xml' } });
    }
    if (String(url) === 'http://127.0.0.1/ic2v11/atom/cmis/object/root-folder') {
      return new Response(atomPubEntry({ id: 'root-folder', name: '/', type: 'cmis:folder', childrenUrl: 'http://127.0.0.1/ic2v11/atom/cmis/children/root-folder' }), { status: 200 });
    }
    if (String(url) === 'http://127.0.0.1/ic2v11/atom/cmis/children/root-folder') {
      return new Response(atomPubFeed([
        atomPubEntry({ id: 'folder-1', name: 'Projects', type: 'cmis:folder', childrenUrl: 'http://127.0.0.1/ic2v11/atom/cmis/children/folder-1' }),
        atomPubEntry({ id: 'doc-1', name: 'manual.txt', type: 'cmis:document', contentUrl: 'http://127.0.0.1/ic2v11/atom/cmis/content/doc-1' })
      ]), { status: 200 });
    }
    if (String(url) === 'http://127.0.0.1/ic2v11/atom/cmis/content/doc-1') {
      return new Response('atompub document', { status: 200 });
    }
    return new Response('missing', { status: 404, statusText: 'missing' });
  };

  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-atompub-client-test-'));
    const targetPath = path.join(tempDir, 'manual.txt');
    const client = new BrowserBindingCmisClient({
      sessionFactory: (url) => ({
        url,
        setCredentials() {},
        loadRepositories() {
          const error = new Error('Not Found');
          error.name = 'HTTPError';
          error.response = response404;
          return Promise.reject(error);
        }
      })
    });

    const connection = await client.ConnectAsync('http://127.0.0.1/ic2v11/atom/cmis', 'ana', 'secret');
    const root = await client.GetRootFolderAsync();
    const children = await client.ListChildrenAsync(root.id);
    await client.DownloadDocumentAsync('doc-1', targetPath);

    assert.equal(connection.repositoryId, 'repo-atom');
    assert.equal(connection.rootFolderId, 'root-folder');
    assert.equal(root.id, 'root-folder');
    assert.deepEqual(children.map((child) => ({ id: child.id, name: child.name, type: child.type })), [
      { id: 'folder-1', name: 'Projects', type: 'folder' },
      { id: 'doc-1', name: 'manual.txt', type: 'document' }
    ]);
    assert.equal(await fs.readFile(targetPath, 'utf8'), 'atompub document');
    assert.deepEqual(requestedUrls, [
      'http://127.0.0.1/ic2v11/atom/cmis',
      'http://127.0.0.1/ic2v11/atom/cmis/object/root-folder',
      'http://127.0.0.1/ic2v11/atom/cmis/children/root-folder',
      'http://127.0.0.1/ic2v11/atom/cmis/content/doc-1'
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

function atomPubServiceDocument() {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <app:service xmlns:app="http://www.w3.org/2007/app" xmlns:cmisra="http://docs.oasis-open.org/ns/cmis/restatom/200908/" xmlns:cmis="http://docs.oasis-open.org/ns/cmis/core/200908/">
      <app:workspace>
        <cmisra:repositoryInfo>
          <cmis:repositoryId>repo-atom</cmis:repositoryId>
          <cmis:rootFolderId>root-folder</cmis:rootFolderId>
        </cmisra:repositoryInfo>
        <app:collection href="http://127.0.0.1/ic2v11/atom/cmis/children/root-folder">
          <cmisra:collectionType>root</cmisra:collectionType>
        </app:collection>
        <cmisra:uritemplate>
          <cmisra:template>http://127.0.0.1/ic2v11/atom/cmis/object/{id}</cmisra:template>
          <cmisra:type>objectbyid</cmisra:type>
        </cmisra:uritemplate>
      </app:workspace>
    </app:service>`;
}

function atomPubFeed(entries) {
  return `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cmisra="http://docs.oasis-open.org/ns/cmis/restatom/200908/" xmlns:cmis="http://docs.oasis-open.org/ns/cmis/core/200908/">${entries.join('')}</feed>`;
}

function atomPubEntry({ id, name, type, childrenUrl, contentUrl }) {
  return `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:cmisra="http://docs.oasis-open.org/ns/cmis/restatom/200908/" xmlns:cmis="http://docs.oasis-open.org/ns/cmis/core/200908/">
    <title>${name}</title>
    ${childrenUrl ? `<link rel="down" type="application/atom+xml;type=feed" href="${childrenUrl}" />` : ''}
    ${contentUrl ? `<link rel="enclosure" href="${contentUrl}" />` : ''}
    <cmisra:object>
      <cmis:properties>
        <cmis:propertyId propertyDefinitionId="cmis:objectId"><cmis:value>${id}</cmis:value></cmis:propertyId>
        <cmis:propertyString propertyDefinitionId="cmis:name"><cmis:value>${name}</cmis:value></cmis:propertyString>
        <cmis:propertyId propertyDefinitionId="cmis:baseTypeId"><cmis:value>${type}</cmis:value></cmis:propertyId>
      </cmis:properties>
    </cmisra:object>
  </entry>`;
}

test('CmisSyncService can sync folders and documents using BrowserBindingCmisClient with CmisJS', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmis-js-sync-test-'));
  const client = new BrowserBindingCmisClient({ sessionFactory: (url) => new FakeCmisSession(url) });
  const service = new CmisSyncService({ cmisClient: client, localRoot: tempDir, retryDelayMs: 1 });

  const result = await service.sync({ url: 'http://127.0.0.1/cmis/browser', username: 'ana', password: 'secret' });

  assert.equal(result.errors.length, 0);
  assert.equal(result.downloaded, 2);
  assert.equal(await fs.readFile(path.join(tempDir, 'manual.pdf'), 'utf8'), 'browser binding document');
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
  'doc-2': { id: 'doc-2', name: 'plan.txt', baseTypeId: 'cmis:document', size: 11, contentStreamFileName: 'plan.txt', mimeType: 'text/plain' }
};

const childrenByFolder = {
  'root-folder': ['folder-1', 'doc-1'],
  'folder-1': ['doc-2']
};

const contentByDocument = {
  'doc-1': 'browser binding document',
  'doc-2': 'nested plan'
};

function cmisObject({ id, name, baseTypeId, size, contentStreamFileName, mimeType }) {
  return {
    succinctProperties: {
      'cmis:objectId': id,
      'cmis:name': name,
      'cmis:baseTypeId': baseTypeId,
      'cmis:objectTypeId': baseTypeId,
      'cmis:lastModificationDate': '2026-01-02T00:00:00.000Z',
      ...(size == null ? {} : { 'cmis:contentStreamLength': size }),
      ...(id === 'doc-1' ? {
        'cmis:contentStreamFileName': 'manual.pdf',
        'cmis:contentStreamMimeType': 'application/pdf'
      } : {}),
      ...(contentStreamFileName ? {
        'cmis:contentStreamFileName': contentStreamFileName,
        'cmis:contentStreamMimeType': mimeType
      } : {})
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
