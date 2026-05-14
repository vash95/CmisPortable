function createElectronSecureStorage(electronSafeStorage) {
  return {
    async protect(value) {
      if (electronSafeStorage.isEncryptionAvailable()) {
        return {
          value: electronSafeStorage.encryptString(value).toString('base64'),
          storage: 'electron-safeStorage'
        };
      }

      return {
        value: Buffer.from(value, 'utf8').toString('base64'),
        storage: 'base64-fallback'
      };
    },

    async unprotect(secret) {
      if (secret.storage === 'electron-safeStorage' && electronSafeStorage.isEncryptionAvailable()) {
        return electronSafeStorage.decryptString(Buffer.from(secret.protectedValue, 'base64'));
      }

      if (secret.storage === 'base64-fallback') {
        return Buffer.from(secret.protectedValue, 'base64').toString('utf8');
      }

      return '';
    }
  };
}

module.exports = {
  createElectronSecureStorage
};
