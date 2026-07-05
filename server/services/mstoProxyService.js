/**
 * MSTO Proxy Service — управление соединением, кэшем и JWT для MSTO IntegratorService.
 * Извлечён из routes/msto.js.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// ─── Кэш ───────────────────────────────────────────────

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 2000 });

// Ключи должны совпадать с реальными путями запросов к MSTO (/private/...) —
// иначе getTTL молча падает в default (так «умер» 2ч-TTL справочника точек).
const CACHE_TTL = {
  '/private/servicePoints': 7200,
  '/private/transactions': 600,
  '/private/tariffs': 3600,
  'default': 600,
};

function generateCacheKey(urlPath, queryParams) {
  const sortedParams = Object.keys(queryParams || {}).sort().map((k) => `${k}=${queryParams[k]}`).join('&');
  return `msto:${urlPath}?${sortedParams}`;
}

function getTTL(urlPath) {
  if (CACHE_TTL[urlPath]) return CACHE_TTL[urlPath];
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (urlPath.startsWith(pattern)) return ttl;
  }
  return CACHE_TTL.default;
}

function getCache(key) { return cache.get(key); }
// При переполнении (ECACHEFULL) сбрасываем кэш — самолечение вместо роста памяти
function setCache(key, data, ttl) {
  try {
    cache.set(key, data, ttl);
  } catch {
    cache.flushAll();
    try { cache.set(key, data, ttl); } catch { /* не кэшируем */ }
  }
}

function clearCache() {
  cache.flushAll();
}

// ─── Client & Token ────────────────────────────────────

let mstoClient = null;
let mstoToken = null;
let mstoTokenExpiry = null;

async function getMstoClient() {
  if (!mstoClient) {
    const MSTO_API_URL = process.env.MSTO_API_URL;
    if (!MSTO_API_URL) throw new Error('Missing required MSTO API environment variable: MSTO_API_URL');
    mstoClient = axios.create({
      baseURL: MSTO_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
    });
  }

  if (!mstoToken || (mstoTokenExpiry && Date.now() >= mstoTokenExpiry)) {
    await refreshToken();
  }

  return mstoClient;
}

async function refreshToken() {
  const { MSTO_USERNAME, MSTO_PASSWORD } = process.env;
  if (!MSTO_USERNAME || !MSTO_PASSWORD) throw new Error('Missing required MSTO credentials');

  try {
    delete mstoClient.defaults.headers['Authorization'];
    delete mstoClient.defaults.headers.common?.['Authorization'];
    mstoToken = null;

    const response = await mstoClient.post('/session', { username: MSTO_USERNAME, password: MSTO_PASSWORD });
    mstoToken = response.data?.item?.token;
    if (!mstoToken) throw new Error('MSTO API did not return a token');

    mstoTokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
    mstoClient.defaults.headers['Authorization'] = mstoToken;
  } catch (error) {
    console.error('[MSTO Proxy] Failed to refresh JWT token:', error.message);
    if (error.response) console.error('[MSTO Proxy] Response:', error.response.status, error.response.data);
    throw new Error('Failed to authenticate with MSTO API');
  }
}

async function invalidateAndRefreshToken() {
  mstoToken = null;
  mstoTokenExpiry = null;
  await refreshToken();
}

function getTokenInfo() {
  return {
    tokenValid: !!mstoToken,
    tokenExpiry: mstoTokenExpiry ? new Date(mstoTokenExpiry).toISOString() : null,
  };
}

// ─── Proxy Request ─────────────────────────────────────

async function proxyRequest(req, res, overridePath) {
  try {
    const { method, query, body } = req;
    const urlPath = overridePath || req.path;
    const cacheKey = generateCacheKey(urlPath, query);

    if (method === 'GET') {
      const cachedData = cache.get(cacheKey);
      if (cachedData !== undefined) return res.status(200).json(cachedData);
    }

    const requestConfig = {
      method,
      url: urlPath,
      params: query,
      ...(method !== 'GET' && method !== 'HEAD' && { data: body }),
    };

    let response;
    try {
      const client = await getMstoClient();
      response = await client.request(requestConfig);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('[MSTO Proxy] 401 received, refreshing token and retrying...');
        await invalidateAndRefreshToken();
        const client = await getMstoClient();
        response = await client.request(requestConfig);
      } else {
        throw error;
      }
    }

    if (method === 'GET' && response.status === 200) {
      setCache(cacheKey, response.data, getTTL(urlPath));
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[MSTO Proxy Error] ${error.message}`);
    if (error.response) {
      res.status(error.response.status).json({ error: 'MSTO API Error', message: error.response.data?.message || error.message, details: error.response.data });
    } else if (error.request) {
      res.status(503).json({ error: 'Service Unavailable', message: 'MSTO API did not respond' });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}

// ─── Service Points Map ────────────────────────────────

let servicePointsMap = null;
let servicePointsMapExpiry = null;

async function getServicePointsMap() {
  if (servicePointsMap && servicePointsMapExpiry && Date.now() < servicePointsMapExpiry) {
    return servicePointsMap;
  }
  try {
    const client = await getMstoClient();
    const response = await client.get('/private/servicePoints');
    const models = response.data?.models || [];
    servicePointsMap = {};
    models.forEach((sp) => { if (sp.name && sp.id) servicePointsMap[sp.name.toLowerCase()] = sp.id; });
    servicePointsMapExpiry = Date.now() + (2 * 60 * 60 * 1000);
    return servicePointsMap;
  } catch (error) {
    console.error('[MSTO Proxy] Failed to load servicePoints map:', error.message);
    return {};
  }
}

// ─── Orders API (no JWT) ───────────────────────────────

async function ordersApiRequest(path, params = {}) {
  const url = `${process.env.MSTO_API_URL}/api/orders${path}`;
  const response = await axios.get(url, { params, timeout: 30000, headers: { 'Content-Type': 'application/json' } });
  return response.data;
}

// ─── Warmup ────────────────────────────────────────────

async function warmupCache() {
  try { await getServicePointsMap(); } catch (error) {
    console.error('[MSTO Proxy] Cache warmup failed:', error.message);
  }
}

// Персистентность кэша между рестартами (деплой ≠ холодный старт для всех)
const cacheSnapshot = require('./cacheSnapshot');

function saveCacheSnapshot() {
  return cacheSnapshot.saveSnapshot(cache, 'msto');
}

function loadCacheSnapshot() {
  return cacheSnapshot.loadSnapshot(cache, 'msto');
}

module.exports = {
  getMstoClient,
  proxyRequest,
  invalidateAndRefreshToken,
  getTokenInfo,
  clearCache,
  getServicePointsMap,
  ordersApiRequest,
  warmupCache,
  generateCacheKey,
  getTTL,
  saveCacheSnapshot,
  loadCacheSnapshot,
  getCache,
  setCache,
};
