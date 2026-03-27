# TradeControl Backend Proxy Server

Backend proxy сервер для безопасной работы с STS API. Учетные данные хранятся на сервере и не попадают в frontend bundle.

## Архитектура

```
Browser (prod.dataworker.ru)
    ↓ HTTPS /api/sts/*
Nginx (порт 443)
    ↓ проксирует на localhost:3001
Backend Proxy (Express, порт 3001)
    ↓ автоматически получает и обновляет JWT токен
    ↓ добавляет Authorization: Bearer {token}
STS API (pos.autooplata.ru/tms)
```

**Особенности JWT авторизации**:
- JWT токен получается автоматически через `/v1/login` с username/password
- Токен действителен 20 минут, обновляется автоматически каждые 18 минут
- Клиентский код не знает учетные данные - они хранятся только в `server/.env`

## Структура файлов

```
server/
├── index.js                 # Основной сервер Express
├── routes/
│   └── sts.js              # Роуты для проксирования STS API
├── .env                    # Секретные переменные (НЕ в git!)
├── .gitignore              # Исключения для git
├── package.json            # Зависимости
├── ecosystem.config.cjs    # PM2 конфигурация
└── logs/                   # PM2 логи (создается автоматически)
```

## Установка на сервере

### 1. Загрузить код на сервер

```bash
cd /var/www/www-root/data/www/prod.dataworker.ru
git pull
```

### 2. Создать файл .env с учетными данными

```bash
cd /var/www/www-root/data/www/prod.dataworker.ru/server
nano .env
```

Содержимое `.env`:
```bash
# STS API Configuration
STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=UserApi
STS_API_PASSWORD=your_sts_api_password

# Backend Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://prod.dataworker.ru,http://localhost:3000
```

### 3. Установить зависимости

```bash
cd /var/www/www-root/data/www/prod.dataworker.ru/server
npm install
```

### 4. Запустить через PM2

```bash
# Запуск
pm2 start ecosystem.config.cjs

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs tradeframe-prod-backend

# Сохранить конфигурацию для автозапуска
pm2 save
pm2 startup
```

### 5. Настроить Nginx

Добавить в конфигурацию nginx для prod.dataworker.ru:

```nginx
# Backend Proxy для STS API
location /api/sts/ {
    proxy_pass http://localhost:3001/api/sts/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

Перезапустить nginx:
```bash
nginx -t
systemctl reload nginx
```

## Проверка работы

### Health Check
```bash
curl http://localhost:3001/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T19:51:32.012Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### Тест STS API через proxy
```bash
curl http://localhost:3001/api/sts/v1/info
```

### Тест через nginx (с production домена)
```bash
curl https://prod.dataworker.ru/api/healthz
```

## Управление PM2

```bash
# Перезапуск после изменений кода
pm2 restart tradeframe-prod-backend

# Остановка
pm2 stop tradeframe-prod-backend

# Удаление из PM2
pm2 delete tradeframe-prod-backend

# Просмотр логов в реальном времени
pm2 logs tradeframe-prod-backend --lines 100

# Только ошибки
pm2 logs tradeframe-prod-backend --err

# Очистка логов
pm2 flush tradeframe-prod-backend
```

## Доступные STS API endpoints

Все endpoints проксируются автоматически:

- `GET /api/sts/v1/transactions` - Транзакции v1
- `GET /api/sts/v2/transactions` - Транзакции v2
- `GET /api/sts/v1/info` - Статусы ТО
- `GET /api/sts/v1/tanks` - Резервуары
- `GET /api/sts/v1/shifts` - Список смен
- `GET /api/sts/v1/report/receipts` - Поступления
- `GET /api/sts/v1/report/shift_report` - Сменный отчет
- `GET /api/sts/v1/prices` - Цены
- `GET /api/sts/v1/schedule/prices/:station_number` - Расписание цен
- `POST /api/sts/v1/control/terminal/open` - Открыть терминал
- `POST /api/sts/v1/control/terminal/close` - Закрыть терминал
- `POST /api/sts/v1/control/shift/open` - Открыть смену
- `POST /api/sts/v1/control/shift/close` - Закрыть смену

## Безопасность

- ✅ Учетные данные STS API хранятся только в `server/.env`
- ✅ `.env` файл в `.gitignore` и не попадает в git
- ✅ CORS настроен только для разрешенных доменов (prod.dataworker.ru, localhost)
- ✅ JWT токен получается и обновляется автоматически на сервере
- ✅ Authorization заголовок добавляется на backend, не виден в браузере
- ✅ Frontend НЕ знает логин и пароль STS API

## Локальная разработка

```bash
# Запуск в dev режиме
cd server
npm run dev

# Тестирование
curl http://localhost:3001/health
curl http://localhost:3001/api/healthz
curl http://localhost:3001/api/sts/v1/info
```

## Troubleshooting

### Порт 3001 занят

```bash
# Проверить что использует порт
netstat -tulnp | grep 3001

# Или с lsof
lsof -i :3001

# Убить процесс
npx kill-port 3001
```

### PM2 не запускается

```bash
# Проверить наличие .env файла
ls -la /var/www/www-root/data/www/prod.dataworker.ru/server/.env

# Проверить node_modules
ls -la /var/www/www-root/data/www/prod.dataworker.ru/server/node_modules

# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### STS API возвращает 403

- Проверить учетные данные в `.env`
- Проверить что IP сервера в whitelist STS API
- Проверить логи: `pm2 logs tradeframe-prod-backend`

## Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|--------------|
| `STS_API_URL` | URL STS API | Да |
| `STS_API_USERNAME` | Логин для STS API | Да |
| `STS_API_PASSWORD` | Пароль для STS API | Да |
| `PORT` | Порт backend сервера | Нет (по умолчанию 3001) |
| `NODE_ENV` | Окружение | Нет (по умолчанию development) |
| `ALLOWED_ORIGINS` | Разрешенные CORS домены | Нет (по умолчанию localhost:3000) |

## Мониторинг

```bash
# Статус всех PM2 процессов
pm2 status

# Детальная информация
pm2 show tradeframe-prod-backend

# Мониторинг в реальном времени
pm2 monit

# Использование памяти и CPU
pm2 list
```
