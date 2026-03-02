/**
 * MSTO API Proxy Router
 *
 * Proxy для MSTO IntegratorService API
 * Управляет JWT авторизацией и кэшированием
 *
 * MSTO API: http://46.229.214.21:3000
 * Документация: см. docs/MSTO_INTEGRATION.md
 */

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const router = express.Router();

// Инициализация кэша
const cache = new NodeCache({
  stdTTL: 300, // 5 минут по умолчанию
  checkperiod: 60
});

// Конфигурация TTL для разных endpoint'ов (в секундах)
const CACHE_TTL = {
  '/servicePoints': 7200,      // 2 часа - список станций меняется редко
  '/transactions': 600,        // 10 минут - транзакции (увеличено для снижения нагрузки)
  '/tariffs': 3600,            // 1 час - тарифы (агрегаторы)
  'default': 600
};

// JWT токен MSTO (кэшируется на 24 часа или до ошибки 401)
let mstoToken = null;
let mstoTokenExpiry = null;

// Lazy initialization для MSTO client
let mstoClient = null;

/**
 * Получить или создать axios клиент для MSTO API
 */
async function getMstoClient() {
  if (!mstoClient) {
    const MSTO_API_URL = process.env.MSTO_API_URL;

    if (!MSTO_API_URL) {
      throw new Error('Missing required MSTO API environment variable: MSTO_API_URL');
    }

    mstoClient = axios.create({
      baseURL: MSTO_API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90 секунд (MSTO API может быть медленным)
    });

  }

  // Проверяем JWT токен
  if (!mstoToken || (mstoTokenExpiry && Date.now() >= mstoTokenExpiry)) {
    await refreshMstoToken();
  }

  return mstoClient;
}

/**
 * Получить JWT токен MSTO через /session
 * ВАЖНО: MSTO использует токен БЕЗ "Bearer" - просто строка
 */
async function refreshMstoToken() {
  const MSTO_USERNAME = process.env.MSTO_USERNAME;
  const MSTO_PASSWORD = process.env.MSTO_PASSWORD;

  if (!MSTO_USERNAME || !MSTO_PASSWORD) {
    throw new Error('Missing required MSTO credentials: MSTO_USERNAME, MSTO_PASSWORD');
  }

  try {
    // MSTO использует POST /session с JSON body
    // ВАЖНО: поле называется "username", НЕ "login"
    const response = await mstoClient.post('/session', {
      username: MSTO_USERNAME,
      password: MSTO_PASSWORD
    });

    // MSTO возвращает { operationStatus, item: { token, userId, ... } }
    mstoToken = response.data?.item?.token;

    if (!mstoToken) {
      console.error('[MSTO Proxy] Unexpected response structure:', JSON.stringify(response.data));
      throw new Error('MSTO API did not return a token');
    }

    // Токен действителен 24 часа, обновляем за 1 час до истечения
    mstoTokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

    // ВАЖНО: MSTO использует заголовок Authorization БЕЗ "Bearer"
    mstoClient.defaults.headers['Authorization'] = mstoToken;
  } catch (error) {
    console.error('[MSTO Proxy] Failed to refresh JWT token:', error.message);
    if (error.response) {
      console.error('[MSTO Proxy] Response:', error.response.status, error.response.data);
    }
    throw new Error('Failed to authenticate with MSTO API');
  }
}

/**
 * Генерация ключа кэша
 */
function generateCacheKey(urlPath, queryParams) {
  const sortedParams = Object.keys(queryParams || {})
    .sort()
    .map(key => `${key}=${queryParams[key]}`)
    .join('&');

  return `msto:${urlPath}?${sortedParams}`;
}

/**
 * Получение TTL для endpoint'а
 */
function getTTL(urlPath) {
  if (CACHE_TTL[urlPath]) {
    return CACHE_TTL[urlPath];
  }

  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (urlPath.startsWith(pattern)) {
      return ttl;
    }
  }

  return CACHE_TTL.default;
}

