const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { ICmisClient } = require('./cmisClient');

const DEFAULT_TIMEOUT_MS = 30_000;
const CMISJS_OPTIONS = { succinct: true };

/**
 * Cliente CMIS basado en CmisJS.
 *
 * CmisJS expone CmisSession como punto de entrada para Browser Binding. Este
 * adaptador mantiene la interfaz interna ICmisClient usada por CmisPortable y
 * normaliza las respuestas para que CmisSyncService no dependa de detalles del
 * SDK ni del formato de propiedades CMIS.
 */
class BrowserBindingCmisClient extends ICmisClient {
  constructor(options = {}) {
    super();
    this.cmis = options.cmisModule ?? loadBundledCmisModule();
    this.sessionFactory = options.sessionFactory ?? null;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.repositoryId = options.repositoryId ?? null;
    this.repositoryUrl = options.repositoryUrl ?? null;
    this.rootFolderId = options.rootFolderId ?? null;
    this.session = null;
    this.username = null;
    this.password = null;

    if (!this.cmis && !this.sessionFactory) {
      throw new Error('BrowserBindingCmisClient requires the CmisJS package. Install the "cmis" dependency or provide options.cmisModule/options.sessionFactory.');
    }
  }

  async ConnectAsync(url, username, password) {
    if (!url) {
      throw new Error('CMIS Browser Binding URL is required.');
    }

    this.username = username ?? '';
    this.password = password ?? '';

    const configuredUrl = normalizeBrowserBindingUrl(url);
    this.session = this.createSession(configuredUrl);
    if (typeof this.session.setCredentials === 'function') {
      this.session.setCredentials(this.username, this.password);
    }

    let repositories;
    try {
      repositories = await this.withTimeout(
        () => executeCmisRequest(this.session.loadRepositories()),
        `CmisJS loadRepositories: ${configuredUrl}`
      );
    } catch (error) {
      throw normalizeConnectionError(error, configuredUrl);
    }
    const selected = selectRepository(repositories, this.session.defaultRepository, this.repositoryId);

    if (selected?.raw && this.session.defaultRepository !== selected.raw) {
      this.session.defaultRepository = selected.raw;
    }

    this.repositoryId = selected?.repositoryId ?? this.repositoryId;
    this.repositoryUrl = normalizeBaseUrl(selected?.repositoryUrl ?? configuredUrl);
    this.rootFolderId = selected?.rootFolderId ?? null;

    if (!this.repositoryUrl) {
      throw new Error('Unable to resolve a CMIS Browser Binding repository URL.');
    }

    if (!this.rootFolderId) {
      const repositoryInfo = await this.getRepositoryInfo();
      const info = normalizeRepositoryInfo(repositoryInfo);
      this.rootFolderId = info?.rootFolderId ?? null;
    }

    if (!this.rootFolderId) {
      const rootFolder = await this.GetRootFolderAsync();
      this.rootFolderId = rootFolder.id;
    }

    return {
      repositoryId: this.repositoryId,
      rootFolderId: this.rootFolderId,
      repositoryUrl: this.repositoryUrl
    };
  }

  async GetRootFolderAsync() {
    this.ensureConnected();

    if (this.rootFolderId) {
      try {
        const rootById = await this.getObject({ objectId: this.rootFolderId });
        return normalizeCmisObject(rootById, 'folder');
      } catch (error) {
        if (!isNotFound(error)) {
          throw error;
        }
      }
    }

    if (typeof this.session.getObjectByPath !== 'function') {
      throw new Error('CmisJS session does not support getObjectByPath and rootFolderId is unavailable.');
    }

    const rootByPath = await this.withTimeout(
      () => executeCmisRequest(this.session.getObjectByPath('/', CMISJS_OPTIONS)),
      'CmisJS getObjectByPath: /'
    );
    const normalizedRoot = normalizeCmisObject(rootByPath, 'folder');
    this.rootFolderId = normalizedRoot.id;
    return normalizedRoot;
  }

  async ListChildrenAsync(folderId) {
    this.ensureConnected();
    if (!folderId) {
      throw new Error('folderId is required to list CMIS children.');
    }

    const response = await this.withTimeout(
      () => executeCmisRequest(this.session.getChildren(folderId, CMISJS_OPTIONS)),
      `CmisJS getChildren: ${folderId}`
    );

    return extractChildren(response).map((child) => normalizeCmisObject(child));
  }

