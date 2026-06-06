/**
 * TradeLink Integration API client — состояние связи станций для карточки «Связь».
 *
 * Hub отдаёт АГРЕГИРОВАННОЕ состояние всего парка одним запросом
 * (GET /integration/connectivity): статус, classification, qualityScore, каналы,
 * оператор, failover, статистика обрывов за 7 дней. Drill-down по ноде с таймлайном
 * событий — /integration/nodes/:id/diagnostics.
 *
 * Доступ — публичный домен + статичный ключ-заголовок (read-only, без login/token):
 *   TRADELINK_API_URL=https://link.dataworker.ru/api/v1
 *   TRADELINK_CLIENT_ID / TRADELINK_KEY (секрет, только server-side).
 *
 * ВАЖНО: фронт не ходит в Hub напрямую — только через backend (правило проекта).
 * Не поллим чаще ~20 с (норма 30–60 с) — отсюда кэш 30 с.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// ─── Кэш ───────────────────────────────────────────────

const cache = new NodeCache({ stdTTL: 30, checkperiod: 30, useClones: false });

const CACHE_TTL = {
  connectivity: 30,
  diagnostics: 30,
  default: 30,
};

let cacheStats = { hits: 0, misses: 0, lastReset: Date.now() };

function getCacheStats() {
  const stats = cache.getStats();
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;
  return {
    cache: { keys: stats.keys, hits: cacheStats.hits, misses: cacheStats.misses, hitRate: `${hitRate}%` },
    ttl: CACHE_TTL,
  };
}

function clearCache() {
  const old = { ...cacheStats };
  cache.flushAll();
  cacheStats = { hits: 0, misses: 0, lastReset: Date.now() };
  return old;
}

// ─── HTTP-клиент (ключ-заголовок, без токена) ──────────

let hubClient = null;

function getHubClient() {
  if (!hubClient) {
    const { TRADELINK_API_URL, TRADELINK_CLIENT_ID, TRADELINK_KEY } = process.env;
    if (!TRADELINK_API_URL) {
      throw new Error('Missing required TradeLink env variable: TRADELINK_API_URL');
    }
    if (!TRADELINK_CLIENT_ID || !TRADELINK_KEY) {
      throw new Error('Missing required TradeLink credentials: TRADELINK_CLIENT_ID, TRADELINK_KEY');
    }
    hubClient = axios.create({
      baseURL: TRADELINK_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Client-Id': TRADELINK_CLIENT_ID,
        'X-Integration-Key': TRADELINK_KEY,
      },
      timeout: 30000,
    });
  }
  return hubClient;
}

async function hubGet(urlPath, ttlKey, cacheKey) {
  const key = cacheKey || urlPath;
  const cached = cache.get(key);
  if (cached !== undefined) {
    cacheStats.hits++;
    return cached;
  }
  cacheStats.misses++;
  const response = await getHubClient().get(urlPath);
  cache.set(key, response.data, CACHE_TTL[ttlKey] || CACHE_TTL.default);
  return response.data;
}

// ─── Доменные методы ───────────────────────────────────

// Весь парк одним запросом: { generatedAt, count, nodes: [...] }.
async function getConnectivity() {
  return hubGet('/integration/connectivity', 'connectivity', 'connectivity');
}

// Drill-down по ноде: состояние + recentEvents (таймлайн за 7 дней) + overlayIp.
async function getNodeDiagnostics(nodeId) {
  return hubGet(
    `/integration/nodes/${encodeURIComponent(nodeId)}/diagnostics`,
    'diagnostics',
    `diag:${nodeId}`,
  );
}

module.exports = {
  getConnectivity,
  getNodeDiagnostics,
  getCacheStats,
  clearCache,
};
