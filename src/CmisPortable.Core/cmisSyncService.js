const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_INDEX_DIRECTORY = '.cmisportable';
const DEFAULT_INDEX_FILE = 'index.json';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 250;

class CmisSyncService {
  constructor(options = {}) {
    if (!options.cmisClient) {
      throw new Error('cmisClient is required');
    }
    if (!options.localRoot) {
      throw new Error('localRoot is required');
    }

    this.cmisClient = options.cmisClient;
    this.localRoot = path.resolve(options.localRoot);
    this.indexPath = options.indexPath
      ? path.resolve(options.indexPath)
      : path.join(this.localRoot, DEFAULT_INDEX_DIRECTORY, DEFAULT_INDEX_FILE);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.logger = options.logger ?? console;
  }

  /**
   * Sincroniza una carpeta local como espejo de solo lectura del servidor CMIS.
   * Los cambios locales dentro del espejo pueden ser reemplazados o eliminados si
   * difieren del estado remoto o si el objeto remoto ya no existe.
   */
  async SyncAsync(credentials) {
    return this.sync(credentials);
  }

  async sync({ url, username, password, remoteFolder }) {
    const startedAt = new Date().toISOString();
    await fs.mkdir(this.localRoot, { recursive: true });

    const previousIndex = await this.loadIndex();
    const nextEntries = new Map();
    const errors = [];
    const stats = { downloaded: 0, deleted: 0, updated: 0 };

    await this.withRetry(
      () => this.withTimeout(this.cmisClient.ConnectAsync(url, username, password), 'ConnectAsync'),
      'ConnectAsync'
    );

    const rootFolder = await this.withRetry(
      () => this.withTimeout(this.cmisClient.GetRootFolderAsync(), 'GetRootFolderAsync'),
      'GetRootFolderAsync'
    );
    const selectedFolder = await this.resolveSelectedFolder(rootFolder, remoteFolder);

    await this.syncFolder({
      folder: selectedFolder.folder,
      remotePath: selectedFolder.remotePath,
      localPath: this.localRoot,
      previousIndex,
      nextEntries,
      errors,
      stats
    });

    await this.removeMissingLocalItems(previousIndex, nextEntries, errors, stats);

    const index = {
      version: 1,
      mirrorPolicy: 'server-readonly',
      warning: 'La carpeta local se trata como espejo de solo lectura: los cambios locales pueden ser reemplazados o eliminados por el estado de CMIS.',
      updatedAt: new Date().toISOString(),
      startedAt,
      entries: Array.from(nextEntries.values()).sort((a, b) => a.remotePath.localeCompare(b.remotePath)),
      errors
    };

    await this.saveIndex(index);

    return {
      syncedAt: index.updatedAt,
      entries: index.entries.length,
      errors,
      ...stats,
      stats
    };
  }


  async resolveSelectedFolder(rootFolder, remoteFolder = {}) {
    const rootId = getObjectId(rootFolder);
    const selectedId = String(remoteFolder?.id ?? '').trim();
    const selectedPath = String(remoteFolder?.path ?? '/').trim() || '/';

    if (!selectedId || selectedId === rootId || selectedPath === '/') {
      return { folder: rootFolder, remotePath: '/' };
    }

    const queue = [{ folder: rootFolder, remotePath: '/' }];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const currentId = getObjectId(current.folder);
      if (!currentId || visited.has(currentId)) {
        continue;
      }

      if (currentId === selectedId || current.remotePath === selectedPath) {
        return current;
      }

      visited.add(currentId);
      const children = await this.withRetry(
        () => this.withTimeout(this.cmisClient.ListChildrenAsync(currentId), `ListChildrenAsync:${current.remotePath}:browse`),
        `ListChildrenAsync:${current.remotePath}:browse`
      );

      for (const child of children ?? []) {
        if (!isFolder(child)) {
          continue;
        }
        const childId = getObjectId(child);
        const childName = sanitizePathSegment(child.name ?? childId);
        queue.push({
          folder: child,
          remotePath: joinRemotePath(current.remotePath, childName)
        });
      }
    }

