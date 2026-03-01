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
  '/v1/coupons': 0,              // БЕЗ КЭША - купоны должны обновляться мгновенно
  '/v1/coupons_manual': 0,       // БЕЗ КЭША - ручные купоны
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

// In-flight request deduplication — если 5 клиентов одновременно запросят /v1/tanks,
// отправляется один запрос к STS API, результат отдаётся всем
const inflightRequests = new Map();

// Lazy initialization для STS client и JWT токена
let stsClient = null;
let jwtToken = null;
let tokenExpiry = null;
let tokenRefreshPromise = null; // Блокировка параллельных refresh

async function getStsClient(req) {
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

  }

  // Проверяем JWT токен: истёк или сменился пользователь
  const needsRefresh = !jwtToken || (tokenExpiry && Date.now() >= tokenExpiry) || isUserChanged(req);
  if (needsRefresh) {
    if (tokenRefreshPromise) {
      // Другой запрос уже обновляет токен — ждём его
      await tokenRefreshPromise;
    } else {
      // Первый запрос — запускаем refresh и сохраняем promise
      tokenRefreshPromise = refreshJwtToken(req).finally(() => {
        tokenRefreshPromise = null;
      });
      await tokenRefreshPromise;
    }
  }

  return stsClient;
}

// Хранение данных текущего пользователя для v2/login
let currentUser = null;
let tokenUserId = null; // ID пользователя, для которого выпущен текущий JWT

function updateCurrentUser(req) {
  const userId = req?.headers?.['x-user-id'];
  const userName = req?.headers?.['x-user-name'];
  if (userId || userName) {
    currentUser = {
      id: userId || process.env.STS_USER_ID || '00000000-0000-0000-0000-000000000000',
      name: userName ? decodeURIComponent(userName) : (process.env.STS_USER_NAME || 'System')
    };
  } else if (!currentUser) {
    currentUser = {
      id: process.env.STS_USER_ID || '00000000-0000-0000-0000-000000000000',
      name: process.env.STS_USER_NAME || 'System'
    };
  }
}

// Проверка, изменился ли пользователь с момента последнего выпуска JWT
function isUserChanged(req) {
  const userId = req?.headers?.['x-user-id'];
  if (!userId) return false; // Нет заголовка — не меняем
  return userId !== tokenUserId;
}

