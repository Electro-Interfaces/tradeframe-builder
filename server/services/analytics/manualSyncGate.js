function createManualSyncGate(cooldownMs = 60_000) {
  const states = new Map();

  function acquire(networkIds, now = Date.now()) {
    const ids = [...new Set(networkIds.map(String))];

    if (ids.some((id) => states.get(id)?.active)) {
      return {
        ok: false,
        status: 409,
        error: 'Сверка для выбранной сети уже выполняется. Дождитесь её завершения.',
      };
    }

    const retryAfterMs = ids.reduce((max, id) => {
      const state = states.get(id);
      if (!state) return max;
      return Math.max(max, state.startedAt + cooldownMs - now);
    }, 0);

    if (retryAfterMs > 0) {
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return {
        ok: false,
        status: 429,
        retryAfterSeconds,
        error: `Повторную сверку можно запустить через ${retryAfterSeconds} сек.`,
      };
    }

    for (const id of ids) states.set(id, { active: true, startedAt: now });
    return { ok: true, networkIds: ids };
  }

  function release(networkIds) {
    for (const id of networkIds) {
      const state = states.get(id);
      if (state) states.set(id, { ...state, active: false });
    }
  }

  return { acquire, release };
}

module.exports = { createManualSyncGate };
