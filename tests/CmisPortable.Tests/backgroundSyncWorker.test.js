const test = require('node:test');
const assert = require('node:assert/strict');
const { BackgroundSyncWorker, DEFAULT_BACKGROUND_SYNC_INTERVAL_MS } = require('../../src/CmisPortable.Core/backgroundSyncWorker');

test('BackgroundSyncWorker uses a 60 second interval by default', () => {
  const worker = new BackgroundSyncWorker({ syncNow: async () => ({}) });

  assert.equal(worker.getStatus().intervalMs, DEFAULT_BACKGROUND_SYNC_INTERVAL_MS);
  assert.equal(DEFAULT_BACKGROUND_SYNC_INTERVAL_MS, 60_000);
});

test('BackgroundSyncWorker runs manual syncs and records file counters', async () => {
  const worker = new BackgroundSyncWorker({
    syncNow: async () => ({ downloaded: 2, updated: 1, deleted: 3, entries: 6, errors: [] }),
    logger: { info() {}, error() {} }
  });

  const status = await worker.forceSync('manual');

  assert.equal(status.state, 'success');
  assert.equal(status.result.downloaded, 2);
  assert.equal(status.result.updated, 1);
  assert.equal(status.result.deleted, 3);
  assert.equal(status.lastSuccessAt, status.updatedAt);
});

test('BackgroundSyncWorker skips overlapping cycles', async () => {
  let release;
  const blocker = new Promise((resolve) => {
    release = resolve;
  });
  const worker = new BackgroundSyncWorker({
    syncNow: async () => blocker,
    logger: { info() {}, error() {} }
  });

  const firstRun = worker.forceSync('manual');
  const skipped = await worker.forceSync('manual');

  assert.equal(skipped.state, 'skipped');
  assert.match(skipped.message, /en curso/);

  release({ downloaded: 0, updated: 0, deleted: 0 });
  await firstRun;
});

test('BackgroundSyncWorker records sync errors without throwing', async () => {
  const worker = new BackgroundSyncWorker({
    syncNow: async () => {
      throw new Error('CMIS unavailable');
    },
    logger: { info() {}, error() {} }
  });

  const status = await worker.forceSync('manual');

  assert.equal(status.state, 'error');
  assert.equal(status.error.message, 'CMIS unavailable');
});

test('BackgroundSyncWorker logs sanitized errors without credential fields', async () => {
  let loggedError;
  const error = new Error('Request failed');
  error.password = 'secret-token';
  error.config = { auth: { password: 'secret-token' } };
  const worker = new BackgroundSyncWorker({
    syncNow: async () => {
      throw error;
    },
    logger: { info() {}, error(_message, payload) { loggedError = payload; } }
  });

  await worker.forceSync('manual');

  assert.equal(JSON.stringify(loggedError).includes('secret-token'), false);
  assert.equal(loggedError.message, 'Request failed');
});