  async DownloadDocumentAsync(documentId, targetPath) {
    this.ensureConnected();
    if (!documentId) {
      throw new Error('documentId is required to download a CMIS document.');
    }
    if (!targetPath) {
      throw new Error('targetPath is required to download a CMIS document.');
    }

    await fsp.mkdir(path.dirname(targetPath), { recursive: true });

    if (typeof this.session.pipeContentStream === 'function') {
      await this.pipeContentStream(documentId, targetPath);
      return;
    }

    const response = await this.withTimeout(
      () => executeCmisRequest(this.session.getContentStream(documentId, 'attachment')),
      `CmisJS getContentStream: ${documentId}`
    );
    await fsp.writeFile(targetPath, await responseToBuffer(response));
  }

  async getRepositoryInfo() {
    this.ensureConnected();
    return this.withTimeout(
      () => executeCmisRequest(this.session.getRepositoryInfo()),
      'CmisJS getRepositoryInfo'
    );
  }

  async getObject({ objectId, path: cmisPath }) {
    if (objectId) {
      return this.withTimeout(
        () => executeCmisRequest(this.session.getObject(objectId, undefined, CMISJS_OPTIONS)),
        `CmisJS getObject: ${objectId}`
      );
    }

    return this.withTimeout(
      () => executeCmisRequest(this.session.getObjectByPath(cmisPath, CMISJS_OPTIONS)),
      `CmisJS getObjectByPath: ${cmisPath}`
    );
  }

  async pipeContentStream(documentId, targetPath) {
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(targetPath);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);