    throw new Error(`Selected CMIS source folder was not found: ${selectedPath}`);
  }

  async syncFolder({ folder, remotePath, localPath, previousIndex, nextEntries, errors, stats }) {
    const folderId = getObjectId(folder);
    if (!folderId) {
      throw new Error(`CMIS folder at ${remotePath} does not include an id.`);
    }

    await fs.mkdir(localPath, { recursive: true });
    nextEntries.set(folderId, this.createIndexEntry(folder, remotePath, localPath, 'folder'));

    let children;
    try {
      children = await this.withRetry(
        () => this.withTimeout(this.cmisClient.ListChildrenAsync(folderId), `ListChildrenAsync:${remotePath}`),
        `ListChildrenAsync:${remotePath}`
      );
    } catch (error) {
      this.recordError(errors, remotePath, folderId, error, 'list');
      if (isPermissionDenied(error)) {
        this.preservePreviousSubtree(previousIndex, nextEntries, remotePath);
        return;
      }
      throw error;
    }

    for (const child of children ?? []) {
      const childId = getObjectId(child);
      const childName = getLocalChildName(child, childId);
      const childRemotePath = joinRemotePath(remotePath, childName);
      const childLocalPath = this.safeLocalPath(localPath, childName);

      if (!childId) {
        this.recordError(errors, childRemotePath, null, new Error('CMIS child without id.'), 'inspect');
        continue;
      }

      if (isFolder(child)) {
        try {
          await this.syncFolder({
            folder: child,
            remotePath: childRemotePath,
            localPath: childLocalPath,
            previousIndex,
            nextEntries,
            errors,
            stats
          });
        } catch (error) {
          this.recordError(errors, childRemotePath, childId, error, 'folder');
        }
        continue;
      }

      if (isDocument(child)) {
        try {
          await this.syncDocument({
            document: child,
            remotePath: childRemotePath,
            localPath: childLocalPath,
            previousIndex,
            nextEntries,
            stats
          });
        } catch (error) {
          this.recordError(errors, childRemotePath, childId, error, 'download');
        }
        continue;
      }

      this.recordError(errors, childRemotePath, childId, new Error('Unsupported CMIS object type.'), 'inspect');
    }
  }

  async syncDocument({ document, remotePath, localPath, previousIndex, nextEntries, stats }) {
    const documentId = getObjectId(document);
    const previousEntry = previousIndex.entriesById.get(documentId);
    const remoteFingerprint = getRemoteFingerprint(document);

    await fs.mkdir(path.dirname(localPath), { recursive: true });

    const downloadDecision = await this.shouldDownload({ previousEntry, localPath, remoteFingerprint });

    if (!downloadDecision.download) {
      nextEntries.set(documentId, {
        ...previousEntry,
        remotePath,
        localPath: path.relative(this.localRoot, localPath),
        seenAt: new Date().toISOString()
      });
      return;
    }

    if (previousEntry && downloadDecision.existingFile) {
      stats.updated += 1;
    } else {
      stats.downloaded += 1;
    }

    const tempPath = `${localPath}.cmisportable-download-${process.pid}-${Date.now()}`;
    try {
      await this.withRetry(
        () => this.withTimeout(this.cmisClient.DownloadDocumentAsync(documentId, tempPath), `DownloadDocumentAsync:${remotePath}`),
        `DownloadDocumentAsync:${remotePath}`
      );
      await fs.rename(tempPath, localPath);
    } finally {
      await removeIfExists(tempPath);
    }

    const localMetadata = await getLocalFileMetadata(localPath);
    nextEntries.set(documentId, {
      ...this.createIndexEntry(document, remotePath, localPath, 'document'),
      hash: remoteFingerprint.hash ?? localMetadata.hash,
      size: remoteFingerprint.size ?? localMetadata.size,
      downloadedAt: new Date().toISOString()
    });
  }

  async shouldDownload({ previousEntry, localPath, remoteFingerprint }) {
    if (!previousEntry) {
      return { download: true, existingFile: false };
    }

    const exists = await pathExists(localPath);
    if (!exists) {
      return { download: true, existingFile: false };
    }

    if (remoteFingerprint.lastModified && previousEntry.lastModified !== remoteFingerprint.lastModified) {
      return { download: true, existingFile: true };
    }

    if (remoteFingerprint.hash && previousEntry.hash !== remoteFingerprint.hash) {
      return { download: true, existingFile: true };
    }

    if (remoteFingerprint.size != null && previousEntry.size !== remoteFingerprint.size) {
      return { download: true, existingFile: true };
    }

    return { download: false, existingFile: true };
  }

  preservePreviousSubtree(previousIndex, nextEntries, remotePath) {
    for (const entry of previousIndex.entriesById.values()) {
      if (entry.remotePath === remotePath || entry.remotePath.startsWith(`${remotePath}/`)) {
        nextEntries.set(entry.cmisObjectId, {
          ...entry,
          seenAt: new Date().toISOString(),
          skippedReason: 'permission-denied'
        });
      }
    }
  }

  async removeMissingLocalItems(previousIndex, nextEntries, errors, stats) {
    const missingEntries = Array.from(previousIndex.entriesById.values())
      .filter((entry) => !nextEntries.has(entry.cmisObjectId))
      .sort((a, b) => b.localPath.localeCompare(a.localPath));

    for (const entry of missingEntries) {
      const localPath = this.safeIndexedPath(entry.localPath);
      if (localPath === this.localRoot || localPath === path.dirname(this.indexPath)) {
        continue;
      }

      try {
        await fs.rm(localPath, { recursive: true, force: true });
        if (entry.kind === 'document') {
          stats.deleted += 1;
        }
      } catch (error) {
        this.recordError(errors, entry.remotePath, entry.cmisObjectId, error, 'delete');
      }
    }
  }

  async loadIndex() {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      return {
        ...parsed,
        entries,
        entriesById: new Map(entries.map((entry) => [entry.cmisObjectId, entry]))
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { version: 1, entries: [], entriesById: new Map() };
      }
      throw error;
    }
  }

  async saveIndex(index) {
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await fs.writeFile(this.indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  }

  createIndexEntry(object, remotePath, localPath, kind) {
    const fingerprint = getRemoteFingerprint(object);
    return {
      cmisObjectId: getObjectId(object),
      kind,
      remotePath,
      localPath: path.relative(this.localRoot, localPath),
      lastModified: fingerprint.lastModified,
      size: fingerprint.size,
      hash: fingerprint.hash,
      seenAt: new Date().toISOString()
    };
  }

  async withRetry(operation, label) {
    let lastError;
    for (let attempt = 1; attempt <= this.retryCount; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === this.retryCount || isPermissionDenied(error)) {
          break;
        }
        await delay(this.retryDelayMs * attempt);
      }
    }

    this.logger?.error?.(`CMIS operation failed: ${label}`, lastError);
    throw lastError;
  }

  async withTimeout(promise, label) {
    let timeoutHandle;
    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`CMIS operation timed out: ${label}`)), this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  recordError(errors, remotePath, cmisObjectId, error, operation) {
    const entry = {
      operation,
      cmisObjectId,
      remotePath,
      message: error.message,
      code: error.code ?? error.statusCode ?? error.status,
      permissionDenied: isPermissionDenied(error),
      timestamp: new Date().toISOString()
    };
    errors.push(entry);
    this.logger?.error?.(`CMIS sync error at ${remotePath}`, error);
  }

  safeLocalPath(parentPath, segment) {
    const targetPath = path.resolve(parentPath, segment);
    ensureInsideRoot(this.localRoot, targetPath);
    return targetPath;
  }

  safeIndexedPath(relativePath) {
    const targetPath = path.resolve(this.localRoot, relativePath);
    ensureInsideRoot(this.localRoot, targetPath);
    return targetPath;
  }
}

