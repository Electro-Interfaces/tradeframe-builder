// ВАЖНО: dotenv.config() должен быть ДО всех импортов, которые используют process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const notificationScheduler = require('./services/notificationScheduler');
const stsRoutes = require('./routes/sts');
const authRoutes = require('./routes/auth');
const networksRoutes = require('./routes/networks');
const tradingPointsRoutes = require('./routes/tradingPoints');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const legalRoutes = require('./routes/legal');
const nomenclatureRoutes = require('./routes/nomenclature');
const auditRoutes = require('./routes/audit');
const telegramRoutes = require('./routes/telegramRuntime');
const messagesRoutes = require('./routes/messagesRuntime');
const tankCalibrationRoutes = require('./routes/tankCalibration');
const mstoRoutes = require('./routes/msto');
const tradelinkRoutes = require('./routes/tradelink');
const supportRoutes = require('./routes/support');
const chatMatrixRoutes = require('./routes/chat-matrix');
const kbRoutes = require('./routes/kb');
const receiptCostsRoutes = require('./routes/receiptCosts');
const receiptConfirmationsRoutes = require('./routes/receiptConfirmations');
const equipmentTemplatesRoutes = require('./routes/equipmentTemplates');
const inventoryAdjustmentsRoutes = require('./routes/inventoryAdjustments');
const { initTelegramBot } = require('./telegram-bot-runtime');
const postgres = require('./db/pool');

const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (nginx) — необходимо для корректной работы express-rate-limit за reverse proxy
app.set('trust proxy', 1);

// Rate limiting — защита от brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 30, // макс 30 запросов на окно (логин + getUserByEmail)
  message: { error: 'Слишком много попыток. Повторите через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 5000, // 5000 запросов в минуту на IP (SPA + React Query retries)
  message: { error: 'Превышен лимит запросов. Подождите.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Auth-роуты не считаем в общем лимите — у login свой authLimiter
    return req.path.startsWith('/api/auth/');
  },
});

// Парсинг разрешенных доменов из переменной окружения
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];
// Автоматически добавляем 127.0.0.1 варианты для localhost (CORS различает их)
for (const o of [...allowedOrigins]) {
  if (o.includes('localhost')) allowedOrigins.push(o.replace('localhost', '127.0.0.1'));
  else if (o.includes('127.0.0.1')) allowedOrigins.push(o.replace('127.0.0.1', 'localhost'));
}
const uniqueOrigins = [...new Set(allowedOrigins)];

// Настройка CORS
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, curl, Postman)
    if (!origin) return callback(null, true);

    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-TF-User-Id', 'X-TF-User-Email', 'X-TF-User-Name', 'X-TF-User-Role', 'X-TF-Company-Id']
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP управляется фронтендом
  crossOriginEmbedderPolicy: false, // Для совместимости с внешними ресурсами
}));

// Парсинг JSON тела запросов
app.use(express.json({ limit: '1mb' }));

// Логирование запросов в режиме разработки (disabled — use morgan/pino if needed)

// Health check — публичный, минимальная информация наружу
async function sendHealth(_req, res) {
  const postgresConfigured = Boolean(process.env.DATABASE_URL);
  let postgresConnected = false;

  if (postgresConfigured) {
    try {
      await postgres.queryOne('SELECT 1 AS ok');
      postgresConnected = true;
    } catch {
      postgresConnected = false;
    }
  }

  const status = postgresConnected ? 'healthy' : 'degraded';
  const httpCode = postgresConnected ? 200 : 503;

  res.status(httpCode).json({
    status,
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    dataSource: 'pg',
    postgres: { configured: postgresConfigured, connected: postgresConnected },
  });
}

app.get('/health', sendHealth);
app.get('/api/healthz', sendHealth);

// Общий rate limit на все API
app.use('/api', apiLimiter);

// Подключаем роуты для STS API
app.use('/api/sts', stsRoutes);

// Подключаем совместимый auth-слой (Supabase/PG переключается через env)
// authLimiter только на login (brute-force защита), остальные auth-роуты — через общий apiLimiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);

