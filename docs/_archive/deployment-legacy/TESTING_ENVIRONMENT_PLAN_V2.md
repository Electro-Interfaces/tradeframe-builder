# 🧪 План тестовой и продуктовой среды TradeControl Builder v2.0

**Дата создания:** 2025-10-17
**Версия:** 2.0 (два репозитория)
**Статус:** Готов к реализации

---

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Структура репозиториев](#структура-репозиториев)
3. [Архитектура на сервере](#архитектура-на-сервере)
4. [Workflow разработки](#workflow-разработки)
5. [План развертывания](#план-развертывания)
6. [Скрипты деплоя](#скрипты-деплоя)
7. [Синхронизация test → prod](#синхронизация-test--prod)

---

## 🎯 Обзор архитектуры

### Ключевое отличие от v1.0
**У вас УЖЕ есть два отдельных репозитория:**
- **Test окружение** работает из репозитория `tradeframe-builder` (GitHub Pages demo)
- **Prod окружение** работает из репозитория `TradeControl` (production)

### Текущая конфигурация Git

```bash
# Удаленные репозитории
prod → https://github.com/Electro-Interfaces/TradeControl.git
test → https://github.com/Electro-Interfaces/tradeframe-builder.git

# Текущая ветка: main
# Вы работаете в одной локальной директории, но деплоите в разные репозитории
```

---

## 📦 Структура репозиториев

### Репозиторий: `tradeframe-builder` (TEST)
- **Remote:** `test`
- **URL:** https://github.com/Electro-Interfaces/tradeframe-builder
- **Назначение:** Тестирование, демо, GitHub Pages
- **Деплой на:** `test.dataworker.ru`
- **Ветки:**
  - `main` - основная тестовая ветка
  - `feature/*` - новые фичи
  - `fix/*` - исправления

### Репозиторий: `TradeControl` (PRODUCTION)
- **Remote:** `prod`
- **URL:** https://github.com/Electro-Interfaces/TradeControl
- **Назначение:** Production окружение
- **Деплой на:** `prod.dataworker.ru`
- **Ветки:**
  - `main` - production ветка
  - `prod-deploy-*` - деплой теги

---

## 🏗️ Архитектура на сервере

```
┌─────────────────────────────────────────────────────────────────┐
│                    Сервер: 194.135.36.195                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐     │
│  │   PRODUCTION            │   │   TESTING               │     │
│  │   (TradeControl repo)   │   │   (tradeframe-builder)  │     │
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
│  │ /var/www/.../           │   │ /var/www/.../           │     │
│  │   prod.dataworker.ru/   │   │   test.dataworker.ru/   │     │
│  │                         │   │                         │     │
│  │ Git Remote: prod        │   │ Git Remote: test        │     │
│  └─────────────────────────┘   └─────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow разработки

### Вариант 1: Разработка новой фичи

```bash
# 1. Создаете ветку feature в test репозитории
git checkout -b feature/new-feature
git push test feature/new-feature

# 2. Разрабатываете и тестируете локально
npm run dev

# 3. Деплоите в TEST окружение
./deploy-to-test.sh

# 4. Тестируете на https://test.dataworker.ru

# 5. Если OK → Мерджите в main test репозитория
git checkout main
git merge feature/new-feature
git push test main

# 6. Синхронизируете test → prod
./sync-test-to-prod.sh
# Это создаст коммит в prod репозитории

# 7. Деплоите в PROD
./deploy-to-prod.sh

# 8. Проверяете на https://prod.dataworker.ru
```

### Вариант 2: Hotfix в production

```bash
# 1. Работаете с prod репозиторием
git fetch prod
git checkout -b hotfix/critical-bug

# 2. Исправляете и тестируете локально
npm run dev

# 3. Коммитите и пушите в prod
git add .
git commit -m "fix: critical bug"
git push prod hotfix/critical-bug

# 4. Мерджите в prod/main
git checkout main
git merge hotfix/critical-bug
git push prod main

# 5. Деплоите в PROD
./deploy-to-prod.sh

# 6. Синхронизируете prod → test (обратная синхронизация)
./sync-prod-to-test.sh
```

---

## 🚀 План развертывания

### Фаза 1: Настройка инфраструктуры (30 мин)

#### Шаг 1.1: DNS для test.dataworker.ru
```bash
# Добавить A-запись
test.dataworker.ru → 194.135.36.195
```

#### Шаг 1.2: SSL сертификат
```bash
ssh root@194.135.36.195
certbot certonly --nginx -d test.dataworker.ru
```

#### Шаг 1.3: Создать директории на сервере
```bash
ssh root@194.135.36.195 << 'EOF'
mkdir -p /var/www/www-root/data/www/test.dataworker.ru
mkdir -p /var/www/www-root/data/www/prod.dataworker.ru
EOF
```

#### Шаг 1.4: Nginx конфигурация

**Файл: `/etc/nginx/sites-available/test.dataworker.ru`**
```nginx
server {
    listen 80;
    server_name test.dataworker.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name test.dataworker.ru;

    ssl_certificate /etc/letsencrypt/live/test.dataworker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/test.dataworker.ru/privkey.pem;

    access_log /var/log/nginx/test.dataworker.ru-access.log;
    error_log /var/log/nginx/test.dataworker.ru-error.log;

    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
}
```

**Активировать:**
```bash
ssh root@194.135.36.195 << 'EOF'
ln -s /etc/nginx/sites-available/test.dataworker.ru /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
EOF
```

### Фаза 2: Клонирование репозиториев на сервер (20 мин)

#### Шаг 2.1: Production репозиторий
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/prod.dataworker.ru
git init
git remote add origin https://github.com/Electro-Interfaces/TradeControl.git
git fetch origin
git checkout main
npm install --production
EOF
```

#### Шаг 2.2: Test репозиторий
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/test.dataworker.ru
git init
git remote add origin https://github.com/Electro-Interfaces/tradeframe-builder.git
git fetch origin
git checkout main
npm install --production
EOF
```

### Фаза 3: База данных (20 мин)

#### Шаг 3.1: Создать тестовый проект Supabase
1. Dashboard → New Project
2. Name: `TradeControl Testing`
3. Password: сохранить
4. Region: тот же что и prod

#### Шаг 3.2: Экспортировать схему из production
```sql
-- В Supabase Dashboard Production
-- SQL Editor → Export all tables schema
```

#### Шаг 3.3: Импортировать в testing
```sql
-- В Supabase Dashboard Testing
-- SQL Editor → Execute exported SQL
```

#### Шаг 3.4: Тестовые данные
```sql
-- Создать тестового пользователя
INSERT INTO users (email, password_hash, role, network_id)
VALUES ('admin_test@mail.com', 'hash', 'Администратор', 'uuid');

-- Создать тестовую сеть
INSERT INTO networks (name, code)
VALUES ('Test Network', 'TEST');
```

### Фаза 4: Переменные окружения (10 мин)

#### На сервере PROD
```bash
ssh root@194.135.36.195
cd /var/www/www-root/data/www/prod.dataworker.ru
cat > .env << 'EOF'
NODE_ENV=production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_key
VITE_SUPABASE_SERVICE_ROLE_KEY=prod_service_key
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=prod_user
VITE_STS_API_PASSWORD=prod_pass
PORT=3006
BACKEND_PORT=3001
EOF
```

#### На сервере TEST
```bash
ssh root@194.135.36.195
cd /var/www/www-root/data/www/test.dataworker.ru
cat > .env << 'EOF'
NODE_ENV=development
VITE_SUPABASE_URL=https://test-project.supabase.co
VITE_SUPABASE_ANON_KEY=test_key
VITE_SUPABASE_SERVICE_ROLE_KEY=test_service_key
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=test_user
VITE_STS_API_PASSWORD=test_pass
PORT=3007
BACKEND_PORT=3002
EOF
```

### Фаза 5: Первый запуск (15 мин)

#### Шаг 5.1: Запустить PM2 для PROD
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/prod.dataworker.ru
pm2 start ecosystem.prod.config.cjs
pm2 save
EOF
```

#### Шаг 5.2: Запустить PM2 для TEST
```bash
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/test.dataworker.ru
pm2 start ecosystem.test.config.cjs
pm2 save
EOF
```

#### Шаг 5.3: Проверка
```bash
ssh root@194.135.36.195 "pm2 list"

# Ожидается:
# - tradeframe-prod-frontend (online)
# - tradeframe-prod-backend (online)
# - tradeframe-test-frontend (online)
# - tradeframe-test-backend (online)

curl -I https://prod.dataworker.ru
curl -I https://test.dataworker.ru
```

---

## 🤖 Скрипты деплоя

### Скрипт 1: `deploy-to-test.sh`

```bash
#!/bin/bash
# Deploy current code to TEST environment
# Pushes to test remote and deploys on test.dataworker.ru

set -e

echo "🧪 Deploying to TEST environment..."

SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/test.dataworker.ru"

# Build for test
echo "[1/5] Building test bundle..."
npm run build -- --mode development

# Push to test remote
echo "[2/5] Pushing to test repository..."
git push test main

# SSH and pull on server
echo "[3/5] Pulling latest code on server..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru
git pull origin main
npm install --production
ENDSSH

# Restart PM2
echo "[4/5] Restarting PM2..."
ssh ${SERVER} "pm2 restart tradeframe-test-frontend tradeframe-test-backend"

# Verify
echo "[5/5] Verifying..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-test"

echo "✅ Deployed to TEST: https://test.dataworker.ru"
```

### Скрипт 2: `deploy-to-prod.sh`

```bash
#!/bin/bash
# Deploy current code to PRODUCTION environment
# Pushes to prod remote and deploys on prod.dataworker.ru

set -e

echo "🚀 Deploying to PRODUCTION..."
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    exit 0
fi

SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/prod.dataworker.ru"

# Build for production
echo "[1/6] Building production bundle..."
npm run build:prod

# Push to prod remote
echo "[2/6] Pushing to prod repository..."
git push prod main

# Backup on server
echo "[3/6] Creating backup..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
timestamp=$(date +%Y%m%d_%H%M%S)
tar -czf /tmp/prod-backup-${timestamp}.tar.gz dist server
ENDSSH

# SSH and pull on server
echo "[4/6] Pulling latest code on server..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
git pull origin main
npm install --production
ENDSSH

# Restart PM2
echo "[5/6] Restarting PM2..."
ssh ${SERVER} "pm2 restart tradeframe-prod-frontend tradeframe-prod-backend"

# Verify
echo "[6/6] Verifying..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-prod"

echo "✅ Deployed to PRODUCTION: https://prod.dataworker.ru"
```

### Скрипт 3: `sync-test-to-prod.sh`

```bash
#!/bin/bash
# Sync tested code from TEST repository to PROD repository

set -e

echo "🔄 Syncing TEST → PROD repositories..."
read -p "Type 'SYNC' to continue: " confirm

if [ "$confirm" != "SYNC" ]; then
    exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Fetch from test
echo "[1/4] Fetching from test repository..."
git fetch test

# Create sync branch
echo "[2/4] Creating sync branch..."
git checkout -b sync-test-to-prod
git merge test/main --no-ff -m "sync: merge tested code from test/main"

# Push to prod
echo "[3/4] Pushing to prod repository..."
git push prod sync-test-to-prod

# Merge to prod/main
ssh root@194.135.36.195 << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
git fetch origin
git checkout main
git merge sync-test-to-prod --no-ff
ENDSSH

# Cleanup
echo "[4/4] Cleanup..."
git checkout ${CURRENT_BRANCH}
git branch -D sync-test-to-prod

echo "✅ Sync complete! Now deploy to prod:"
echo "   ./deploy-to-prod.sh"
```

---

## 📊 Мониторинг

### PM2 команды

```bash
# Статус всех процессов
ssh root@194.135.36.195 "pm2 list"

# Логи test
ssh root@194.135.36.195 "pm2 logs tradeframe-test-frontend --lines 50"

# Логи prod
ssh root@194.135.36.195 "pm2 logs tradeframe-prod-frontend --lines 50"

# Рестарт при необходимости
ssh root@194.135.36.195 "pm2 restart tradeframe-test-frontend"
ssh root@194.135.36.195 "pm2 restart tradeframe-prod-frontend"
```

### Проверка репозиториев

```bash
# На сервере TEST
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/test.dataworker.ru
git remote -v
git status
git log -1
EOF

# На сервере PROD
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/prod.dataworker.ru
git remote -v
git status
git log -1
EOF
```

---

## ✅ Преимущества этой архитектуры

1. ✅ **Два независимых репозитория** - чистая история, без конфликтов
2. ✅ **Безопасность** - test не влияет на prod напрямую
3. ✅ **Гибкость** - можно тестировать разные версии
4. ✅ **GitHub Pages** - test репозиторий можно использовать для демо
5. ✅ **Контроль** - явная синхронизация test → prod
6. ✅ **Откат** - легко откатиться в любом окружении
7. ✅ **Изоляция** - разные базы, домены, порты

---

## 📝 Следующие шаги

1. **Настроить DNS** для `test.dataworker.ru`
2. **Создать SSL** сертификаты
3. **Создать тестовый Supabase** проект
4. **Клонировать репозитории** на сервер
5. **Настроить .env** файлы
6. **Запустить PM2** процессы
7. **Протестировать** оба окружения

---

*Документ создан: 2025-10-17*
*Версия: 2.0 (два репозитория)*
*Статус: Готов к реализации*
