/**
 * Общий клиентский кэш транзакций STS для страниц Обзор и Операции.
 *
 * Обе страницы грузят транзакции через stsApiService.getTransactions с одними
 * и теми же параметрами (system, точка, период). Без общего кэша переключение
 * «Обзор → Операции» с тем же периодом заново идёт в сеть и заново мапит тысячи
 * строк. Кэшируем по ключу (system, tradingPoint, период, limit) с коротким TTL
 * и дедупликацией in-flight — повторная выборка отдаётся мгновенно.
 *
 * TTL короткий: свежие транзакции (сегодня) не должны «залипать» надолго.
 * Возвращаем КОПИЮ массива — потребители сортируют список на месте (Операции),
 * это не должно портить кэш. Метку неполноты __partial переносим на копию.
 */

import { stsApiService } from '@/services/sts';
import type { Transaction } from '@/services/sts';
import { getToken } from '@/utils/authStorage';

const TTL_MS = Number(import.meta.env.VITE_TX_CACHE_TTL_MS) || 90_000;

interface Entry {
  value: Promise<Transaction[]>;
  expiresAt: number;
  token: string | null;
}

const cache = new Map<string, Entry>();

function cloneWithPartial(arr: Transaction[]): Transaction[] {
  const copy = arr.slice();
  const partial = (arr as any).__partial;
  if (partial) {
    Object.defineProperty(copy, '__partial', { value: partial, enumerable: false });
  }
  return copy;
}

/**
 * getTransactions с общим кэшем. Сигнатура совпадает с stsApiService.getTransactions.
 */
export async function getCachedTransactions(
  dateFrom?: string,
  dateTo?: string,
  limit?: number,
  contextParams?: { networkId?: string; tradingPointId?: string }
): Promise<Transaction[]> {
  const token = getToken();
  const key = [
    contextParams?.networkId ?? '',
    contextParams?.tradingPointId ?? '',
    dateFrom ?? '',
    dateTo ?? '',
    limit ?? 0,
  ].join('|');

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now && hit.token === token) {
    return cloneWithPartial(await hit.value);
  }

  const value = stsApiService
    .getTransactions(dateFrom, dateTo, limit, contextParams)
    .catch((err) => {
      cache.delete(key); // ошибку не кэшируем
      throw err;
    });
  cache.set(key, { value, expiresAt: now + TTL_MS, token });

  // Лёгкая уборка протухших ключей, чтобы Map не рос бесконечно
  if (cache.size > 64) {
    for (const [k, e] of cache) {
      if (e.expiresAt <= now) cache.delete(k);
    }
  }

  return cloneWithPartial(await value);
}
