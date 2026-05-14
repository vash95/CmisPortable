const { EventEmitter } = require('node:events');
const { t } = require('./i18n');

const DEFAULT_BACKGROUND_SYNC_INTERVAL_MS = 60_000;

class BackgroundSyncWorker extends EventEmitter {
  constructor(options = {}) {
    super();
    if (typeof options.syncNow !== 'function') {
      throw new Error('syncNow is required');
    }

    this.syncNowCallback = options.syncNow;
    this.intervalMs = options.intervalMs ?? DEFAULT_BACKGROUND_SYNC_INTERVAL_MS;
    this.logger = options.logger ?? console;
    this.locale = options.locale;
    this.timer = null;
    this.running = false;
    this.paused = true;
    this.lastStatus = createStatus('idle', t('sync.status.idle', this.locale));
  }

  start({ runImmediately = false } = {}) {
    this.paused = false;
    this.scheduleTimer();
    this.updateStatus(createStatus('scheduled', t('sync.status.scheduled', this.locale)));

    if (runImmediately) {
      this.forceSync('start');
    }

    return this.getStatus();
  }

  pause() {
    this.paused = true;
    this.clearTimer();
    this.updateStatus(createStatus('paused', t('sync.status.paused', this.locale), this.lastStatus));
    return this.getStatus();
  }

  resume({ runImmediately = false } = {}) {
    return this.start({ runImmediately });
  }

  stop() {
    this.paused = true;
    this.clearTimer();
    this.updateStatus(createStatus('stopped', t('sync.status.stopped', this.locale), this.lastStatus));
    return this.getStatus();
  }

  async forceSync(trigger = 'manual') {
    return this.runCycle(trigger, { ignorePaused: true });
  }

  async runScheduledCycle() {
    return this.runCycle('scheduled', { ignorePaused: false });
  }

  async runCycle(trigger, { ignorePaused }) {
    if (this.paused && !ignorePaused) {
      const status = createStatus('paused', t('sync.status.skipped.paused', this.locale), this.lastStatus, { trigger });
      this.updateStatus(status);
      return status;
    }

    if (this.running) {
      const status = createStatus('skipped', t('sync.status.skipped.running', this.locale), this.lastStatus, { trigger });
      this.updateStatus(status);
      return status;
    }

    this.running = true;
    const startedAt = new Date().toISOString();
    this.updateStatus(createStatus('running', t('sync.status.running', this.locale), this.lastStatus, { trigger, startedAt }));

    try {
      const result = await this.syncNowCallback({ trigger, startedAt });
      const finishedAt = new Date().toISOString();
      const status = createStatus('success', t('sync.status.success', this.locale), this.lastStatus, {
        trigger,
        startedAt,
        finishedAt,
        result: normalizeResult(result)
      });
      this.logger?.info?.('Background sync completed', status.result);
      this.updateStatus(status);
      return status;
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const status = createStatus('error', error.message, this.lastStatus, {
        trigger,
        startedAt,
        finishedAt,
        error: {
          message: error.message,
          code: error.code ?? error.statusCode ?? error.status ?? null
        }
      });
      this.logger?.error?.('Background sync failed', error);
      this.updateStatus(status);
      return status;
    } finally {
      this.running = false;
    }
  }

  getStatus() {
    return {
      ...this.lastStatus,
      running: this.running,
      paused: this.paused,
      intervalMs: this.intervalMs
    };
  }

  setIntervalMs(intervalMs) {
    const nextIntervalMs = Number(intervalMs);
    if (!Number.isFinite(nextIntervalMs) || nextIntervalMs <= 0) {
      throw new Error('intervalMs must be a positive number');
    }

    this.intervalMs = nextIntervalMs;
    this.logger?.info?.('Background sync interval updated', { intervalMs: this.intervalMs });
    if (!this.paused) {
      this.scheduleTimer();
    }
    return this.getStatus();
  }

  scheduleTimer() {
    this.clearTimer();
    this.timer = setInterval(() => {
      this.runScheduledCycle();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateStatus(status) {
    this.lastStatus = status;
    this.logger?.info?.('Background sync status changed', {
      state: status.state,
      message: status.message,
      trigger: status.trigger ?? null
    });
    this.emit('status', this.getStatus());
  }
}

function createStatus(state, message, previousStatus = {}, extras = {}) {
  const updatedAt = new Date().toISOString();
  return {
    state,
    message,
    updatedAt,
    lastSuccessAt: state === 'success' ? updatedAt : previousStatus.lastSuccessAt ?? null,
    result: previousStatus.result ?? normalizeResult(),
    ...extras
  };
}

function normalizeResult(result = {}) {
  return {
    downloaded: Number(result.downloaded ?? result.stats?.downloaded ?? 0),
    deleted: Number(result.deleted ?? result.stats?.deleted ?? 0),
    updated: Number(result.updated ?? result.stats?.updated ?? 0),
    entries: Number(result.entries ?? 0),
    errors: Array.isArray(result.errors) ? result.errors : []
  };
}

module.exports = {
  BackgroundSyncWorker,
  DEFAULT_BACKGROUND_SYNC_INTERVAL_MS
};
