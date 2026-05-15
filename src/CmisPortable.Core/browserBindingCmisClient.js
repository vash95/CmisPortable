const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { ICmisClient } = require('./cmisClient');

const DEFAULT_TIMEOUT_MS = 30_000;
const CMISJS_OPTIONS = { succinct: true };
const ATOMPUB_FEED_TYPE = 'application/atom+xml;type=feed';
const ATOMPUB_OBJECT_BY_ID_DEFAULTS = {
  filter: '*',
  includeAllowableActions: 'false',
  includeACL: 'false',
  includePolicyIds: 'false',
  includeRelationships: 'none',
  renditionFilter: 'cmis:none'
};


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
    this.delegateClient = null;

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

    this.delegateClient = null;
    const originalUrl = normalizeBaseUrl(url);
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
      if (shouldFallbackToAtomPub(error, originalUrl, configuredUrl)) {
        const atomPubClient = new AtomPubCmisClient({ timeoutMs: this.timeoutMs });
        try {
          const connection = await atomPubClient.ConnectAsync(originalUrl, this.username, this.password);
          this.delegateClient = atomPubClient;
          this.repositoryId = connection.repositoryId;
          this.repositoryUrl = connection.repositoryUrl;
          this.rootFolderId = connection.rootFolderId;
          return connection;
        } catch (atomPubError) {
          throw await normalizeConnectionError(atomPubError, originalUrl);
        }
      }
      throw await normalizeConnectionError(error, configuredUrl);
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
    if (this.delegateClient) {
      return this.delegateClient.GetRootFolderAsync();
    }
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
    if (this.delegateClient) {
      return this.delegateClient.ListChildrenAsync(folderId);
    }
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
    if (this.delegateClient) {
      return this.delegateClient.DownloadDocumentAsync(documentId, targetPath);
    }
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

class AtomPubCmisClient extends ICmisClient {
  constructor(options = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.serviceUrl = null;
    this.username = '';
    this.password = '';
    this.repositoryId = null;
    this.repositoryUrl = null;
    this.rootFolderId = null;
    this.rootChildrenUrl = null;
    this.uriTemplates = new Map();
    this.objectLinks = new Map();
  }

  async ConnectAsync(url, username, password) {
    if (!url) {
      throw new Error('CMIS AtomPub URL is required.');
    }

    this.serviceUrl = normalizeBaseUrl(url);
    this.username = username ?? '';
    this.password = password ?? '';

    const serviceXml = await this.requestText(this.serviceUrl, 'CMIS AtomPub service document');
    const service = parseAtomPubServiceDocument(serviceXml, this.serviceUrl);
    this.repositoryId = service.repositoryId;
    this.rootFolderId = service.rootFolderId;
    this.repositoryUrl = this.serviceUrl;
    this.rootChildrenUrl = service.rootChildrenUrl;
    this.uriTemplates = service.uriTemplates;

    if (!this.repositoryId && !this.rootFolderId && this.uriTemplates.size === 0 && !this.rootChildrenUrl) {
      throw new Error('La respuesta AtomPub no contiene información de repositorio CMIS reconocible.');
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
        const rootXml = await this.requestText(this.expandTemplate('objectbyid', { id: this.rootFolderId }), 'CMIS AtomPub root object');
        return this.rememberObjectLinks(parseAtomPubObject(rootXml, 'folder'));
      } catch (error) {
        if (!isNotFound(error)) {
          throw error;
        }
      }
    }

    if (this.rootChildrenUrl) {
      const rootXml = await this.requestText(this.rootChildrenUrl, 'CMIS AtomPub root collection');
      const root = parseAtomPubObject(rootXml, 'folder');
      if (root?.id) {
        this.rootFolderId = root.id;
        return this.rememberObjectLinks(root);
      }
    }