// Middleware для логирования
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

/**
 * Сброс JWT токена и повторная авторизация
 */
async function invalidateAndRefreshToken() {
  mstoToken = null;
  mstoTokenExpiry = null;
  // Принудительно обновляем токен
  await refreshMstoToken();
}

/**
 * Универсальный обработчик для проксирования запросов
 * При 401 автоматически обновляет JWT и повторяет запрос
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} [overridePath] - Переопределенный путь (если отличается от req.path)
 */
async function proxyRequest(req, res, overridePath) {
  try {
    const { method, query, body } = req;
    const urlPath = overridePath || req.path;

    // Генерируем ключ кэша
    const cacheKey = generateCacheKey(urlPath, query);

    // Проверяем кэш только для GET запросов
    if (method === 'GET') {
      const cachedData = cache.get(cacheKey);
      if (cachedData !== undefined) {
        return res.status(200).json(cachedData);
      }
    }

    // Формируем параметры запроса
    const requestConfig = {
      method: method,
      url: urlPath,
      params: query,
      ...(method !== 'GET' && method !== 'HEAD' && { data: body })
    };

    // Выполняем запрос с retry на 401
    let response;
    try {
      const client = await getMstoClient();
      response = await client.request(requestConfig);
    } catch (error) {
      if (error.response?.status === 401) {
        // Токен невалиден — обновляем и повторяем
        console.log('[MSTO Proxy] 401 received, refreshing token and retrying...');
        await invalidateAndRefreshToken();
        const client = await getMstoClient();
        response = await client.request(requestConfig);
      } else {
        throw error;
      }
    }

    // Сохраняем в кэш только GET запросы
    if (method === 'GET' && response.status === 200) {
      const ttl = getTTL(urlPath);
      cache.set(cacheKey, response.data, ttl);
    }

    // Возвращаем ответ
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[MSTO Proxy Error] ${error.message}`);

    if (error.response) {
      console.error('[MSTO Proxy Error] Response data:', error.response.data);
      res.status(error.response.status).json({
        error: 'MSTO API Error',
        message: error.response.data?.message || error.message,
        details: error.response.data
      });
    } else if (error.request) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'MSTO API did not respond'
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

// === Health check ===
router.get('/health', async (req, res) => {
  try {
    const client = await getMstoClient();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tokenValid: !!mstoToken,
      tokenExpiry: mstoTokenExpiry ? new Date(mstoTokenExpiry).toISOString() : null
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

// === Очистка кэша ===
router.post('/_cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

// === Принудительное обновление JWT токена ===
router.post('/_token/refresh', async (req, res) => {
  try {
    await invalidateAndRefreshToken();
    res.json({
      message: 'Token refreshed successfully',
      tokenValid: !!mstoToken,
      tokenExpiry: mstoTokenExpiry ? new Date(mstoTokenExpiry).toISOString() : null
    });
  } catch (error) {
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

// === Endpoints для MSTO API ===
// ВАЖНО: MSTO API использует пути /private/*, но наш прокси убирает /private для удобства

/**
 * Преобразование даты из ISO (yyyy-MM-dd) в формат MSTO (dd.MM.yyyy HH:mm:ss)
 */
function convertDateToMstoFormat(isoDate) {
  if (!isoDate) return null;

  // Если уже в формате dd.MM.yyyy, возвращаем как есть
  if (/^\d{2}\.\d{2}\.\d{4}/.test(isoDate)) {
    return isoDate;
  }

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return null;
  }
}

/**
 * Middleware для преобразования параметров запроса транзакций
 * - Даты: ISO (yyyy-MM-dd) → MSTO (dd.MM.yyyy HH:mm:ss)
 * - operationResults (plural) → operationResult (singular)
 * - servicePointIds (plural) → servicePointId (singular)
 */
function convertTransactionParams(req, res, next) {
  // Преобразуем dateFrom и dateTo из ISO в MSTO формат
  if (req.query.dateFrom) {
    const dateFrom = req.query.dateFrom.includes('T') ? req.query.dateFrom : `${req.query.dateFrom}T00:00:00`;
    req.query.dateFrom = convertDateToMstoFormat(dateFrom);
  }

  if (req.query.dateTo) {
    const dateTo = req.query.dateTo.includes('T') ? req.query.dateTo : `${req.query.dateTo}T23:59:59`;
    req.query.dateTo = convertDateToMstoFormat(dateTo);
  }

  // Преобразуем operationResults → operationResult
  // Frontend может отправить: "success,wait" или ["success", "wait"]
  if (req.query.operationResults && !req.query.operationResult) {
    const results = Array.isArray(req.query.operationResults)
      ? req.query.operationResults
      : req.query.operationResults.split(',');

    // MSTO API принимает comma-separated список: "success,wait"
    req.query.operationResult = results.join(',');
    delete req.query.operationResults;
  }

  // Если frontend отправил сокращение "sw" - преобразуем в полную форму
  if (req.query.operationResult === 'sw') {
    req.query.operationResult = 'success,wait';
  }

  // Преобразуем servicePointIds → servicePointId (MSTO принимает comma-separated)
  if (req.query.servicePointIds && !req.query.servicePointId) {
    const ids = Array.isArray(req.query.servicePointIds)
      ? req.query.servicePointIds.join(',')
      : req.query.servicePointIds;
    req.query.servicePointId = ids;
    delete req.query.servicePointIds;
  }

  // Устанавливаем размер страницы по умолчанию (оптимизировано для баланса скорости и полноты)
  if (!req.query.size) {
    req.query.size = '2000';
  }

  next();
}

// Список станций - /private/servicePoints
// ВАЖНО: Для аккаунта tf-integration этот endpoint может быть недоступен (Access Denied)
// В таком случае возвращаем пустой массив - маппинг станций захардкожен в dataFetcher.ts
router.get('/servicePoints', async (req, res) => {
  try {
    const client = await getMstoClient();
    const response = await client.get('/private/servicePoints');
    res.json(response.data);
  } catch (error) {
    // Если Access Denied или 403/404 - возвращаем пустой массив
    if (error.response?.status === 403 || error.response?.status === 404 ||
        (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('Access Denied'))) {
      return res.json([]);
    }
    throw error;
  }
});

// Кэш маппинга servicePointName -> servicePointId
let servicePointsMap = null;
let servicePointsMapExpiry = null;

async function getServicePointsMap() {
  // Кэш на 2 часа (список станций меняется редко)
  if (servicePointsMap && servicePointsMapExpiry && Date.now() < servicePointsMapExpiry) {
    return servicePointsMap;
  }

  try {
    const client = await getMstoClient();
    const response = await client.get('/private/servicePoints');
    const models = response.data?.models || [];

    servicePointsMap = {};
    models.forEach(sp => {
      if (sp.name && sp.id) {
        servicePointsMap[sp.name.toLowerCase()] = sp.id;
      }
    });

    servicePointsMapExpiry = Date.now() + (2 * 60 * 60 * 1000); // 2 часа
    return servicePointsMap;
  } catch (error) {
    console.error('[MSTO Proxy] Failed to load servicePoints map:', error.message);
    return {};
  }
}

// Транзакции - /private/transactions
// Поддерживает: dateFrom, dateTo (ISO формат), servicePointId(s), operationResult(s), page, size
// ВАЖНО: Добавляем servicePointId к каждой транзакции на основе servicePointName
router.get('/transactions', convertTransactionParams, async (req, res) => {
  try {
    const { method, query } = req;
    const urlPath = '/private/transactions';
    const cacheKey = generateCacheKey(urlPath, query);

    // Проверяем кэш
    const cachedData = cache.get(cacheKey);
    if (cachedData !== undefined) {
      return res.status(200).json(cachedData);
    }

    // Загружаем маппинг станций
    const spMap = await getServicePointsMap();

    // Выполняем запрос с retry на 401
    let response;
    try {
      const client = await getMstoClient();
      response = await client.get(urlPath, { params: query });
    } catch (error) {
      if (error.response?.status === 401) {
        // Токен невалиден — обновляем и повторяем
        console.log('[MSTO Proxy] 401 on /transactions, refreshing token and retrying...');
        await invalidateAndRefreshToken();
        const client = await getMstoClient();
        response = await client.get(urlPath, { params: query });
      } else {
        throw error;
      }
    }

    // Добавляем servicePointId к каждой транзакции
    if (response.data?.models && Array.isArray(response.data.models)) {
      response.data.models = response.data.models.map(tx => {
        if (tx.servicePointName && !tx.servicePointId) {
          const id = spMap[tx.servicePointName.toLowerCase()];
          if (id) {
            tx.servicePointId = id;
          }
        }
        return tx;
      });
    }

    // Сохраняем в кэш
    const ttl = getTTL(urlPath);
    cache.set(cacheKey, response.data, ttl);

    res.status(200).json(response.data);
  } catch (error) {
    console.error(`[MSTO Proxy Error] ${error.message}`);
    if (error.response) {
      res.status(error.response.status).json({
        error: 'MSTO API Error',
        message: error.response.data?.message || error.message,
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
});

// Тарифы (агрегаторы)
router.get('/tariffs', (req, res) => {
  proxyRequest(req, res, '/private/tariffs');
});

// Детали транзакции
router.get('/transactions/:id', (req, res) => {
  proxyRequest(req, res, `/private/transactions/${req.params.id}`);
});

// ============================================
// Orders API - детальная история заказов
// Новый API на MSTO: /api/orders/*
// ВАЖНО: Orders API НЕ требует JWT авторизации
// ============================================

/**
 * Прямой запрос к Orders API (без JWT)
 */
async function ordersApiRequest(path, params = {}) {
  const MSTO_API_URL = process.env.MSTO_API_URL;
  const url = `${MSTO_API_URL}/api/orders${path}`;
  
  const response = await axios.get(url, {
    params,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  });
  
  return response.data;
}

/**
 * Получить список заказов с фильтрами
 * GET /api/msto/orders/history
 * 
 * Query params: page, size, dateFrom, dateTo, status, agentId, servicePointId, userPhone, orderId
 */
router.get('/orders/history', async (req, res) => {
  try {
    const data = await ordersApiRequest('/history', req.query);
    res.json(data);
  } catch (error) {
    console.error('[MSTO Orders] Error fetching history:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch orders history',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Получить детали заказа по sessionId
 * GET /api/msto/orders/details?sessionId=UUID
 * 
 * Возвращает: order, actions (с timestamps), finish, timeline
 */
router.get('/orders/details', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    const data = await ordersApiRequest('/details', { sessionId });
    res.json(data);
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('[MSTO Orders] Error fetching details:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch order details',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Получить справочник статусов заказов
 * GET /api/msto/orders/statuses
 */
router.get('/orders/statuses', async (req, res) => {
  try {
    const data = await ordersApiRequest('/statuses');
    res.json(data);
  } catch (error) {
    console.error('[MSTO Orders] Error fetching statuses:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch order statuses',
      details: error.response?.data || error.message
    });
  }
});

// Универсальный fallback - добавляем /private к пути
router.all('*', (req, res) => {
  const targetPath = req.path.startsWith('/private') ? req.path : `/private${req.path}`;
  proxyRequest(req, res, targetPath);
});

/**
 * Прогрев кэша при старте сервера
 * Загружает servicePoints map заранее, чтобы первый запрос был быстрее
 */
async function warmupCache() {
  try {
    await getServicePointsMap();
  } catch (error) {
    console.error('[MSTO Proxy] ⚠️ Cache warmup failed:', error.message);
  }
}

module.exports = router;
module.exports.warmupCache = warmupCache;
