/**
 * Abstracción mínima para clientes CMIS usados por CmisSyncService.
 *
 * Las implementaciones reales pueden usar CMIS Browser Binding, AtomPub o un SDK
 * externo, pero deben devolver objetos normalizados con estas propiedades:
 * - id: identificador CMIS único.
 * - name: nombre visible del objeto.
 * - type/kind/baseTypeId o flags isFolder/isDocument para distinguir carpetas y documentos.
 * - lastModified/lastModificationDate/updatedAt opcional para detectar cambios remotos.
 * - size/contentStreamLength opcional para validar documentos.
 * - hash/contentHash opcional cuando el repositorio lo exponga.
 * - contentStreamFileName/fileName requerido para documentos con binario; si falta,
 *   CmisSyncService tratará el documento como sin binario y quitará su copia local.
 */
class ICmisClient {
  async ConnectAsync(_url, _username, _password) {
    throw new Error('ICmisClient.ConnectAsync must be implemented by a concrete CMIS client.');
  }

  async GetRootFolderAsync() {
    throw new Error('ICmisClient.GetRootFolderAsync must be implemented by a concrete CMIS client.');
  }

  async ListChildrenAsync(_folderId) {
    throw new Error('ICmisClient.ListChildrenAsync must be implemented by a concrete CMIS client.');
  }

  async DownloadDocumentAsync(_documentId, _targetPath) {
    throw new Error('ICmisClient.DownloadDocumentAsync must be implemented by a concrete CMIS client.');
  }
}

module.exports = {
  ICmisClient
};