    throw new Error('No se pudo resolver la carpeta raíz del repositorio CMIS AtomPub.');
  }

  async ListChildrenAsync(folderId) {
    this.ensureConnected();
    if (!folderId) {
      throw new Error('folderId is required to list CMIS children.');
    }

    let childrenUrl = this.getObjectLink(folderId, 'down', ATOMPUB_FEED_TYPE);
    if (!childrenUrl && folderId === this.rootFolderId) {
      childrenUrl = this.rootChildrenUrl;
    }
    if (!childrenUrl) {
      const folder = await this.fetchObjectById(folderId, 'folder');
      childrenUrl = this.getObjectLink(folder.id, 'down', ATOMPUB_FEED_TYPE);
    }
    if (!childrenUrl) {
      throw new Error(`No se encontró un enlace AtomPub de hijos para la carpeta CMIS ${folderId}.`);
    }

    const feedXml = await this.requestText(childrenUrl, `CMIS AtomPub children: ${folderId}`);
    return parseAtomPubFeedObjects(feedXml).map((object) => this.rememberObjectLinks(object));
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
    let contentUrl = this.getObjectLink(documentId, 'enclosure') ?? this.getObjectLink(documentId, 'edit-media');
    if (!contentUrl) {
      const document = await this.fetchObjectById(documentId, 'document');
      contentUrl = this.getObjectLink(document.id, 'enclosure') ?? this.getObjectLink(document.id, 'edit-media');
    }
    if (!contentUrl) {
      throw new Error(`No se encontró un enlace AtomPub de contenido para el documento CMIS ${documentId}.`);
    }

    const response = await this.request(contentUrl, `CMIS AtomPub content: ${documentId}`);
    await fsp.writeFile(targetPath, await responseToBuffer(response));
  }

  async fetchObjectById(objectId, expectedType) {
    const objectXml = await this.requestText(this.expandTemplate('objectbyid', { id: objectId }), `CMIS AtomPub object: ${objectId}`);
    return this.rememberObjectLinks(parseAtomPubObject(objectXml, expectedType));
  }

  expandTemplate(type, values) {
    const template = this.uriTemplates.get(type);
    if (!template) {
      throw new Error(`El documento AtomPub CMIS no incluye la plantilla URI requerida: ${type}.`);
    }

    const templateValues = getAtomPubTemplateValues(type, values);
    return expandAtomPubUriTemplate(template, templateValues);
  }

  rememberObjectLinks(object) {
    if (object?.id && object.links?.length) {
      this.objectLinks.set(object.id, object.links);
    }
    return object;
  }

  getObjectLink(objectId, rel, type) {
    const links = this.objectLinks.get(objectId) ?? [];
    const link = links.find((candidate) => candidate.rel === rel && (!type || candidate.type === type))
      ?? links.find((candidate) => candidate.rel === rel && (!type || String(candidate.type ?? '').startsWith(type.split(';')[0])));
    return link?.href ?? null;
  }

  async requestText(url, label) {
    const response = await this.request(url, label);
    return response.text();
  }

  async request(url, label) {
    let timeout;
    const timeoutPromise = new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${this.timeoutMs} ms.`)), this.timeoutMs);
    });

    try {
      return await Promise.race([fetch(url, { headers: this.createHeaders() }).then(async (response) => {
        if (response.status < 200 || response.status > 299) {
          const error = new Error(`CMIS AtomPub request failed with HTTP ${response.status}. URL: ${url}.`);
          error.status = response.status;
          error.statusCode = response.status;
          error.statusText = response.statusText;
          error.url = url;
          error.responseText = await readResponseText(response);
          error.response = response;
          throw error;
        }
        return response;
      }), timeoutPromise]);
    } finally {
      clearTimeout(timeout);
    }
  }

  createHeaders() {
    if (!this.username && !this.password) {
      return {};
    }
    return { Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}` };
  }

  ensureConnected() {
    if (!this.serviceUrl) {
      throw new Error('ConnectAsync must be called before using the CMIS AtomPub client.');
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

async function normalizeConnectionError(error, configuredUrl) {
  const enrichedError = await enrichCmisError(error);

  if (isXmlJsonParseError(enrichedError)) {
    return new Error(`El servidor devolvió XML en lugar de JSON desde ${configuredUrl}. CmisPortable necesita una URL CMIS Browser Binding JSON; si tu URL original termina en /atom/cmis, usa /browser.`);
  }

  if (enrichedError?.response) {
    return createConnectionHttpError(enrichedError, configuredUrl);
  }

  return enrichedError;
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
    contentStreamFileName: propertyValue(object, properties, succinct, 'cmis:contentStreamFileName') ?? object?.contentStreamFileName ?? object?.fileName,
    mimeType: propertyValue(object, properties, succinct, 'cmis:contentStreamMimeType') ?? object?.mimeType ?? object?.contentStreamMimeType,
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
    return request.catch(async (error) => { throw await enrichCmisError(error); });
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
  error.statusText = response?.statusText ?? null;
  error.url = response?.url ?? null;
  error.responseText = text || null;
  error.response = response;
  return error;
}

async function enrichCmisError(error) {
  if (!error?.response) {
    return error;
  }

  const status = error.response.status ?? error.status ?? error.statusCode ?? null;
  const statusText = error.response.statusText ?? error.statusText ?? '';
  const responseText = error.responseText ?? error.text ?? await readResponseText(error.response);
  const message = buildCmisHttpErrorMessage(status, statusText, responseText, error.response.url);
  const enrichedError = new Error(message);
  enrichedError.name = error.name ?? 'HTTPError';
  enrichedError.code = error.code ?? null;
  enrichedError.status = status;
  enrichedError.statusCode = status;
  enrichedError.statusText = statusText || null;
  enrichedError.url = error.response.url ?? null;
  enrichedError.responseText = responseText || null;
  enrichedError.response = error.response;
  enrichedError.cause = error;
  return enrichedError;
}

async function readResponseText(response) {
  if (!response) {
    return '';
  }

  try {
    if (typeof response.clone === 'function') {
      return await response.clone().text();
    }
    if (typeof response.text === 'function') {
      return await response.text();
    }
  } catch {
    return '';
  }

  return typeof response.text === 'string' ? response.text : '';
}

function buildCmisHttpErrorMessage(status, statusText, responseText, url) {
  const statusPart = status ? `HTTP ${status}` : 'HTTP';
  const reason = String(statusText || responseText || '').trim();
  const reasonPart = reason ? `: ${reason.slice(0, 500)}` : '';
  const urlPart = url ? ` URL: ${url}.` : '';
  return `CMIS Browser Binding request failed with ${statusPart}${reasonPart}.${urlPart}`;
}

function createConnectionHttpError(error, configuredUrl) {
  const status = error.status ?? error.statusCode ?? error.response?.status;
  let message;
  if (status === 401 || status === 403) {
    message = `No se pudo autenticar contra el servidor CMIS (HTTP ${status}). Revisa usuario, contraseña y permisos. URL usada: ${configuredUrl}.`;
  } else if (status === 404) {
    message = `El endpoint CMIS Browser Binding no existe o no es accesible (HTTP 404). URL usada: ${configuredUrl}. Si tu servidor solo ofrece AtomPub, confirma la ruta Browser Binding correcta.`;
  } else {
    message = `El servidor CMIS rechazó la conexión${status ? ` con HTTP ${status}` : ''}. URL usada: ${configuredUrl}.`;
  }

  const responseText = String(error.responseText ?? '').trim();
  if (responseText) {
    message += ` Respuesta: ${responseText.slice(0, 500)}`;
  }

  const connectionError = new Error(message);
  connectionError.name = error.name ?? 'HTTPError';
  connectionError.code = error.code ?? null;
  connectionError.status = status ?? null;
  connectionError.statusCode = status ?? null;
  connectionError.statusText = error.statusText ?? error.response?.statusText ?? null;
  connectionError.url = error.url ?? error.response?.url ?? configuredUrl;
  connectionError.responseText = error.responseText ?? null;
  connectionError.response = error.response;
  connectionError.cause = error;
  return connectionError;
}


function shouldFallbackToAtomPub(error, originalUrl, configuredUrl) {
  if (!originalUrl || !configuredUrl || originalUrl === configuredUrl || !looksLikeAtomPubUrl(originalUrl)) {
    return false;
  }

  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  return status === 404;
}

function looksLikeAtomPubUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  return parsed.pathname.split('/').some(isAtomBindingSegment);
}

function getAtomPubTemplateValues(type, values = {}) {
  const templateValues = type === 'objectbyid' ? { ...ATOMPUB_OBJECT_BY_ID_DEFAULTS } : {};
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value !== undefined && value !== null) {
      templateValues[key] = value;
    }
  }
  return templateValues;
}

