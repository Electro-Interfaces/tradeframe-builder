import express from 'express';
import axios from 'axios';

const router = express.Router();

// Lazy initialization для STS client - переменные окружения загружаются при первом использовании
let stsClient = null;

function getStsClient() {
  if (!stsClient) {
    // Получаем конфигурацию STS API из переменных окружения
    const STS_API_URL = process.env.STS_API_URL;
    const STS_API_USERNAME = process.env.STS_API_USERNAME;
    const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

    // Проверяем наличие обязательных переменных
    if (!STS_API_URL || !STS_API_USERNAME || !STS_API_PASSWORD) {
      throw new Error('Missing required STS API environment variables: STS_API_URL, STS_API_USERNAME, STS_API_PASSWORD');
    }

    // Создаем Basic Auth заголовок
    const authHeader = 'Basic ' + Buffer.from(`${STS_API_USERNAME}:${STS_API_PASSWORD}`).toString('base64');

    // Создаем axios клиент для STS API
    stsClient = axios.create({
      baseURL: STS_API_URL,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 секунд таймаут
    });

    console.log('[STS Proxy] Client initialized with URL:', STS_API_URL);
  }

  return stsClient;
}

// Middleware для логирования запросов к STS API
router.use((req, res, next) => {
  console.log(`[STS Proxy] ${req.method} ${req.path}`);
  next();
});

// Универсальный обработчик для проксирования запросов
async function proxyRequest(req, res) {
  try {
    const { method, query, body } = req;
    // Используем req.path (без query string) вместо req.originalUrl
    const urlPath = req.path;

    // Формируем параметры запроса к STS API
    const requestConfig = {
      method: method,
      url: urlPath,
      params: query,
      ...(method !== 'GET' && method !== 'HEAD' && { data: body })
    };

    // Выполняем запрос к STS API
    const client = getStsClient();
    const response = await client.request(requestConfig);

    // Возвращаем ответ клиенту
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[STS Proxy Error] ${error.message}`);

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

// === Endpoints для транзакций ===
router.get('/v1/transactions', (req, res) => proxyRequest(req, res));
router.get('/v2/transactions', (req, res) => proxyRequest(req, res));

// === Endpoints для информации о ТО ===
router.get('/v1/info', (req, res) => proxyRequest(req, res));

// === Endpoints для резервуаров ===
router.get('/v1/tanks', (req, res) => proxyRequest(req, res));

// === Endpoints для смен ===
router.get('/v1/shifts', (req, res) => proxyRequest(req, res));

// === Endpoints для купонов ===
router.get('/v1/coupons', (req, res) => proxyRequest(req, res));

// === Endpoints для отчетов ===
router.get('/v1/report/receipts', (req, res) => proxyRequest(req, res));
router.get('/v1/report/shift_report', (req, res) => proxyRequest(req, res));

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
  req.path = req.originalUrl.replace('/api/sts', '');
  proxyRequest(req, res);
});

export default router;
