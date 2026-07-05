/**
 * STS Proxy Service — управление соединением, кэшем и токенами для STS API (poscontrol).
 * Извлечён из routes/sts.js для разделения бизнес-логики и роутинга.
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const orgDataSource = require('./org/orgDataSource');

// Эндпоинты, которые могут вызываться без station (per-network).
// Для них при наличии alias-точек в сети делается fan-out:
// основной запрос + параллельные запросы по каждой alias-точке с её
// родными (system, station). Ответы (массивы) объединяются.
//
// Для каждого endpoint указаны имена полей, по которым в массиве ответа
// определяется код станции. Используется и в filter-out (чтобы убрать
// «уехавшие» алиас-станции из ответа их родной сети), и в потенциальной
// дедупликации.
const PER_NETWORK_CONFIG = {
  '/v1/transactions':    ['stationNumber', 'number', 'station'],
  '/v2/transactions':    ['number'],
  '/v1/coupons':         ['number'],
  '/v1/coupons_manual':  ['number'],
  '/v1/report/receipts': ['number'],
};
const PER_NETWORK_FANOUT_ENDPOINTS = new Set(Object.keys(PER_NETWORK_CONFIG));

function getStationFieldsForEndpoint(urlPath) {
  return PER_NETWORK_CONFIG[urlPath] || [];
}

// URL-паттерны, у которых station передаётся в URL, а не в query.
// Возвращает stationCode или null. Регэксп строгий — без trailing.
function extractStationFromUrl(urlPath) {
  const match = /^\/v1\/(?:pos|schedule)\/prices\/([^/?]+)$/.exec(urlPath);
  return match ? decodeURIComponent(match[1]) : null;
}

// Стабильный хэш-сегмент алиасов сети для cache-key.
// При изменении набора алиасов меняется ключ — старые склеенные ответы
// автоматически перестают использоваться.
function buildAliasCacheTag(expansions) {
  if (!expansions || expansions.length === 0) return '';
  const sorted = [...expansions]
    .map(e => `${e.physicalSystem}-${e.stationCode}`)
    .sort()
    .join(',');
  return `:alias=${sorted}`;
}

// ─── Кэш ───────────────────────────────────────────────

const cache = new NodeCache({
  stdTTL: 120,
  checkperiod: 60,
  useClones: false,
  // Потолок ключей: 24ч-TTL отчётов смен иначе растит память до PM2
  // max_memory_restart → рестарт → повторный warmup-шторм на STS.
  maxKeys: 8000,
});

// set с самолечением: при переполнении (ECACHEFULL) сбрасываем кэш целиком —
// холодный кэш дешевле цикла «OOM-рестарт → warmup».
function cacheSet(key, value, ttl) {
  try {
    cache.set(key, value, ttl);
  } catch {
    cache.flushAll();
    try { cache.set(key, value, ttl); } catch { /* не кэшируем */ }
  }
}

const CACHE_TTL = {
  '/v1/tanks': 120,
  '/v2/info': 60,
  '/v1/pos/prices': 300,
  '/v1/schedule/prices': 300,
  '/v1/transactions': 180,
  '/v2/transactions': 300,
  '/v1/coupons': 0,
  '/v1/coupons_manual': 0,
  '/v1/shifts': 300,
  // Отчёт закрытой смены неизменен — держим в кэше сутки, чтобы «Остатки»/сменные
  // отчёты после первого (холодного) захода весь день открывались мгновенно.
  '/v1/report/shift_report': 86400,
  '/v1/report/receipts': 300,
  '/v1/tank_history': 300,
  'default': 60,
};

let cacheStats = { hits: 0, misses: 0, lastReset: Date.now() };

const CACHE_INVALIDATION_MAP = {
  '/v1/prices': ['/v1/pos/prices', '/v1/schedule/prices', '/v1/prices'],
  '/v1/control/restart': ['/v2/info', '/v1/info'],
  '/v1/control/shift_open': ['/v2/info', '/v1/info', '/v1/shifts'],
  '/v1/control/shift_close': ['/v2/info', '/v1/info', '/v1/shifts'],
  '/v1/control/coupon': ['/v1/coupons', '/v1/coupons_manual'],
};

