const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const router = express.Router();

// Инициализация кэша
// stdTTL - время жизни по умолчанию в секундах
// checkperiod - период проверки истекших ключей
const cache = new NodeCache({
  stdTTL: 120, // 2 минуты по умолчанию
  checkperiod: 60, // Проверка каждую минуту
  useClones: false // Не клонировать объекты для производительности
});

// Конфигурация TTL для разных endpoint'ов (в секундах)
const CACHE_TTL = {
  '/v1/tanks': 120,              // 2 минуты - резервуары меняются редко
  '/v2/info': 60,                // 1 минута - статусы ТО
  '/v1/pos/prices': 300,         // 5 минут - цены меняются редко
  '/v1/schedule/prices': 300,    // 5 минут - расписание цен
  '/v1/transactions': 180,       // 3 минуты - увеличено для производительности (было 30 сек)
  '/v2/transactions': 300,       // 5 минут - увеличено для производительности (самый медленный endpoint)
  '/v1/coupons': 180,            // 3 минуты - купоны
  '/v1/shifts': 300,             // 5 минут - список смен меняется редко
  '/v1/report/shift_report': 7200,// 2 часа - исторические данные не меняются (было 10 минут)
  '/v1/report/receipts': 300,    // 5 минут - поступления
  '/v1/tank_history': 300,       // 5 минут - история резервуаров
  'default': 60                  // 1 минута - остальные
};

// Статистика кэша
let cacheStats = {
  hits: 0,
  misses: 0,
  lastReset: Date.now()
};

// Lazy initialization для STS client и JWT токена
let stsClient = null;
let jwtToken = null;
let tokenExpiry = null;

async function getStsClient() {
  if (!stsClient) {
    // Получаем конфигурацию STS API из переменных окружения
    const STS_API_URL = process.env.STS_API_URL;
    const STS_API_USERNAME = process.env.STS_API_USERNAME;
    const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

    // Проверяем наличие обязательных переменных
    if (!STS_API_URL || !STS_API_USERNAME || !STS_API_PASSWORD) {
      throw new Error('Missing required STS API environment variables: STS_API_URL, STS_API_USERNAME, STS_API_PASSWORD');
    }

    // Создаем axios клиент для STS API
    stsClient = axios.create({
      baseURL: STS_API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 секунд таймаут (увеличено для медленных запросов на production)
    });

    console.log('[STS Proxy] Client initialized with URL:', STS_API_URL);
  }

  // Проверяем JWT токен
  if (!jwtToken || (tokenExpiry && Date.now() >= tokenExpiry)) {
    await refreshJwtToken();
  }

  return stsClient;
}

async function refreshJwtToken() {
  const STS_API_USERNAME = process.env.STS_API_USERNAME;
  const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

  console.log('[STS Proxy] Refreshing JWT token...');

  try {
    // Получаем JWT токен через /v1/login с JSON body (username и password)
    const response = await stsClient.post('/v1/login', {
      username: STS_API_USERNAME,
      password: STS_API_PASSWORD
    });

    // STS API возвращает токен как строку в кавычках, убираем их
    const rawToken = response.data;
    jwtToken = typeof rawToken === 'string' ? rawToken.replace(/"/g, '') : rawToken;

    // Токен действителен 20 минут, обновляем за 2 минуты до истечения
    tokenExpiry = Date.now() + (18 * 60 * 1000);

    // Обновляем заголовок для всех будущих запросов
    stsClient.defaults.headers['Authorization'] = `Bearer ${jwtToken}`;

    console.log('[STS Proxy] JWT token refreshed successfully');
  } catch (error) {
    console.error('[STS Proxy] Failed to refresh JWT token:', error.message);
    throw new Error('Failed to authenticate with STS API');
  }
}

// Генерация ключа кэша из URL и параметров
function generateCacheKey(urlPath, queryParams) {
  // Сортируем параметры для стабильности ключа
  const sortedParams = Object.keys(queryParams || {})
    .sort()
    .map(key => `${key}=${queryParams[key]}`)
    .join('&');

  return `${urlPath}?${sortedParams}`;
}

// Получение TTL для endpoint'а
function getTTL(urlPath) {
  // Ищем точное совпадение
  if (CACHE_TTL[urlPath]) {
    return CACHE_TTL[urlPath];
  }

  // Ищем по началу пути (например /v1/pos/prices/4 -> /v1/pos/prices)
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (urlPath.startsWith(pattern)) {
      return ttl;
    }
  }

  return CACHE_TTL.default;
}

