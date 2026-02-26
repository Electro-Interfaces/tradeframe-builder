// ВАЖНО: dotenv.config() должен быть ДО всех импортов, которые используют process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const notificationScheduler = require('./services/notificationScheduler');
const stsRoutes = require('./routes/sts');
const tradecorpRoutes = require('./routes/tradecorp');
const telegramRoutes = require('./routes/telegram');
const messagesRoutes = require('./routes/messages');
const supabaseRoutes = require('./routes/supabase');
const tankCalibrationRoutes = require('./routes/tankCalibration');
const mstoRoutes = require('./routes/msto');
const supportRoutes = require('./routes/support');
const { initTelegramBot } = require('./telegram-bot');

const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
  max: 120, // 120 запросов в минуту на IP
  message: { error: 'Превышен лимит запросов. Подождите.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// Логирование запросов в режиме разработки
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Общий rate limit на все API
app.use('/api', apiLimiter);

// Подключаем роуты для STS API
app.use('/api/sts', stsRoutes);

// Подключаем роуты для TradeCorp API (корпоративный процессинг)
app.use('/api/tradecorp', tradecorpRoutes);

// Подключаем роуты для Telegram
app.use('/api/telegram', telegramRoutes);

// Подключаем роуты для системы сообщений
app.use('/api/messages', messagesRoutes);

// Подключаем роуты для Supabase (прокси для обхода CORS и блокировок)
// Rate limit на auth-запросы (login, getUserByEmail)
app.use('/api/supabase', authLimiter, supabaseRoutes);

// Подключаем роуты для настроек калибровки резервуаров
app.use('/api/tank-calibration', tankCalibrationRoutes);

// Подключаем роуты для MSTO IntegratorService API
app.use('/api/msto', mstoRoutes);

// Подключаем роуты для TSupport SDK (заявки + чат)
app.use('/api/support', supportRoutes);

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
app.listen(PORT, () => {
  console.log(`Backend Proxy Server started`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Запуск планировщика уведомлений (можно отключить через DISABLE_NOTIFICATION_SCHEDULER=true)
  if (process.env.DISABLE_NOTIFICATION_SCHEDULER === 'true') {
    console.log('⚠️ Notification Scheduler DISABLED (DISABLE_NOTIFICATION_SCHEDULER=true)');
  } else {
    notificationScheduler.start();
    console.log('✅ Notification Scheduler started');
  }

  // Инициализация Telegram бота
  const bot = initTelegramBot();
  if (bot) {
    console.log('✅ Telegram Bot initialized and polling');
  } else {
    console.warn('⚠️ Telegram Bot not initialized (check configuration)');
  }

  // Прогрев кэша MSTO (асинхронно, не блокирует запуск)
  if (mstoRoutes.warmupCache) {
    mstoRoutes.warmupCache().catch(err => {
      console.error('[Server] MSTO cache warmup failed:', err.message);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  notificationScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  notificationScheduler.stop();
  process.exit(0);
});