function generateCacheKey(urlPath, queryParams) {
  const sortedParams = Object.keys(queryParams || {})
    .sort()
    .map((key) => `${key}=${queryParams[key]}`)
    .join('&');
  return `${urlPath}?${sortedParams}`;
}

function getTTL(urlPath) {
  if (CACHE_TTL[urlPath]) return CACHE_TTL[urlPath];
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (urlPath.startsWith(pattern)) return ttl;
  }
  return CACHE_TTL.default;
}

// Эффективный TTL с учётом содержимого ответа.
// Сменный отчёт неизменен (и кэшируется на сутки) только для ЗАКРЫТОЙ смены.
// Пока смена открыта, STS возвращает отчёт без финализированных release/sales/money.
// Если закэшировать такой пустой снимок на 24ч, отчёт «залипает» пустым даже после
// закрытия смены (до истечения TTL). Поэтому для незаполненного отчёта держим
// короткий TTL — он самообновится, как только смена закроется и данные появятся.
function getEffectiveTTL(urlPath, data, queryParams) {
  const baseTTL = getTTL(urlPath);
  if (urlPath === '/v1/report/shift_report') {
    const d = Array.isArray(data) ? data[0] : data;
    const hasRelease = Array.isArray(d?.release) && d.release.length > 0;
    const hasSales = Array.isArray(d?.sales) && d.sales.length > 0;
    if (!hasRelease && !hasSales) {
      return CACHE_TTL.default; // открытая/неполная смена — не залипаем на сутки
    }
  }

  // Чанк транзакций, целиком закончившийся ДО сегодняшних суток, неизменяем —
  // держим долго (как отчёты закрытых смен). Это спасает от повторного
  // 10-секундного похода в STS за каждым историческим куском месяца.
  if (urlPath === '/v1/transactions' || urlPath === '/v2/transactions') {
    const dtEnd = queryParams?.dt_end;
    if (dtEnd) {
      const end = new Date(String(dtEnd).replace(' ', 'T'));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (Number.isFinite(end.getTime()) && end < todayStart) {
        return 21600; // 6 часов
      }
    }
  }

  return baseTTL;
}

function invalidateCache(urlPath) {
  const prefixes = CACHE_INVALIDATION_MAP[urlPath];
  if (!prefixes) return 0;

  let deleted = 0;
  for (const key of cache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      cache.del(key);
      deleted++;
    }
  }
  if (deleted > 0) {
    console.log(`[STS Cache] Invalidated ${deleted} keys after POST ${urlPath}`);
  }
  return deleted;
}

function getCacheStats() {
  const stats = cache.getStats();
  const uptime = Date.now() - cacheStats.lastReset;
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;
  return {
    cache: { keys: stats.keys, hits: cacheStats.hits, misses: cacheStats.misses, hitRate: `${hitRate}%`, uptime: `${Math.round(uptime / 1000)}s` },
    ttl: CACHE_TTL,
  };
}

function clearCache() {
  const old = { ...cacheStats };
  cache.flushAll();
  cacheStats = { hits: 0, misses: 0, lastReset: Date.now() };
  return old;
}

// ─── STS Client & Token ────────────────────────────────

let stsClient = null;
let jwtToken = null;
let tokenExpiry = null;
let tokenRefreshPromise = null;
let currentUser = null;
let tokenUserId = null;

const inflightRequests = new Map();

function updateCurrentUser(req) {
  const userId = req?.headers?.['x-user-id'];
  const userName = req?.headers?.['x-user-name'];
  if (userId || userName) {
    currentUser = {
      id: userId || process.env.STS_USER_ID || '00000000-0000-0000-0000-000000000000',
      name: userName ? decodeURIComponent(userName) : (process.env.STS_USER_NAME || 'System'),
    };
  } else if (!currentUser) {
    currentUser = {
      id: process.env.STS_USER_ID || '00000000-0000-0000-0000-000000000000',
      name: process.env.STS_USER_NAME || 'System',
    };
  }
}

function isUserChanged(req) {
  const userId = req?.headers?.['x-user-id'];
  if (!userId) return false;
  return userId !== tokenUserId;
}