function getObjectId(object) {
  return object?.id ?? object?.objectId ?? object?.cmisObjectId;
}

function isFolder(object) {
  const type = String(object?.type ?? object?.kind ?? object?.baseTypeId ?? '').toLowerCase();
  return object?.isFolder === true || type.includes('folder');
}

function isDocument(object) {
  const type = String(object?.type ?? object?.kind ?? object?.baseTypeId ?? '').toLowerCase();
  return object?.isDocument === true || type.includes('document');
}

function getRemoteFingerprint(object) {
  return {
    lastModified: normalizeDate(object?.lastModified ?? object?.lastModificationDate ?? object?.updatedAt),
    size: normalizeOptionalNumber(object?.size ?? object?.contentStreamLength),
    hash: object?.hash ?? object?.contentHash ?? object?.sha256 ?? null
  };
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeOptionalNumber(value) {
  if (value == null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function joinRemotePath(parent, childName) {
  return parent === '/' ? `/${childName}` : `${parent}/${childName}`;
}

function getLocalChildName(child, fallbackId) {
  const safeName = sanitizePathSegment(child?.name ?? fallbackId);

  if (!isDocument(child) || hasFileExtension(safeName)) {
    return safeName;
  }

  const contentFileNameExtension = getExtensionFromFileName(child?.contentStreamFileName ?? child?.fileName);
  const mimeTypeExtension = getExtensionFromMimeType(child?.mimeType ?? child?.contentStreamMimeType);
  const extension = contentFileNameExtension ?? mimeTypeExtension;

  return extension ? `${safeName}${extension}` : safeName;
}

function sanitizePathSegment(segment) {
  const safe = String(segment).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim();
  return safe || 'unnamed';
}

function hasFileExtension(fileName) {
  const extension = path.extname(fileName);
  return extension.length > 1;
}

function getExtensionFromFileName(fileName) {
  if (!fileName) {
    return null;
  }

  const extension = path.extname(sanitizePathSegment(fileName)).toLowerCase();
  return extension.length > 1 ? extension : null;
}

function getExtensionFromMimeType(mimeType) {
  const normalized = String(mimeType ?? '').split(';')[0].trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const extensionsByMimeType = {
    'application/msword': '.doc',
    'application/octet-stream': '.bin',
    'application/pdf': '.pdf',
    'application/rtf': '.rtf',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/xml': '.xml',
    'application/zip': '.zip',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'text/csv': '.csv',
    'text/html': '.html',
    'text/markdown': '.md',
    'text/plain': '.txt',
    'text/xml': '.xml'
  };

  return extensionsByMimeType[normalized] ?? null;
}

function ensureInsideRoot(root, targetPath) {
  const relative = path.relative(root, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes the configured local root: ${targetPath}`);
  }
}

function isPermissionDenied(error) {
  return error?.code === 'EACCES' || error?.code === 'EPERM' || error?.status === 403 || error?.statusCode === 403;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function removeIfExists(targetPath) {
  try {
    await fs.rm(targetPath, { force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function getLocalFileMetadata(filePath) {
  const [stats, hash] = await Promise.all([fs.stat(filePath), hashFile(filePath)]);
  return { size: stats.size, hash };
}

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  CmisSyncService,
  DEFAULT_INDEX_DIRECTORY,
  DEFAULT_INDEX_FILE
};