// Подключаем backend-first API орг-структуры
app.use('/api/networks', networksRoutes);
app.use('/api/trading-points', tradingPointsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/nomenclature', nomenclatureRoutes);
app.use('/api/audit', auditRoutes);

// Подключаем роуты для Telegram
app.use('/api/telegram', telegramRoutes);

// Подключаем роуты для системы сообщений
app.use('/api/messages', messagesRoutes);


// Подключаем роуты для настроек калибровки резервуаров
app.use('/api/tank-calibration', tankCalibrationRoutes);

// Подключаем роуты для MSTO IntegratorService API
app.use('/api/msto', mstoRoutes);
app.use('/api/tradelink', tradelinkRoutes);

// Подключаем роуты для TSupport SDK (заявки + чат)
app.use('/api/support', supportRoutes);
app.use('/api/chat/matrix', chatMatrixRoutes);
app.use('/api/kb', kbRoutes);

// Себестоимость поступлений
app.use('/api/receipt-costs', receiptCostsRoutes);
app.use('/api/receipt-confirmations', receiptConfirmationsRoutes);
app.use('/api/equipment-templates', equipmentTemplatesRoutes);

// Корректировки остатков по результатам инвентаризации (АКАЗС)
app.use('/api/inventory-adjustments', inventoryAdjustmentsRoutes);

// Smoke-test — полная проверка модулей (только для авторизованных)
const { requireAuth: smokeAuth } = require('./middleware/auth');
app.get('/api/smoke', smokeAuth, async (req, res) => {
  const checks = {};

  // Хелпер: проверка таблицы
  async function checkTable(name, table, countQuery) {
    try {
      const row = await postgres.queryOne(countQuery || `SELECT COUNT(*)::int AS cnt FROM ${table}`);
      checks[name] = { ok: true, count: row.cnt };
    } catch (err) {
      if (err.code === '42P01') {
        checks[name] = { ok: false, status: 'missing', error: `table ${table} does not exist` };
      } else {
        checks[name] = { ok: false, status: 'error', error: err.message };
      }
    }
  }

  // 1. PostgreSQL connection
  try {
    const row = await postgres.queryOne('SELECT current_database() AS db');
    checks.postgres = { ok: true, database: row.db };
  } catch (err) {
    checks.postgres = { ok: false, status: 'error', error: err.message };
  }

  // 2–13. Проверка таблиц (имена из миграций)
  await Promise.all([
    checkTable('users', 'users', "SELECT COUNT(*)::int AS cnt FROM users WHERE deleted_at IS NULL"),
    checkTable('roles', 'roles'),
    checkTable('networks', 'networks'),
    checkTable('tradingPoints', 'trading_points'),
    checkTable('notificationRules', 'notification_rules'),
    checkTable('telegramLinkCodes', 'telegram_link_codes'),
    checkTable('userNotificationSettings', 'user_notification_settings'),
    checkTable('broadcastMessages', 'broadcast_messages'),
    checkTable('auditLog', 'audit_log'),
    checkTable('tankCalibration', 'tank_calibration_settings'),
    checkTable('tankCalibrationTables', 'tank_calibration_tables'),
    checkTable('documentVersions', 'document_versions'),
    checkTable('nomenclature', 'nomenclature'),
  ]);

  const total = Object.keys(checks).length;
  const passed = Object.values(checks).filter(c => c.ok).length;
  const failed = total - passed;
  const overall = failed === 0 ? 'pass' : 'fail';
  const httpCode = failed === 0 ? 200 : 503;

  res.status(httpCode).json({
    status: overall,
    dataSource: 'pg',
    summary: { total, passed, failed },
    checks,
  });
});

// Обработка несуществующих роутов
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Запуск сервера
const server = app.listen(PORT, () => {
  // Запуск планировщика уведомлений (можно отключить через DISABLE_NOTIFICATION_SCHEDULER=true)
  if (process.env.DISABLE_NOTIFICATION_SCHEDULER !== 'true') {
    notificationScheduler.start();
  }

  // Инициализация Telegram бота
  const bot = initTelegramBot();

  // Прогрев кэша MSTO (асинхронно, не блокирует запуск)
  if (mstoRoutes.warmupCache) {
    mstoRoutes.warmupCache().catch(err => {
      console.error('[Server] MSTO cache warmup failed:', err.message);
    });
  }

  // Прогрев кэша TradeLink Hub (асинхронно, не блокирует запуск)
  if (tradelinkRoutes.warmupCache) {
    tradelinkRoutes.warmupCache().catch(err => {
      console.error('[Server] TradeLink cache warmup failed:', err.message);
    });
  }

  // Прогрев кэша «Остатки» (fuel-inventory) — отчёты закрытых смен, асинхронно
  if (stsRoutes.warmupCache) {
    stsRoutes.warmupCache().catch(err => {
      console.error('[Server] STS fuel-inventory warmup failed:', err.message);
    });
  }
});

let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  notificationScheduler.stop();

  const forceCloseTimer = setTimeout(() => {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
  }, 10000);

  if (typeof forceCloseTimer.unref === 'function') {
    forceCloseTimer.unref();
  }

  await new Promise((resolve) => {
    server.close(() => resolve());
  }).catch(() => {});

  clearTimeout(forceCloseTimer);
  await postgres.closePool().catch(() => {});
  process.exit(0);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});