async function refreshJwtToken(req) {
  const STS_API_USERNAME = process.env.STS_API_USERNAME;
  const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

  updateCurrentUser(req);

  try {
    const loginClient = axios.create({
      baseURL: process.env.STS_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const defaultUser = { id: '00000000-0000-0000-0000-000000000000', name: 'System' };
    const loginBody = {
      login: STS_API_USERNAME,
      password: STS_API_PASSWORD,
      user: (currentUser && currentUser.id !== '0') ? currentUser : defaultUser,
    };
    const response = await loginClient.post('/v2/login', loginBody);
    const rawToken = response.data;
    jwtToken = typeof rawToken === 'string' ? rawToken.replace(/"/g, '') : rawToken;
    tokenExpiry = Date.now() + (18 * 60 * 1000);
    tokenUserId = currentUser?.id || null;
    stsClient.defaults.headers['Authorization'] = `Bearer ${jwtToken}`;
  } catch (error) {
    console.error('[STS Proxy] Failed to refresh JWT token:', error.message);
    throw new Error('Failed to authenticate with STS API');
  }
}

async function getStsClient(req) {
  if (!stsClient) {
    const { STS_API_URL, STS_API_USERNAME, STS_API_PASSWORD } = process.env;
    if (!STS_API_URL || !STS_API_USERNAME || !STS_API_PASSWORD) {
      throw new Error('Missing required STS API environment variables: STS_API_URL, STS_API_USERNAME, STS_API_PASSWORD');
    }
    stsClient = axios.create({
      baseURL: STS_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 95000,
    });
  }

  const needsRefresh = !jwtToken || (tokenExpiry && Date.now() >= tokenExpiry) || isUserChanged(req);
  if (needsRefresh) {
    if (tokenRefreshPromise) {
      await tokenRefreshPromise;
    } else {
      tokenRefreshPromise = refreshJwtToken(req).finally(() => { tokenRefreshPromise = null; });
      await tokenRefreshPromise;
    }
  }

  return stsClient;
}

// ─── Proxy Request ─────────────────────────────────────

// Объединение ответов основного и alias-запросов для per-network endpoints.
// Все per-network endpoints возвращают массив верхнего уровня — конкатенация.
// Если endpoint вернёт объект — отдаём только основной ответ.
function mergePerNetworkResponses(primaryData, aliasResponses) {
  if (!Array.isArray(primaryData)) {
    return primaryData;
  }
  const merged = [...primaryData];
  for (const aliasData of aliasResponses) {
    if (Array.isArray(aliasData)) {
      merged.push(...aliasData);
    }
  }
  return merged;
}

// Фильтрация ответа STS от данных станций, «уехавших» через alias
// в другую сеть. Применяется к per-network запросам на физическую сеть,
// чтобы данные alias-точек не появлялись и в родной, и в целевой сети.
function filterOutMigratedStations(data, stationCodesToExclude, stationFields) {
  if (!Array.isArray(data) || stationCodesToExclude.length === 0 || !stationFields?.length) return data;
  const excludeSet = new Set(stationCodesToExclude.map(String));
  return data.filter((item) => {
    if (!item || typeof item !== 'object') return true;
    for (const field of stationFields) {
      const v = item[field];
      if (v != null && excludeSet.has(String(v))) return false;
    }
    return true;
  });
}

function buildOutgoingCacheTag(stationCodes) {
  if (!stationCodes || stationCodes.length === 0) return '';
  const sorted = [...stationCodes].map(String).sort().join(',');
  return `:moved=${sorted}`;
}

async function proxyRequest(req, res) {
  try {
    const { method, query, body } = req;
    const urlPath = req.path;

    // Парсим system и station с учётом query, body и URL-пути
    const incomingSystem = query?.system ?? body?.system ?? null;
    const stationFromUrl = extractStationFromUrl(urlPath);
    const stationParam = query?.station ?? body?.station ?? stationFromUrl ?? null;
    const hasStation = stationParam != null && String(stationParam) !== '';

    // Per-station alias подмена: если фронт прислал (system=целевая, station=код)
    // и есть alias на эту пару — подменяем system на physical для запроса к STS.
    let effectiveQuery = { ...(query || {}) };
    let effectiveBody = body && typeof body === 'object' ? { ...body } : body;
    let aliasSubstituted = false;

    if (incomingSystem != null && hasStation) {
      try {
        const reverse = await orgDataSource.findAliasReverse(incomingSystem, stationParam);
        if (reverse && reverse.physicalSystem !== String(incomingSystem)) {
          if (effectiveQuery.system != null) {
            effectiveQuery.system = reverse.physicalSystem;
          }
          if (effectiveBody && typeof effectiveBody === 'object' && effectiveBody.system != null) {
            effectiveBody.system = reverse.physicalSystem;
          }
          aliasSubstituted = true;
        }
      } catch (err) {
        console.warn(`[STS Proxy alias] findAliasReverse failed for ${incomingSystem}/${stationParam}: ${err.message}`);
      }
    }

    // Per-network fan-out: запрос на ЦЕЛЕВУЮ сеть алиасов (например ГИГ) →
    // нужно дополнительно опросить физические сети алиас-точек.
    // Per-network filter-out: запрос на РОДНУЮ сеть алиасов (например БТО) →
    // нужно убрать из ответа данные «уехавших» станций.
    // Эти две операции взаимоисключающие — точка либо целевая, либо родная.
    let aliasExpansions = [];
    let movedStations = [];
    const isPerNetwork =
      method === 'GET' &&
      !hasStation &&
      incomingSystem != null &&
      PER_NETWORK_FANOUT_ENDPOINTS.has(urlPath);

    if (isPerNetwork) {
      try {
        const [expansions, moved] = await Promise.all([
          orgDataSource.getAliasExpansionsForSystem(incomingSystem),
          orgDataSource.getOutgoingAliasesFromSystem(incomingSystem),
        ]);
        aliasExpansions = expansions;
        movedStations = moved;
      } catch (err) {
        console.warn(`[STS Proxy alias] alias-info failed for ${incomingSystem}: ${err.message}`);
      }
    }

    const cacheKey = generateCacheKey(urlPath, effectiveQuery)
      + buildAliasCacheTag(aliasExpansions)
      + buildOutgoingCacheTag(movedStations);

    // Cache check (GET only)
    if (method === 'GET') {
      const cachedData = cache.get(cacheKey);
      if (cachedData !== undefined) {
        cacheStats.hits++;
        return res.status(200).json(cachedData);
      }
      cacheStats.misses++;
    }

    // Request dedup (GET only)
    if (method === 'GET' && inflightRequests.has(cacheKey)) {
      try {
        const result = await inflightRequests.get(cacheKey);
        return res.status(200).json(result);
      } catch { /* in-flight failed, try own */ }
    }

    // Normalize dates
    if (effectiveQuery.dt_beg && /^\d{4}-\d{2}-\d{2}$/.test(effectiveQuery.dt_beg)) {
      effectiveQuery.dt_beg += ' 00:00:00';
    }
    if (effectiveQuery.dt_end && /^\d{4}-\d{2}-\d{2}$/.test(effectiveQuery.dt_end)) {
      effectiveQuery.dt_end += ' 23:59:59';
    }

    updateCurrentUser(req);

    const fetchPromise = (async () => {
      const client = await getStsClient(req);

      const primaryRequestConfig = {
        method,
        url: urlPath,
        params: effectiveQuery,
        ...(method !== 'GET' && method !== 'HEAD' && { data: effectiveBody }),
      };

      // Если нужен fan-out — параллельно делаем дополнительные запросы по alias-точкам.
      if (aliasExpansions.length > 0) {
        const primary = client.request(primaryRequestConfig).catch((err) => {
          console.warn(`[STS Proxy alias] primary request failed ${urlPath} system=${effectiveQuery.system}: ${err.message}`);
          return { data: [], status: 200 };
        });
        const aliasRequests = aliasExpansions.map(ax =>
          client.request({
            method,
            url: urlPath,
            params: { ...effectiveQuery, system: ax.physicalSystem, station: ax.stationCode },
          }).catch((err) => {
            console.warn(`[STS Proxy alias] fan-out failed ${urlPath} system=${ax.physicalSystem} station=${ax.stationCode}: ${err.message}`);
            return { data: [] };
          })
        );

        const [primaryResp, ...aliasResps] = await Promise.all([primary, ...aliasRequests]);
        const merged = mergePerNetworkResponses(primaryResp.data, aliasResps.map(r => r.data));

        console.log(`[STS Proxy alias] ${method} ${urlPath} fan-out across ${aliasExpansions.length} alias-station(s)`);

        return { data: merged, status: primaryResp.status };
      }

      const response = await client.request(primaryRequestConfig);

      // Filter-out: если это per-network запрос на родную сеть алиасов —
      // убрать из ответа данные станций, «уехавших» в другие сети.
      if (movedStations.length > 0 && Array.isArray(response.data)) {
        const stationFields = getStationFieldsForEndpoint(urlPath);
        const before = response.data.length;
        const filtered = filterOutMigratedStations(response.data, movedStations, stationFields);
        if (before !== filtered.length) {
          console.log(`[STS Proxy alias] ${method} ${urlPath} filter-out ${before - filtered.length} migrated rows by [${stationFields.join('|')}] (stations: ${movedStations.join(',')})`);
        }
        return { data: filtered, status: response.status };
      }

      return { data: response.data, status: response.status };
    })();

    if (method === 'GET') {
      const dedupePromise = fetchPromise.then((r) => r.data).catch(() => {});
      inflightRequests.set(cacheKey, dedupePromise);
    }

    try {
      const response = await fetchPromise;

      if (method === 'GET' && response.status === 200) {
        cacheSet(cacheKey, response.data, getEffectiveTTL(urlPath, response.data, effectiveQuery));
      }

      if (method === 'POST' && response.status >= 200 && response.status < 300) {
        invalidateCache(urlPath);
      }

      if (method !== 'GET') {
        const elapsed = Date.now() - (req.startTime || Date.now());
        console.log(`[STS Proxy] ${method} ${urlPath} → ${response.status} (${elapsed}ms)${aliasSubstituted ? ' [alias]' : ''}`);
      }

      res.status(response.status).json(response.data);
    } finally {
      inflightRequests.delete(cacheKey);
    }
  } catch (error) {
    const elapsed = Date.now() - (req.startTime || Date.now());
    console.error(`[STS Proxy Error] ${req.method} ${req.path} (${elapsed}ms): ${error.message}`);
    if (error.response) {
      console.error('[STS Proxy Error] Response data:', error.response.data);
      console.error('[STS Proxy Error] Request params:', req.query);
    }

    if (error.response) {
      res.status(error.response.status).json({
        error: 'STS API Error',
        message: error.response.data?.message || error.message,
        details: error.response.data,
      });
    } else if (error.request) {
      res.status(503).json({ error: 'Service Unavailable', message: 'STS API did not respond' });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}

// ─── Internal request (for server-side aggregation) ────

async function stsInternalRequest(urlPath, params, userHeaders) {
  // Подмена system для alias-точек, чтобы внутренние агрегации
  // (например /api/sts/fuel-inventory) автоматически работали с настоящим STS.
  let effectiveParams = { ...(params || {}) };
  if (effectiveParams.system != null && effectiveParams.station != null) {
    try {
      const reverse = await orgDataSource.findAliasReverse(
        effectiveParams.system,
        effectiveParams.station
      );
      if (reverse && reverse.physicalSystem !== String(effectiveParams.system)) {
        effectiveParams.system = reverse.physicalSystem;
      }
    } catch (err) {
      console.warn(`[STS Internal alias] findAliasReverse failed: ${err.message}`);
    }
  }

  const cacheKey = generateCacheKey(urlPath, effectiveParams);
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    cacheStats.hits++;
    return cached;
  }
  cacheStats.misses++;

  const fakeReq = { headers: userHeaders || {} };
  const client = await getStsClient(fakeReq);
  const response = await client.request({ method: 'GET', url: urlPath, params: effectiveParams });
  cacheSet(cacheKey, response.data, getEffectiveTTL(urlPath, response.data, effectiveParams));
  return response.data;
}

// ─── Exports ───────────────────────────────────────────

module.exports = {
  getStsClient,
  proxyRequest,
  stsInternalRequest,
  updateCurrentUser,
  getCacheStats,
  clearCache,
  invalidateCache,
  get jwtToken() { return jwtToken; },
};
