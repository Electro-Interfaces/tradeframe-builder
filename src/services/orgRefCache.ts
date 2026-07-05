/**
 * TTL-кэш справочных данных орг-структуры (сети, торговые точки).
 *
 * Списки сетей/точек запрашиваются десятками экранов и селекторов —
 * без кэша один и тот же справочник грузится по сети многократно.
 * Кэшируется сам Promise: параллельные вызовы дедуплицируются in-flight.
 *
 * Ответ backend фильтруется по scope пользователя, поэтому записи привязаны
 * к текущему токену: смена пользователя в той же вкладке сбрасывает кэш.
 */

import { getToken } from '@/utils/authStorage';

interface CacheEntry {
  value: Promise<unknown>;
  expiresAt: number;
  token: string | null;
}

export function createTtlCache(ttlMs = 5 * 60_000) {
  const entries = new Map<string, CacheEntry>();

  function get<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const token = getToken();
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && hit.expiresAt > now && hit.token === token) {
      return hit.value as Promise<T>;
    }
    const value = loader().catch((err) => {
      // Ошибку не кэшируем — следующий вызов повторит запрос
      entries.delete(key);
      throw err;
    });
    entries.set(key, { value, expiresAt: now + ttlMs, token });
    return value;
  }

  function invalidate(prefix?: string) {
    if (!prefix) {
      entries.clear();
      return;
    }
    for (const key of entries.keys()) {
      if (key.startsWith(prefix)) entries.delete(key);
    }
  }

  return { get, invalidate };
}