function expandAtomPubUriTemplate(template, values = {}) {
  return String(template).replace(/(?:\{|%7B)([^}%]+)(?:\}|%7D)/gi, (match, expression, offset, source) => {
    const operator = expression[0];
    if (operator === '?' || operator === '&') {
      const variables = parseTemplateVariables(expression.slice(1));
      const query = variables
        .map((name) => [name, templateValue(name, values)])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
        .join('&');
      if (!query) {
        return '';
      }
      const previousCharacter = source[offset - 1];
      if (previousCharacter === '?' || previousCharacter === '&') {
        return query;
      }
      return `${operator === '&' || source.slice(0, offset).includes('?') ? '&' : '?'}${query}`;
    }

    const variables = parseTemplateVariables(expression);
    return variables
      .map((name) => templateValue(name, values))
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => encodeURIComponent(String(value)))
      .join(',');
  });
}

function parseTemplateVariables(expression) {
  return String(expression ?? '')
    .split(',')
    .map((name) => name.trim().replace(/[*].*$/, '').replace(/:.*/, ''))
    .filter(Boolean);
}

function templateValue(name, values) {
  if (Object.prototype.hasOwnProperty.call(values, name)) {
    return values[name];
  }
  if (name === 'id' || name === 'objectId') {
    return values.id ?? values.objectId;
  }
  return undefined;
}