      try {
        const request = this.session.pipeContentStream(documentId, {}, writeStream);
        request?.on?.('error', reject);
      } catch (error) {
        writeStream.destroy();
        reject(error);
      }
    });
  }

  createSession(url) {
    if (this.sessionFactory) {
      return this.sessionFactory(url);
    }
    const cmisApi = this.cmis.cmis ?? this.cmis;
    if (typeof cmisApi.CmisSession === 'function') {
      return new cmisApi.CmisSession(url);
    }
    if (typeof cmisApi.createSession === 'function') {
      return cmisApi.createSession(url);
    }
    throw new Error('Unsupported CmisJS module: expected CmisSession or createSession.');
  }

  async withTimeout(operation, label) {
    let timeout;
    const timeoutPromise = new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${this.timeoutMs} ms.`)), this.timeoutMs);
    });

    try {
      return await Promise.race([Promise.resolve().then(operation), timeoutPromise]);
    } finally {
      clearTimeout(timeout);
    }
  }

  ensureConnected() {
    if (!this.session) {
      throw new Error('ConnectAsync must be called before using the CMIS client.');
    }
  }
}

function loadBundledCmisModule() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const requireFromProject = createRequire(path.join(projectRoot, 'package.json'));
  const cmisPackagePath = path.join(projectRoot, 'node_modules', 'cmis');
  if (!fs.existsSync(cmisPackagePath)) {
    return null;
  }
  return requireFromProject('cmis');
}

function normalizeBaseUrl(url) {
  return String(url ?? '').trim().replace(/\/+$/, '');
}

function normalizeBrowserBindingUrl(url) {
  const baseUrl = normalizeBaseUrl(url);
  return getBrowserBindingUrlCandidate(baseUrl) ?? baseUrl;
}

function getBrowserBindingUrlCandidate(url) {
  if (!url) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const browserPath = toBrowserBindingPath(parsed.pathname);
  if (!browserPath || browserPath === parsed.pathname) {
    return null;
  }

  parsed.pathname = browserPath;
  parsed.search = '';
  parsed.hash = '';
  return normalizeBaseUrl(parsed.toString());
}

function toBrowserBindingPath(pathname) {
  const segments = String(pathname ?? '').split('/');
  const nonEmptySegments = segments.filter((segment) => segment.length > 0);
  if (nonEmptySegments.length === 1 && nonEmptySegments[0].toLowerCase() === 'ic2v11') {
    return '/ic2v11/browser';
  }

  const atomIndex = segments.findIndex((segment) => isAtomBindingSegment(segment));
  if (atomIndex === -1) {
    return null;
  }

  const nextSegment = segments[atomIndex + 1]?.toLowerCase();
  const hasCmisServiceSegment = nextSegment === 'cmis';
  const trailingSegments = hasCmisServiceSegment ? segments.slice(atomIndex + 2) : segments.slice(atomIndex + 1);
  if (trailingSegments.some((segment) => segment.length > 0)) {
    return null;
  }

  const replacement = [...segments.slice(0, atomIndex), 'browser'];
  return replacement.join('/') || '/browser';
}

function isAtomBindingSegment(segment) {
  return ['atom', 'atompub'].includes(String(segment ?? '').toLowerCase());
}

function normalizeConnectionError(error, configuredUrl) {
  if (isXmlJsonParseError(error)) {
    return new Error(`El servidor devolvió XML en lugar de JSON desde ${configuredUrl}. CmisPortable necesita una URL CMIS Browser Binding JSON; si tu URL original termina en /atom/cmis, usa /browser.`);
  }

  return error;
}

function isXmlJsonParseError(error) {
  const message = String(error?.message ?? error ?? '');
  return message.includes("Unexpected token '<'") || message.includes('not valid JSON') && message.includes('<?xml');
}

function parseJsonResponse(text) {
  const body = String(text ?? '').trim();
  if (!body) {
    throw new Error('CMIS Browser Binding response is empty.');
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    if (body.startsWith('<')) {
      throw new Error('El servidor devolvió XML en lugar de JSON. Usa una URL CMIS Browser Binding JSON, no una URL AtomPub o Web Services. Si tu URL termina en /atom/cmis, prueba con /browser.');
    }

    throw new Error(`CMIS Browser Binding response is not valid JSON: ${body.slice(0, 120)}`);
  }
}

function selectRepository(repositories, defaultRepository, preferredRepositoryId) {
  const descriptors = extractRepositories(repositories);
  const defaultDescriptor = normalizeRepositoryDescriptor(defaultRepository);
  if (defaultDescriptor.repositoryId && !descriptors.some((repository) => repository.repositoryId === defaultDescriptor.repositoryId)) {
    descriptors.unshift(defaultDescriptor);
  }

  if (descriptors.length === 0) {
    throw new Error('CmisJS loadRepositories did not return any CMIS repository.');
  }

  return descriptors.find((repository) => repository.repositoryId === preferredRepositoryId) ?? descriptors[0];
}

function normalizeRepositoryInfo(repositoryInfo) {
  const succinct = repositoryInfo?.succinctProperties ?? {};
  const properties = repositoryInfo?.properties ?? {};
  const repositoryId = repositoryInfo?.repositoryId
    ?? repositoryInfo?.id
    ?? valueOfProperty(properties['cmis:repositoryId'])
    ?? succinct['cmis:repositoryId'];
  const rootFolderId = repositoryInfo?.rootFolderId
    ?? repositoryInfo?.rootFolder?.id
    ?? repositoryInfo?.rootFolderId?.value
    ?? valueOfProperty(properties['cmis:rootFolderId'])
    ?? succinct['cmis:rootFolderId'];

  if (!repositoryId && !rootFolderId) {
    return null;
  }

  return { repositoryId, rootFolderId };
}

function extractRepositories(repositoryInfo) {
  if (Array.isArray(repositoryInfo?.repositories)) {
    return repositoryInfo.repositories.map(normalizeRepositoryDescriptor).filter((repository) => repository.repositoryId);
  }

  if (Array.isArray(repositoryInfo)) {
    return repositoryInfo.map(normalizeRepositoryDescriptor).filter((repository) => repository.repositoryId);
  }

  return Object.entries(repositoryInfo ?? {})
    .filter(([, value]) => value && typeof value === 'object')
    .map(([key, value]) => normalizeRepositoryDescriptor({ repositoryId: key, ...value }))
    .filter((repository) => repository.repositoryId);
}

function normalizeRepositoryDescriptor(repository = {}) {
  const info = normalizeRepositoryInfo(repository) ?? {};
  return {
    repositoryId: repository.repositoryId ?? repository.id ?? info.repositoryId,
    repositoryUrl: repository.repositoryUrl ?? repository.browserBindingUrl ?? repository.url,
    rootFolderId: repository.rootFolderId ?? info.rootFolderId,
    raw: repository
  };
}

function extractChildren(response) {
  const objects = response?.objects ?? response?.children ?? response?.results ?? [];
  return objects.map((entry) => entry?.object ?? entry).filter(Boolean);
}

function normalizeCmisObject(object, fallbackType = null) {
  const succinct = object?.succinctProperties ?? {};
  const properties = object?.properties ?? {};
  const baseTypeId = propertyValue(object, properties, succinct, 'cmis:baseTypeId') ?? fallbackType;
  const objectTypeId = propertyValue(object, properties, succinct, 'cmis:objectTypeId');
  const type = mapBaseType(baseTypeId) ?? mapBaseType(objectTypeId) ?? fallbackType ?? object?.type ?? object?.kind;

  return {
    id: propertyValue(object, properties, succinct, 'cmis:objectId') ?? object?.id ?? object?.objectId,
    name: propertyValue(object, properties, succinct, 'cmis:name') ?? object?.name ?? '',
    type,
    kind: type,
    baseTypeId,
    objectTypeId,
    isFolder: type === 'folder',
    isDocument: type === 'document',
    lastModified: propertyValue(object, properties, succinct, 'cmis:lastModificationDate') ?? object?.lastModified ?? object?.lastModificationDate,
    size: propertyValue(object, properties, succinct, 'cmis:contentStreamLength') ?? object?.size ?? object?.contentStreamLength,
    contentHash: firstValue(propertyValue(object, properties, succinct, 'cmis:contentStreamHash')) ?? object?.contentHash ?? object?.hash,
    raw: object
  };
}

function propertyValue(object, properties, succinct, propertyName) {
  return object?.[propertyName]
    ?? succinct?.[propertyName]
    ?? valueOfProperty(properties?.[propertyName]);
}

function valueOfProperty(property) {
  if (property == null) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(property, 'value')) {
    return firstValue(property.value);
  }
  if (Object.prototype.hasOwnProperty.call(property, 'values')) {
    return firstValue(property.values);
  }
  return firstValue(property);
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapBaseType(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('folder')) {
    return 'folder';
  }
  if (normalized.includes('document')) {
    return 'document';
  }
  return null;
}

function isNotFound(error) {
  return error?.status === 404 || error?.statusCode === 404 || error?.response?.status === 404;
}

function executeCmisRequest(request) {
  if (isPromiseLike(request)) {
    return request;
  }

  if (request && typeof request.ok === 'function') {
    return new Promise((resolve, reject) => {
      request
        .ok(resolve)
        .notOk?.((response) => reject(createCmisHttpError(response)))
        .error?.(reject);
    });
  }

  return Promise.resolve(request);
}

function isPromiseLike(value) {
  return value && typeof value.then === 'function';
}

function createCmisHttpError(response) {
  const status = response?.status ?? response?.statusCode;
  const text = response?.text ?? response?.body?.message ?? response?.body?.exception ?? '';
  const error = new Error(`CMIS Browser Binding request failed${status ? ` with HTTP ${status}` : ''}${text ? `: ${String(text).slice(0, 500)}` : ''}`);
  error.status = status;
  error.statusCode = status;
  error.response = response;
  return error;
}

async function responseToBuffer(response) {
  if (Buffer.isBuffer(response)) {
    return response;
  }
  if (response instanceof Uint8Array) {
    return Buffer.from(response);
  }
  if (typeof response === 'string') {
    return Buffer.from(response);
  }
  if (typeof response?.arrayBuffer === 'function') {
    return Buffer.from(await response.arrayBuffer());
  }
  if (response?.body && Buffer.isBuffer(response.body)) {
    return response.body;
  }
  if (typeof response?.text === 'function') {
    return Buffer.from(await response.text());
  }
  if (typeof response?.text === 'string') {
    return Buffer.from(response.text);
  }
  throw new Error('CmisJS getContentStream returned an unsupported response type.');
}

module.exports = {
  BrowserBindingCmisClient,
  normalizeCmisObject,
  extractChildren,
  parseJsonResponse,
  normalizeBrowserBindingUrl,
  executeCmisRequest
};