// Middleware для логирования запросов к STS API и измерения времени
router.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[STS Proxy] ${req.method} ${req.path}`);
  next();
});

// Универсальный обработчик для проксирования запросов с кэшированием
async function proxyRequest(req, res) {
  try {
    const { method, query, body } = req;
    // Используем req.path (без query string) вместо req.originalUrl
    const urlPath = req.path;

    // Генерируем ключ кэша
    const cacheKey = generateCacheKey(urlPath, query);

    // Проверяем кэш только для GET запросов
    if (method === 'GET') {
      const cachedData = cache.get(cacheKey);
      if (cachedData !== undefined) {
        cacheStats.hits++;
        const duration = Date.now() - req.startTime;
        console.log(`[STS Proxy] 💾 Cache HIT for ${urlPath} (${duration}ms, total hits: ${cacheStats.hits})`);
        return res.status(200).json(cachedData);
      } else {
        cacheStats.misses++;
      }
    }

    // Формируем параметры запроса к STS API
    const requestConfig = {
      method: method,
      url: urlPath,
      params: query,
      ...(method !== 'GET' && method !== 'HEAD' && { data: body })
    };

    console.log('[STS Proxy] Request params:', query);

    // Выполняем запрос к STS API
    const client = await getStsClient();
    const response = await client.request(requestConfig);

    // Логируем ответ для отладки
    if (urlPath === '/v1/tanks') {
      console.log('[STS Proxy] Tanks response:', JSON.stringify(response.data).substring(0, 200));
    }

    // Сохраняем в кэш только GET запросы с успешным ответом
    if (method === 'GET' && response.status === 200) {
      const ttl = getTTL(urlPath);
      cache.set(cacheKey, response.data, ttl);
      console.log(`[STS Proxy] 💾 Cached response for ${urlPath} (TTL: ${ttl}s)`);
    }

    // Измеряем время выполнения
    const duration = Date.now() - req.startTime;
    console.log(`[STS Proxy] ⏱️ Request ${req.method} ${urlPath} completed in ${duration}ms (cache misses: ${cacheStats.misses})`);

    // Возвращаем ответ клиенту
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[STS Proxy Error] ${error.message}`);
    if (error.response) {
      console.error('[STS Proxy Error] Response data:', error.response.data);
      console.error('[STS Proxy Error] Request params:', req.query);
    }

    // Обработка ошибок от STS API
    if (error.response) {
      // API вернул ошибку
      res.status(error.response.status).json({
        error: 'STS API Error',
        message: error.response.data?.message || error.message,
        details: error.response.data
      });
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'STS API did not respond'
      });
    } else {
      // Ошибка при настройке запроса
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

// === Endpoints для управления кэшем ===

// Получить статистику кэша
router.get('/_cache/stats', (req, res) => {
  const stats = cache.getStats();
  const uptime = Date.now() - cacheStats.lastReset;
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2)
    : 0;

  res.json({
    cache: {
      keys: stats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: `${hitRate}%`,
      uptime: `${Math.round(uptime / 1000)}s`
    },
    ttl: CACHE_TTL
  });
});

// Очистить кэш
router.post('/_cache/clear', (req, res) => {
  cache.flushAll();
  const oldStats = { ...cacheStats };
  cacheStats = {
    hits: 0,
    misses: 0,
    lastReset: Date.now()
  };

  console.log('[STS Proxy] 🧹 Cache cleared');

  res.json({
    message: 'Cache cleared successfully',
    previousStats: oldStats
  });
});

// === Endpoints для транзакций ===
router.get('/v1/transactions', (req, res) => proxyRequest(req, res));
router.get('/v2/transactions', (req, res) => proxyRequest(req, res));

// === Endpoints для информации о ТО ===
router.get('/v1/info', (req, res) => proxyRequest(req, res));
router.get('/v2/info', (req, res) => proxyRequest(req, res));

// === Endpoints для резервуаров ===
router.get('/v1/tanks', (req, res) => proxyRequest(req, res));

// === Endpoints для смен ===
router.get('/v1/shifts', (req, res) => proxyRequest(req, res));

// === Endpoints для купонов ===
router.get('/v1/coupons', (req, res) => proxyRequest(req, res));

// === Endpoints для отчетов ===
router.get('/v1/report/receipts', (req, res) => proxyRequest(req, res));
router.post('/v1/report/shift_report', (req, res) => proxyRequest(req, res)); // POST для сменных отчетов

// === Endpoints для цен ===
router.get('/v1/prices', (req, res) => proxyRequest(req, res));
router.get('/v1/schedule/prices/:station_number', (req, res) => proxyRequest(req, res));
router.get('/v1/pos/prices/:station_number', (req, res) => proxyRequest(req, res));

// === Endpoints для управления ===
router.post('/v1/control/terminal/open', (req, res) => proxyRequest(req, res));
router.post('/v1/control/terminal/close', (req, res) => proxyRequest(req, res));
router.post('/v1/control/shift/open', (req, res) => proxyRequest(req, res));
router.post('/v1/control/shift/close', (req, res) => proxyRequest(req, res));

// === Универсальный fallback для всех остальных endpoints ===
router.all('*', (req, res) => {
  // req.path - это read-only свойство, используем req.originalUrl напрямую
  // proxyRequest использует req.path, который уже правильно установлен роутером
  proxyRequest(req, res);
});

module.exports = router;