function parseAtomPubServiceDocument(xml, baseUrl) {
  const repositoryInfo = firstXmlElement(xml, 'repositoryInfo') ?? '';
  const repositoryId = xmlText(repositoryInfo, 'repositoryId') ?? xmlText(xml, 'repositoryId');
  const rootFolderId = xmlText(repositoryInfo, 'rootFolderId') ?? xmlText(xml, 'rootFolderId');
  const collections = xmlElements(xml, 'collection');
  const rootCollection = collections.find((collection) => ['root', 'children'].includes(String(xmlText(collection, 'collectionType') ?? '').toLowerCase()));
  const uriTemplates = new Map();

  for (const uriTemplate of xmlElements(xml, 'uritemplate')) {
    const type = String(xmlText(uriTemplate, 'type') ?? '').toLowerCase();
    const template = xmlText(uriTemplate, 'template');
    if (type && template) {
      uriTemplates.set(type, resolveXmlUrl(template, baseUrl));
    }
  }

  return {
    repositoryId,
    rootFolderId,
    rootChildrenUrl: rootCollection ? resolveXmlUrl(xmlAttribute(rootCollection, 'href'), baseUrl) : null,
    uriTemplates
  };
}

function parseAtomPubFeedObjects(xml) {
  return xmlElements(xml, 'entry')
    .map((entry) => parseAtomPubObject(entry))
    .filter((object) => object.id);
}

function parseAtomPubObject(xml, expectedType) {
  const objectXml = firstXmlElement(xml, 'object') ?? xml;
  const propertiesXml = firstXmlElement(objectXml, 'properties') ?? objectXml;
  const object = normalizeCmisObject({
    succinctProperties: {
      'cmis:objectId': cmisPropertyValue(propertiesXml, 'cmis:objectId') ?? xmlText(xml, 'id'),
      'cmis:name': cmisPropertyValue(propertiesXml, 'cmis:name') ?? xmlText(xml, 'title'),
      'cmis:baseTypeId': cmisPropertyValue(propertiesXml, 'cmis:baseTypeId') ?? expectedType,
      'cmis:objectTypeId': cmisPropertyValue(propertiesXml, 'cmis:objectTypeId'),
      'cmis:lastModificationDate': cmisPropertyValue(propertiesXml, 'cmis:lastModificationDate'),
      'cmis:contentStreamLength': cmisPropertyValue(propertiesXml, 'cmis:contentStreamLength'),
      'cmis:contentStreamFileName': cmisPropertyValue(propertiesXml, 'cmis:contentStreamFileName'),
      'cmis:contentStreamMimeType': cmisPropertyValue(propertiesXml, 'cmis:contentStreamMimeType')
    }
  }, expectedType);
  object.links = parseAtomPubLinks(xml);
  return object;
}

function cmisPropertyValue(xml, propertyDefinitionId) {
  const property = xmlElements(xml, 'property(?:String|Id|Integer|DateTime|Boolean|Decimal|Html|Uri)')
    .find((candidate) => xmlAttribute(candidate, 'propertyDefinitionId') === propertyDefinitionId || xmlAttribute(candidate, 'queryName') === propertyDefinitionId);
  return property ? xmlText(property, 'value') : undefined;
}

function parseAtomPubLinks(xml) {
  return xmlElements(xml, 'link')
    .map((link) => ({
      rel: xmlAttribute(link, 'rel') ?? '',
      type: xmlAttribute(link, 'type') ?? '',
      href: xmlAttribute(link, 'href') ?? ''
    }))
    .filter((link) => link.href);
}

function firstXmlElement(xml, localNamePattern) {
  return xmlElements(xml, localNamePattern)[0] ?? null;
}

function xmlElements(xml, localNamePattern) {
  const pattern = new RegExp(`<([A-Za-z_][\\w.-]*:)?${localNamePattern}\\b[^>]*(?:/>|>[\\s\\S]*?<\\/\\1?${localNamePattern}>)`, 'gi');
  return Array.from(String(xml ?? '').matchAll(pattern), (match) => match[0]);
}

function xmlText(xml, localName) {
  const pattern = new RegExp(`<([A-Za-z_][\\w.-]*:)?${escapeRegExp(localName)}\\b[^>]*>([\\s\\S]*?)<\\/\\1?${escapeRegExp(localName)}>`, 'i');
  const match = String(xml ?? '').match(pattern);
  return match ? decodeXmlEntities(stripXmlTags(match[2]).trim()) : undefined;
}

function xmlAttribute(xml, name) {
  const pattern = new RegExp(`\\s${escapeRegExp(name)}=(['\"])(.*?)\\1`, 'i');
  const match = String(xml ?? '').match(pattern);
  return match ? decodeXmlEntities(match[2]) : undefined;
}

function resolveXmlUrl(url, baseUrl) {
  if (!url) {
    return null;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function stripXmlTags(value) {
  return String(value ?? '').replace(/<[^>]+>/g, '');
}

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  AtomPubCmisClient,
  normalizeCmisObject,
  extractChildren,
  parseJsonResponse,
  normalizeBrowserBindingUrl,
  executeCmisRequest
};
