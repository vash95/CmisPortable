const { EventEmitter } = require('node:events');

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
    this.timer = null;
    this.running = false;
    this.paused = true;
    this.lastStatus = createStatus('idle', 'Sincronización en segundo plano detenida.');
  }

  start({ runImmediately = false } = {}) {
    this.paused = false;
    this.scheduleTimer();
    this.updateStatus(createStatus('scheduled', 'Sincronización en segundo plano programada.'));

    if (runImmediately) {
      this.forceSync('start');
    }

    return this.getStatus();
  }

  pause() {
    this.paused = true;
    this.clearTimer();
    this.updateStatus(createStatus('paused', 'Sincronización en segundo plano pausada.', this.lastStatus));
    return this.getStatus();
  }

  resume({ runImmediately = false } = {}) {
    return this.start({ runImmediately });
  }

  stop() {
    this.paused = true;
    this.clearTimer();
    this.updateStatus(createStatus('stopped', 'Sincronización en segundo plano detenida.', this.lastStatus));
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
      const status = createStatus('paused', 'Ciclo omitido porque la sincronización está pausada.', this.lastStatus, { trigger });
      this.updateStatus(status);
      return status;
    }

    if (this.running) {
      const status = createStatus('skipped', 'Ciclo omitido porque ya hay una sincronización en curso.', this.lastStatus, { trigger });
      this.updateStatus(status);
      return status;
    }

    this.running = true;
    const startedAt = new Date().toISOString();
    this.updateStatus(createStatus('running', 'Sincronización en curso.', this.lastStatus, { trigger, startedAt }));

    try {
      const result = await this.syncNowCallback({ trigger, startedAt });
      const finishedAt = new Date().toISOString();
      const status = createStatus('success', 'Sincronización completada correctamente.', this.lastStatus, {
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
      this.logger?.error?.('Background sync failed', sanitizeErrorForLog(error));
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

function sanitizeErrorForLog(error) {
  if (!error || typeof error !== 'object') {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code ?? error.statusCode ?? error.status ?? null,
    stack: error.stack
  };
}

module.exports = {
  BackgroundSyncWorker,
  DEFAULT_BACKGROUND_SYNC_INTERVAL_MS,
  sanitizeErrorForLog
};
