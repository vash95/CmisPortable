const fs = require('node:fs/promises');
const path = require('node:path');
const { ICmisClient } = require('./cmisClient');

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Cliente CMIS Browser Binding basado en fetch.
 *
 * Acepta URLs de repositorio Browser Binding como:
 *   https://host/cmis/browser/<repositoryId>
 * y, cuando el servidor expone un documento de servicio con repositorios, intenta
 * resolver automáticamente el primer repositorio disponible.
 */
class BrowserBindingCmisClient extends ICmisClient {
  constructor(options = {}) {
    super();
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.repositoryId = options.repositoryId ?? null;
    this.repositoryUrl = options.repositoryUrl ?? null;
    this.rootFolderId = options.rootFolderId ?? null;
    this.username = null;
    this.password = null;

    if (typeof this.fetch !== 'function') {
      throw new Error('BrowserBindingCmisClient requires a fetch implementation. Use Node.js 18+ or provide options.fetch.');
    }
  }

  async ConnectAsync(url, username, password) {
    if (!url) {
      throw new Error('CMIS Browser Binding URL is required.');
    }

    this.username = username ?? '';
    this.password = password ?? '';

    const configuredUrl = normalizeBaseUrl(url);
    const repositoryInfo = await this.getRepositoryInfo(configuredUrl);
    const resolved = resolveRepository(configuredUrl, repositoryInfo, this.repositoryId);

    this.repositoryId = resolved.repositoryId;
    this.repositoryUrl = resolved.repositoryUrl;
    this.rootFolderId = resolved.rootFolderId;

    if (!this.repositoryUrl) {
      throw new Error('Unable to resolve a CMIS Browser Binding repository URL.');
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

    const rootByPath = await this.getObject({ path: '/' });
    const normalizedRoot = normalizeCmisObject(rootByPath, 'folder');
    this.rootFolderId = normalizedRoot.id;
    return normalizedRoot;
  }

  async ListChildrenAsync(folderId) {
    this.ensureConnected();
    if (!folderId) {
      throw new Error('folderId is required to list CMIS children.');
    }

    const response = await this.requestJson({
      cmisselector: 'children',
      objectId: folderId
    });

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

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const response = await this.request({
      cmisselector: 'content',
      objectId: documentId
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, buffer);
  }

  async getRepositoryInfo(baseUrl) {
    return this.requestJson({ cmisselector: 'repositoryInfo' }, baseUrl);
  }

  async getObject({ objectId, path: cmisPath }) {
    const parameters = { cmisselector: 'object' };
    if (objectId) {
      parameters.objectId = objectId;
    } else {
      parameters.path = cmisPath;
    }
    return this.requestJson(parameters);
  }

  async requestJson(parameters, baseUrl = this.repositoryUrl) {
    const response = await this.request(parameters, baseUrl, {
      headers: { Accept: 'application/json' }
    });
    const text = await response.text();
    return parseJsonResponse(text);
  }

  async request(parameters, baseUrl = this.repositoryUrl, options = {}) {
    const requestUrl = appendQuery(baseUrl, parameters);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(requestUrl, {
        method: 'GET',
        ...options,
        headers: {
          ...createAuthorizationHeader(this.username, this.password),
          ...(options.headers ?? {})
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        const error = new Error(`CMIS Browser Binding request failed with HTTP ${response.status}${message ? `: ${message}` : ''}`);
        error.status = response.status;
        error.statusCode = response.status;
        throw error;
      }

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`CMIS Browser Binding request timed out after ${this.timeoutMs} ms: ${requestUrl}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  ensureConnected() {
    if (!this.repositoryUrl) {
      throw new Error('ConnectAsync must be called before using the CMIS client.');
    }
  }
}

function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, '');
}

function appendQuery(baseUrl, parameters) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(parameters ?? {})) {
    if (value != null) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
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
      throw new Error('El servidor devolvió XML en lugar de JSON. Usa una URL CMIS Browser Binding JSON, no una URL AtomPub o Web Services.');
    }

    throw new Error(`CMIS Browser Binding response is not valid JSON: ${body.slice(0, 120)}`);
  }
}

function createAuthorizationHeader(username, password) {
  if (!username && !password) {
    return {};
  }
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

function resolveRepository(configuredUrl, repositoryInfo, preferredRepositoryId) {
  const directRepository = normalizeRepositoryInfo(repositoryInfo);
  if (directRepository) {
    return {
      repositoryId: directRepository.repositoryId ?? preferredRepositoryId,
      repositoryUrl: configuredUrl,
      rootFolderId: directRepository.rootFolderId
    };
  }

  const repositories = extractRepositories(repositoryInfo);
  if (repositories.length === 0) {
    throw new Error('CMIS repositoryInfo response does not describe any repository.');
  }

  const selected = repositories.find((repository) => repository.repositoryId === preferredRepositoryId) ?? repositories[0];
  return {
    repositoryId: selected.repositoryId,
    repositoryUrl: selected.repositoryUrl ? normalizeBaseUrl(selected.repositoryUrl) : `${configuredUrl}/${encodeURIComponent(selected.repositoryId)}`,
    rootFolderId: selected.rootFolderId
  };
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

function normalizeRepositoryDescriptor(repository) {
  const info = normalizeRepositoryInfo(repository) ?? {};
  return {
    repositoryId: repository.repositoryId ?? repository.id ?? info.repositoryId,
    repositoryUrl: repository.repositoryUrl ?? repository.browserBindingUrl ?? repository.url,
    rootFolderId: repository.rootFolderId ?? info.rootFolderId
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

async function readErrorMessage(response) {
  try {
    const text = await response.text();
    return text.trim().slice(0, 500);
  } catch (_error) {
    return '';
  }
}

function isNotFound(error) {
  return error?.status === 404 || error?.statusCode === 404;
}

module.exports = {
  BrowserBindingCmisClient,
  normalizeCmisObject,
  extractChildren,
  parseJsonResponse
};
