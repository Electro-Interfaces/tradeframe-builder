# 🧪 План создания тестовой среды TradeControl Builder

**Дата создания:** 2025-10-17
**Версия:** 1.0
**Статус:** Проектирование

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Требования](#требования)
3. [Архитектура тестовой среды](#архитектура-тестовой-среды)
4. [План изоляции окружений](#план-изоляции-окружений)
5. [Структура файлов](#структура-файлов)
6. [Конфигурация PM2](#конфигурация-pm2)
7. [Конфигурация Nginx](#конфигурация-nginx)
8. [База данных](#база-данных)
9. [План развертывания](#план-развертывания)
10. [Скрипты автоматизации](#скрипты-автоматизации)
11. [Тестирование](#тестирование)
12. [Мониторинг](#мониторинг)

---

## 🎯 Обзор

### Цель
Создание полностью изолированной тестовой среды, **идентичной production**, на том же сервере `194.135.36.195`.

### Принципы
- ✅ **100% идентичность** с production (код, конфигурация, структура)
- ✅ **Полная изоляция** (порты, домены, база данных, переменные окружения)
- ✅ **Независимость** (изменения в test не влияют на prod)
- ✅ **Простота переноса** (test → prod одной командой)

---

## 📊 Требования

### Функциональные требования
- Идентичная кодовая база с production
- Отдельная база данных Supabase (test project)
- Отдельный домен/поддомен
- Независимые порты для frontend и backend
- Возможность тестирования перед деплоем в prod

### Нефункциональные требования
- Минимальные изменения в коде
- Простое переключение между окружениями
- Автоматизация деплоя
- Логирование и мониторинг

---

## 🏗️ Архитектура тестовой среды

```
┌─────────────────────────────────────────────────────────────────┐
│                    Сервер: 194.135.36.195                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐     │
│  │   PRODUCTION СРЕДА      │   │   TESTING СРЕДА         │     │
│  ├─────────────────────────┤   ├─────────────────────────┤     │
│  │ Домен:                  │   │ Домен:                  │     │
│  │ prod.dataworker.ru      │   │ test.dataworker.ru      │     │
│  │                         │   │                         │     │
│  │ Frontend (PM2):         │   │ Frontend (PM2):         │     │
│  │ - Name: tradeframe-prod │   │ - Name: tradeframe-test │     │
│  │ - Port: 3006            │   │ - Port: 3007            │     │
│  │                         │   │                         │     │
│  │ Backend (PM2):          │   │ Backend (PM2):          │     │
│  │ - Name: tf-backend-prod │   │ - Name: tf-backend-test │     │
│  │ - Port: 3001            │   │ - Port: 3002            │     │
│  │                         │   │                         │     │
│  │ Папка:                  │   │ Папка:                  │     │
│  │ /var/www/.../prod.*     │   │ /var/www/.../test.*     │     │
│  │                         │   │                         │     │
│  │ Env файл:               │   │ Env файл:               │     │
│  │ .env.production         │   │ .env.test               │     │
│  └─────────────────────────┘   └─────────────────────────┘     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Nginx Reverse Proxy                      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  prod.dataworker.ru  →  127.0.0.1:3006                   │   │
│  │  test.dataworker.ru  →  127.0.0.1:3007                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────┐               ┌──────────────────┐
│  Supabase PROD   │               │  Supabase TEST   │
│  (отдельный      │               │  (отдельный      │
│   проект)        │               │   проект)        │
└──────────────────┘               └──────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│              STS API (External)                       │
│           pos.autooplata.ru                          │
│  (может использовать те же или разные учетные        │
│   данные для test/prod)                              │
└──────────────────────────────────────────────────────┘
```

---

## 🔒 План изоляции окружений

### 1. Разделение по директориям

```bash
/var/www/www-root/data/www/
├── prod.dataworker.ru/          # Production окружение
│   ├── dist/                    # Production build
│   ├── server/                  # Backend proxy
│   ├── node_modules/            # Dependencies
│   ├── .env.production          # Production переменные
│   └── ecosystem.prod.config.cjs # PM2 конфиг для prod
│
└── test.dataworker.ru/          # Testing окружение
    ├── dist/                    # Test build (идентичный prod)
    ├── server/                  # Backend proxy (копия)
    ├── node_modules/            # Dependencies
    ├── .env.test                # Test переменные
    └── ecosystem.test.config.cjs # PM2 конфиг для test
```

### 2. Разделение по портам

| Окружение | Frontend | Backend | Назначение |
|-----------|----------|---------|------------|
| Production | 3006 | 3001 | Рабочая среда |
| Testing | 3007 | 3002 | Тестовая среда |

### 3. Разделение по доменам

| Окружение | Домен | SSL | Nginx Config |
|-----------|-------|-----|--------------|
| Production | prod.dataworker.ru | ✅ | /etc/nginx/sites-available/prod.dataworker.ru |
| Testing | test.dataworker.ru | ✅ | /etc/nginx/sites-available/test.dataworker.ru |

### 4. Разделение по базам данных

**Production:**
- Supabase Project: `production-tradeframe`
- URL: `https://xxxxx.supabase.co`
- Anon Key: `prod_anon_key`
- Service Role: `prod_service_key`

**Testing:**
- Supabase Project: `testing-tradeframe`
- URL: `https://yyyyy.supabase.co`
- Anon Key: `test_anon_key`
- Service Role: `test_service_key`

### 5. Разделение переменных окружения

**`.env.production`:**
```bash
# Production Environment
NODE_ENV=production
VITE_APP_ENV=production

# Supabase Production
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=prod_service_key

# STS API Production (может быть отдельный аккаунт)
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=prod_user
VITE_STS_API_PASSWORD=prod_pass

# Ports
PORT=3006
BACKEND_PORT=3001
```

**`.env.test`:**
```bash
# Testing Environment
NODE_ENV=development
VITE_APP_ENV=testing

# Supabase Testing
VITE_SUPABASE_URL=https://yyyyy.supabase.co
VITE_SUPABASE_ANON_KEY=test_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=test_service_key

# STS API Testing (может использовать те же данные или sandbox)
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=test_user
VITE_STS_API_PASSWORD=test_pass

# Ports
PORT=3007
BACKEND_PORT=3002
```

---

## 📁 Структура файлов

### Структура на локальной машине

```
D:\Users\magsp\ELSYPLUS\TradeControl/
├── src/                         # Исходный код (общий)
├── server/                      # Backend proxy (общий)
├── public/                      # Статические файлы (общие)
├── .env.production              # Production переменные
├── .env.test                    # Test переменные
├── ecosystem.prod.config.cjs    # PM2 конфиг prod
├── ecosystem.test.config.cjs    # PM2 конфиг test
├── deploy-prod.sh               # Скрипт деплоя в prod
├── deploy-test.sh               # Скрипт деплоя в test
├── vite.config.ts               # Vite конфиг (общий)
└── package.json                 # Dependencies (общие)
```

### Структура на сервере

```
/var/www/www-root/data/www/
├── prod.dataworker.ru/
│   ├── dist/                    # Frontend build
│   ├── server/                  # Backend
│   │   ├── index.js
│   │   └── routes/
│   │       └── sts.js
│   ├── node_modules/
│   ├── .env.production
│   ├── ecosystem.prod.config.cjs
│   └── package.json
│
└── test.dataworker.ru/
    ├── dist/                    # Frontend build (идентичный)
    ├── server/                  # Backend (идентичный)
    │   ├── index.js
    │   └── routes/
    │       └── sts.js
    ├── node_modules/
    ├── .env.test
    ├── ecosystem.test.config.cjs
    └── package.json
```

---

## ⚙️ Конфигурация PM2

### Production: `ecosystem.prod.config.cjs`

```javascript
module.exports = {
  apps: [
    {
      name: 'tradeframe-prod-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/www-root/data/www/prod.dataworker.ru',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/tradeframe-prod-frontend-error.log',
      out_file: '/var/log/pm2/tradeframe-prod-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'tradeframe-prod-backend',
      script: 'server/index.js',
      cwd: '/var/www/www-root/data/www/prod.dataworker.ru',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/var/log/pm2/tradeframe-prod-backend-error.log',
      out_file: '/var/log/pm2/tradeframe-prod-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### Testing: `ecosystem.test.config.cjs`

```javascript
module.exports = {
  apps: [
    {
      name: 'tradeframe-test-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/www-root/data/www/test.dataworker.ru',
      env: {
        NODE_ENV: 'development',
        PORT: 3007
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/tradeframe-test-frontend-error.log',
      out_file: '/var/log/pm2/tradeframe-test-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'tradeframe-test-backend',
      script: 'server/index.js',
      cwd: '/var/www/www-root/data/www/test.dataworker.ru',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/var/log/pm2/tradeframe-test-backend-error.log',
      out_file: '/var/log/pm2/tradeframe-test-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

---

## 🌐 Конфигурация Nginx

### Production: `/etc/nginx/sites-available/prod.dataworker.ru`

```nginx
server {
    listen 80;
    server_name prod.dataworker.ru;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prod.dataworker.ru;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/prod.dataworker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prod.dataworker.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/prod.dataworker.ru-access.log;
    error_log /var/log/nginx/prod.dataworker.ru-error.log;

    # Frontend (SPA)
    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Testing: `/etc/nginx/sites-available/test.dataworker.ru`

```nginx
server {
    listen 80;
    server_name test.dataworker.ru;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name test.dataworker.ru;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/test.dataworker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/test.dataworker.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/test.dataworker.ru-access.log;
    error_log /var/log/nginx/test.dataworker.ru-error.log;

    # Frontend (SPA)
    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

---

## 🗄️ База данных

### Создание тестовой базы Supabase

1. **Создать новый проект в Supabase:**
   - Название: `TradeControl Testing`
   - Region: Тот же, что и production
   - Database Password: Сохранить в безопасном месте

2. **Скопировать структуру из production:**
   ```sql
   -- Экспортировать схему из production
   -- Импортировать в testing project
   ```

3. **Заполнить тестовыми данными:**
   - Скопировать структуру таблиц
   - Создать тестовых пользователей
   - Добавить тестовые торговые точки/сети

4. **Настроить RLS (Row Level Security):**
   - Скопировать политики из production
   - Убедиться, что все работает идентично

### Стратегия данных

**Production:**
- Реальные данные клиентов
- Реальные транзакции
- Критичные данные

**Testing:**
- Синтетические данные
- Тестовые пользователи (admin_test@mail.com)
- Безопасно для экспериментов

---

## 🚀 План развертывания

### Фаза 1: Подготовка инфраструктуры (30 мин)

**Шаг 1.1: DNS настройка**
```bash
# Добавить A-запись для test.dataworker.ru
# Указать на 194.135.36.195
```

**Шаг 1.2: SSL сертификат**
```bash
ssh root@194.135.36.195
certbot certonly --nginx -d test.dataworker.ru
```

**Шаг 1.3: Создать директорию**
```bash
ssh root@194.135.36.195 "mkdir -p /var/www/www-root/data/www/test.dataworker.ru"
```

**Шаг 1.4: Nginx конфигурация**
```bash
# Создать конфиг /etc/nginx/sites-available/test.dataworker.ru
# Создать симлинк в sites-enabled
sudo ln -s /etc/nginx/sites-available/test.dataworker.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Фаза 2: База данных (20 мин)

**Шаг 2.1: Создать Supabase проект**
- Dashboard → New Project → TradeControl Testing

**Шаг 2.2: Экспорт схемы из production**
```bash
# Через Supabase Dashboard или SQL Editor
# Экспортировать DDL всех таблиц
```

**Шаг 2.3: Импорт в testing**
```bash
# Применить DDL в testing project
# Проверить структуру таблиц
```

**Шаг 2.4: Тестовые данные**
```sql
-- Создать тестовых пользователей
-- Создать тестовые сети/точки
```

### Фаза 3: Конфигурация (15 мин)

**Шаг 3.1: Создать .env.test локально**
```bash
# В D:\Users\magsp\ELSYPLUS\TradeControl\
# Скопировать .env.production → .env.test
# Изменить все переменные на test значения
```

**Шаг 3.2: Создать PM2 конфиг**
```bash
# Создать ecosystem.test.config.cjs
# Настроить порты 3007/3002
```

**Шаг 3.3: Обновить package.json**
```json
{
  "scripts": {
    "build:test": "npm run sync-version && vite build --mode testing"
  }
}
```

### Фаза 4: Первый деплой (20 мин)

**Шаг 4.1: Сборка локально**
```bash
cd D:\Users\magsp\ELSYPLUS\TradeControl
npm run build:test
```

**Шаг 4.2: Создать архив**
```bash
cd dist
tar -czf ../dist-test.tar.gz .
cd ..
tar -czf server-test.tar.gz server/
```

**Шаг 4.3: Загрузить на сервер**
```bash
scp dist-test.tar.gz root@194.135.36.195:/tmp/
scp server-test.tar.gz root@194.135.36.195:/tmp/
scp .env.test root@194.135.36.195:/tmp/
scp ecosystem.test.config.cjs root@194.135.36.195:/tmp/
scp package.json root@194.135.36.195:/tmp/
```

**Шаг 4.4: Развернуть на сервере**
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/test.dataworker.ru

# Распаковать dist
mkdir -p dist
cd dist
tar -xzf /tmp/dist-test.tar.gz
cd ..

# Распаковать server
tar -xzf /tmp/server-test.tar.gz

# Скопировать конфиги
cp /tmp/.env.test .env
cp /tmp/ecosystem.test.config.cjs .
cp /tmp/package.json .

# Установить зависимости
npm install --production

# Очистить tmp
rm /tmp/dist-test.tar.gz /tmp/server-test.tar.gz /tmp/.env.test /tmp/ecosystem.test.config.cjs

EOF
```

**Шаг 4.5: Запустить PM2**
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/test.dataworker.ru
pm2 start ecosystem.test.config.cjs
pm2 save
EOF
```

### Фаза 5: Проверка (10 мин)

**Шаг 5.1: Проверить PM2**
```bash
ssh root@194.135.36.195 "pm2 list"
# Должны быть:
# - tradeframe-test-frontend (online)
# - tradeframe-test-backend (online)
```

**Шаг 5.2: Проверить логи**
```bash
ssh root@194.135.36.195 "pm2 logs tradeframe-test-frontend --lines 20"
ssh root@194.135.36.195 "pm2 logs tradeframe-test-backend --lines 20"
```

**Шаг 5.3: Проверить доступность**
```bash
curl -I https://test.dataworker.ru
# Должен вернуть 200 OK
```

**Шаг 5.4: Функциональное тестирование**
- Открыть https://test.dataworker.ru
- Войти с тестовым пользователем
- Проверить основные функции
- Проверить API запросы

---

## 🤖 Скрипты автоматизации

### Скрипт деплоя в test: `deploy-test.sh`

```bash
#!/bin/bash
# Deploy to Testing Environment
# Usage: ./deploy-test.sh

set -e

echo "🧪 Starting deployment to TESTING environment..."

# Configuration
SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/test.dataworker.ru"
LOCAL_DIR="D:/Users/magsp/ELSYPLUS/TradeControl"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Build
echo -e "${BLUE}[1/6]${NC} Building test bundle..."
npm run build:test

# Step 2: Create archives
echo -e "${BLUE}[2/6]${NC} Creating archives..."
cd dist && tar -czf ../dist-test.tar.gz . && cd ..
tar -czf server-test.tar.gz server/

# Step 3: Upload to server
echo -e "${BLUE}[3/6]${NC} Uploading to server..."
scp dist-test.tar.gz ${SERVER}:/tmp/
scp server-test.tar.gz ${SERVER}:/tmp/
scp .env.test ${SERVER}:/tmp/
scp ecosystem.test.config.cjs ${SERVER}:/tmp/
scp package.json ${SERVER}:/tmp/

# Step 4: Stop PM2
echo -e "${BLUE}[4/6]${NC} Stopping PM2 processes..."
ssh ${SERVER} "pm2 stop tradeframe-test-frontend tradeframe-test-backend || true"

# Step 5: Deploy files
echo -e "${BLUE}[5/6]${NC} Deploying files..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru

# Clean old dist
rm -rf dist
mkdir -p dist
cd dist
tar -xzf /tmp/dist-test.tar.gz
cd ..

# Deploy server
rm -rf server
tar -xzf /tmp/server-test.tar.gz

# Update configs
cp /tmp/.env.test .env
cp /tmp/ecosystem.test.config.cjs .
cp /tmp/package.json .

# Install dependencies
npm install --production

# Cleanup
rm /tmp/dist-test.tar.gz /tmp/server-test.tar.gz /tmp/.env.test /tmp/ecosystem.test.config.cjs

ENDSSH

# Step 6: Start PM2
echo -e "${BLUE}[6/6]${NC} Starting PM2 processes..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru
pm2 start ecosystem.test.config.cjs
pm2 save
ENDSSH

# Cleanup local
rm -f dist-test.tar.gz server-test.tar.gz

echo -e "${GREEN}✅ Deployment to TESTING completed!${NC}"
echo -e "${BLUE}URL:${NC} https://test.dataworker.ru"
echo ""
echo -e "${BLUE}Check status:${NC} ssh ${SERVER} 'pm2 list'"
echo -e "${BLUE}View logs:${NC} ssh ${SERVER} 'pm2 logs tradeframe-test-frontend'"
```

### Скрипт синхронизации test → prod: `sync-test-to-prod.sh`

```bash
#!/bin/bash
# Sync tested code from TEST to PRODUCTION
# Usage: ./sync-test-to-prod.sh

set -e

echo "⚠️  This will deploy TESTED code from TEST to PRODUCTION"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 1
fi

SERVER="root@194.135.36.195"

echo "🚀 Copying test environment to production..."

ssh ${SERVER} << 'ENDSSH'
# Stop production
pm2 stop tradeframe-prod-frontend tradeframe-prod-backend

# Backup production
cd /var/www/www-root/data/www/prod.dataworker.ru
tar -czf /tmp/prod-backup-$(date +%Y%m%d_%H%M%S).tar.gz dist server

# Copy from test
cp -r /var/www/www-root/data/www/test.dataworker.ru/dist .
cp -r /var/www/www-root/data/www/test.dataworker.ru/server .

# Update env to production
cp .env.production .env

# Restart production
pm2 start ecosystem.prod.config.cjs
pm2 save

ENDSSH

echo "✅ Production updated from tested code!"
```

---

## 🧪 Тестирование

### Чек-лист после деплоя

**Инфраструктура:**
- [ ] PM2 процессы запущены
- [ ] Nginx проксирует корректно
- [ ] SSL сертификат валиден
- [ ] Логи пишутся корректно

**Функциональность:**
- [ ] Приложение загружается
- [ ] Логин работает
- [ ] Dashboard отображается
- [ ] API запросы проходят
- [ ] База данных отвечает
- [ ] STS API подключается

**Изоляция:**
- [ ] Test не влияет на prod
- [ ] Разные порты работают
- [ ] Разные базы данных
- [ ] Разные домены

---

## 📊 Мониторинг

### PM2 Monitoring

```bash
# Статус всех процессов
pm2 list

# Логи test environment
pm2 logs tradeframe-test-frontend --lines 50
pm2 logs tradeframe-test-backend --lines 50

# Метрики
pm2 monit

# Рестарт при необходимости
pm2 restart tradeframe-test-frontend
pm2 restart tradeframe-test-backend
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/test.dataworker.ru-access.log

# Error logs
tail -f /var/log/nginx/test.dataworker.ru-error.log
```

---

## 📝 Преимущества такой архитектуры

1. ✅ **Идентичность:** Test = Prod (один код, разные конфиги)
2. ✅ **Безопасность:** Тестирование без риска для prod
3. ✅ **Изоляция:** Полное разделение окружений
4. ✅ **Простота:** Переключение одной командой
5. ✅ **Экономия:** Один сервер, два окружения
6. ✅ **Гибкость:** Легко добавить staging, dev и др.

---

## 🔄 Workflow разработки

```
1. Разработка локально (dev)
   ↓
2. Коммит в git
   ↓
3. Деплой в TEST (./deploy-test.sh)
   ↓
4. Тестирование на https://test.dataworker.ru
   ↓
5. Если OK → Деплой в PROD (./deploy-prod.sh или sync)
   ↓
6. Production на https://prod.dataworker.ru
```

---

## 📞 Контакты и поддержка

При возникновении проблем:

1. Проверить PM2: `pm2 list`
2. Проверить логи: `pm2 logs`
3. Проверить Nginx: `nginx -t`
4. Проверить SSL: `certbot certificates`

---

*Документ создан: 2025-10-17*
*Версия: 1.0*
*Статус: Готов к реализации*