async function refreshJwtToken(req) {
  const STS_API_USERNAME = process.env.STS_API_USERNAME;
  const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

  // Обновляем данные пользователя из заголовков запроса
  updateCurrentUser(req);


  try {
    let response;

    // Используем отдельный axios instance для login (не stsClient), чтобы избежать
    // проблем с зависшими соединениями после таймаута
    const loginClient = axios.create({
      baseURL: process.env.STS_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    // Авторизация через /v2/login с данными пользователя
    const defaultUser = { id: '00000000-0000-0000-0000-000000000000', name: 'System' };
    const loginBody = {
      login: STS_API_USERNAME,
      password: STS_API_PASSWORD,
      user: (currentUser && currentUser.id !== '0') ? currentUser : defaultUser
    };
    response = await loginClient.post('/v2/login', loginBody);
    // STS API возвращает токен как строку в кавычках, убираем их
    const rawToken = response.data;
    jwtToken = typeof rawToken === 'string' ? rawToken.replace(/"/g, '') : rawToken;

    // Токен действителен 20 минут, обновляем за 2 минуты до истечения
    tokenExpiry = Date.now() + (18 * 60 * 1000);
    // Запоминаем, для какого пользователя выпущен токен
    tokenUserId = currentUser?.id || null;

    // Обновляем заголовок для всех будущих запросов
    stsClient.defaults.headers['Authorization'] = `Bearer ${jwtToken}`;
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
        return res.status(200).json(cachedData);
      } else {
        cacheStats.misses++;
      }
    }

    // Request deduplication для GET — если тот же запрос уже in-flight, ждём его
    if (method === 'GET' && inflightRequests.has(cacheKey)) {
      try {
        const result = await inflightRequests.get(cacheKey);
        return res.status(200).json(result);
      } catch (err) {
        // In-flight запрос упал — пробуем свой
      }
    }

    // Формируем параметры запроса к STS API
    const requestConfig = {
      method: method,
      url: urlPath,
      params: query,
      ...(method !== 'GET' && method !== 'HEAD' && { data: body })
    };

    // Обновляем данные пользователя из заголовков frontend-запроса
    updateCurrentUser(req);

    // Создаём promise для дедупликации GET-запросов
    const fetchPromise = (async () => {
      const client = await getStsClient(req);
      const response = await client.request(requestConfig);
      return { data: response.data, status: response.status };
    })();

    if (method === 'GET') {
      // Сохраняем промис с .catch() чтобы избежать unhandled rejection при ошибке STS API
      const dedupePromise = fetchPromise.then(r => r.data).catch(() => { /* handled below via await fetchPromise */ });
      inflightRequests.set(cacheKey, dedupePromise);
    }

    try {
      const response = await fetchPromise;

      // Сохраняем в кэш только GET запросы с успешным ответом
      if (method === 'GET' && response.status === 200) {
        const ttl = getTTL(urlPath);
        cache.set(cacheKey, response.data, ttl);
      }

      // Возвращаем ответ клиенту
      res.status(response.status).json(response.data);
    } finally {
      inflightRequests.delete(cacheKey);
    }
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
router.get('/v1/coupons_manual', (req, res) => proxyRequest(req, res));
router.post('/v1/control/coupon', (req, res) => proxyRequest(req, res));

// === Endpoints для отчетов ===
router.get('/v1/report/receipts', (req, res) => proxyRequest(req, res));
router.get('/v1/report/shift_report', (req, res) => proxyRequest(req, res)); // GET для сменных отчетов

// === Endpoints для цен ===
router.get('/v1/prices', (req, res) => proxyRequest(req, res));
router.get('/v1/schedule/prices/:station_number', (req, res) => proxyRequest(req, res));
router.get('/v1/pos/prices/:station_number', (req, res) => proxyRequest(req, res));

// === Endpoints для управления ===
router.post('/v1/control/terminal/open', (req, res) => proxyRequest(req, res));
router.post('/v1/control/terminal/close', (req, res) => proxyRequest(req, res));
router.post('/v1/control/shift/open', (req, res) => proxyRequest(req, res));
router.post('/v1/control/shift/close', (req, res) => proxyRequest(req, res));

// === Internal STS API request with caching (for server-side aggregation) ===
async function stsInternalRequest(urlPath, params, userHeaders) {
  const cacheKey = generateCacheKey(urlPath, params);

  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    cacheStats.hits++;
    return cached;
  }
  cacheStats.misses++;

  const fakeReq = { headers: userHeaders || {} };
  const client = await getStsClient(fakeReq);
  const response = await client.request({
    method: 'GET',
    url: urlPath,
    params
  });

  const ttl = getTTL(urlPath);
  cache.set(cacheKey, response.data, ttl);

  return response.data;
}

// === Endpoint для агрегированных остатков топлива (серверная агрегация) ===
// Вместо ~200+ HTTP round-trips с фронтенда — один POST-запрос
router.post('/fuel-inventory', async (req, res) => {
  const startTime = Date.now();

  try {
    const { system, stations, dt_beg, dt_end, allowedStations } = req.body;

    if (!system || !stations || !dt_beg || !dt_end) {
      return res.status(400).json({
        error: 'Missing required parameters: system, stations, dt_beg, dt_end'
      });
    }

    // Проверяем агрегированный кэш
    const stationIds = stations.map(s => s.id).sort().join(',');
    const aggCacheKey = `fuel-inv:${system}:${stationIds}:${dt_beg}:${dt_end}`;
    const cachedResult = cache.get(aggCacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const userHeaders = {
      'x-user-id': req.headers['x-user-id'] || '',
      'x-user-name': req.headers['x-user-name'] || ''
    };

    const periodStart = new Date(dt_beg);
    const periodEnd = new Date(dt_end);

    // Фильтрация по RBAC
    const allowedSet = allowedStations ? new Set(allowedStations.map(String)) : null;
    const filteredStations = stations.filter(s => {
      if (allowedSet && !allowedSet.has(String(s.id))) return false;
      return true;
    });

    // Обрабатываем все станции параллельно
    const results = await Promise.all(filteredStations.map(async (station) => {
      try {
        // 1. Получаем список смен
        const shiftsResponse = await stsInternalRequest(
          '/v1/shifts',
          { system, station: station.id },
          userHeaders
        );

        let allShifts = [];
        if (Array.isArray(shiftsResponse)) {
          if (shiftsResponse.length > 0 && shiftsResponse[0].shift !== undefined) {
            allShifts = shiftsResponse;
          } else {
            allShifts = shiftsResponse[0]?.shifts || [];
          }
        } else if (shiftsResponse?.shifts) {
          allShifts = shiftsResponse.shifts;
        }

        // 2. Фильтруем смены по периоду (по dt_open)
        const validShifts = allShifts.filter(shift => {
          const openDate = shift.dt_open ? new Date(shift.dt_open) : null;
          if (!openDate) return false;
          return openDate >= periodStart && openDate <= periodEnd;
        }).sort((a, b) => new Date(a.dt_open).getTime() - new Date(b.dt_open).getTime());

        if (validShifts.length === 0) return [];

        // 3. Получаем ёмкости резервуаров
        const tankCapacities = new Map();
        try {
          const tankHistory = await stsInternalRequest(
            '/v1/tank_history',
            { system, station: station.id, dt_beg, dt_end },
            userHeaders
          );

          if (Array.isArray(tankHistory)) {
            const latest = new Map();
            tankHistory.forEach(record => {
              if (record.number && record.volume_max) {
                const existing = latest.get(record.number);
                if (!existing || new Date(record.dt) > new Date(existing.dt)) {
                  latest.set(record.number, record);
                }
              }
            });
            latest.forEach((record, num) => tankCapacities.set(num, parseFloat(record.volume_max)));
          }
        } catch (e) { /* ignore tank capacity errors */ }

        // 4. Загружаем сменные отчёты пачками по 20 (серверная агрегация — можно агрессивнее)
        const shiftReports = [];
        const BATCH_SIZE = 20;

        for (let i = 0; i < validShifts.length; i += BATCH_SIZE) {
          const batch = validShifts.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(async (shift) => {
            try {
              const report = await stsInternalRequest(
                '/v1/report/shift_report',
                { system, station: station.id, shift: shift.shift },
                userHeaders
              );

              let data = report;
              if (Array.isArray(report) && report.length > 0) data = report[0];

              if (data?.release?.length > 0) {
                return {
                  shiftNumber: shift.shift,
                  shiftDate: shift.dt_close || shift.dt_open,
                  data
                };
              }
              return null;
            } catch (e) { return null; }
          }));

          shiftReports.push(...batchResults.filter(Boolean));
        }

        if (shiftReports.length === 0) return [];

        // 5. Агрегируем по резервуарам
        const tankDataMap = new Map();

        shiftReports.forEach(report => {
          report.data.release.forEach(tank => {
            const tankNumber = tank.tank;

            if (!tankDataMap.has(tankNumber)) {
              tankDataMap.set(tankNumber, {
                firstShift: report,
                lastShift: report,
                receipts: 0,
                sales: 0,
                receiptCount: 0,
                shiftCount: 0,
                capacity: tankCapacities.get(tankNumber) || 0,
                fuelCode: tank.service?.service_code || tank.fuel || 0,
                fuelName: tank.service?.service_name || 'Неизвестно',
                processedShifts: new Set()
              });
            }

            const data = tankDataMap.get(tankNumber);

            const currentDate = new Date(report.shiftDate);
            if (currentDate > new Date(data.lastShift.shiftDate)) {
              data.lastShift = report;
            }

            const receiptVolume = parseFloat(tank.receipt?.volume || '0');
            data.receipts += receiptVolume;
            data.sales += parseFloat(tank.release?.volume || '0');

            if (receiptVolume > 0) data.receiptCount++;

            if (!data.processedShifts.has(report.shiftNumber)) {
              data.processedShifts.add(report.shiftNumber);
              data.shiftCount++;
            }
          });
        });

        // 6. Формируем TankInventory для каждого резервуара
        const tankInventories = [];

        tankDataMap.forEach((data, tankNumber) => {
          const firstTank = data.firstShift.data.release.find(t => t.tank === tankNumber);
          const lastTank = data.lastShift.data.release.find(t => t.tank === tankNumber);

          const volumeBegin = parseFloat(firstTank?.doc_beg?.volume || '0');
          const volumeEnd = parseFloat(lastTank?.doc_end?.volume || '0');

          tankInventories.push({
            station: station.id,
            stationName: station.name,
            tankNumber,
            fuelCode: data.fuelCode,
            fuelName: data.fuelName,
            volumeBook: volumeEnd,
            volumeBegin,
            volumeReceipts: data.receipts,
            volumeSales: data.sales,
            receiptCount: data.receiptCount,
            shiftCount: data.shiftCount,
            capacity: data.capacity,
            freeVolume: data.capacity - volumeEnd,
            fillPercent: data.capacity > 0 ? (volumeEnd / data.capacity) * 100 : 0,
            lastUpdate: data.lastShift.shiftDate,
            initialShift: {
              number: data.firstShift.shiftNumber,
              date: data.firstShift.shiftDate
            }
          });
        });

        return tankInventories;
      } catch (e) {
        console.error(`[Fuel Inventory] Error for station ${station.id}:`, e.message);
        return [];
      }
    }));

    const inventory = results.flat();

    // Кэшируем агрегированный результат на 5 минут
    cache.set(aggCacheKey, inventory, 300);

    res.json(inventory);
  } catch (error) {
    console.error(`[Fuel Inventory] ❌ Error:`, error.message);
    res.status(500).json({
      error: 'Failed to load fuel inventory',
      message: error.message
    });
  }
});

// === Универсальный fallback для всех остальных endpoints ===
router.all('*', (req, res) => {
  // req.path - это read-only свойство, используем req.originalUrl напрямую
  // proxyRequest использует req.path, который уже правильно установлен роутером
  proxyRequest(req, res);
});

module.exports = router;
