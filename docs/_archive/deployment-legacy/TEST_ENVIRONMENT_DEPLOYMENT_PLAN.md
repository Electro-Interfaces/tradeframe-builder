# 🧪 План развертывания ТЕСТОВОЙ среды TradeControl Builder

**Дата:** 2025-10-17
**Версия:** 1.0
**Домен тестовой среды:** `testTF.dataworker.ru`
**Статус:** Требует утверждения

---

## 🎯 Цель

Развернуть полностью изолированную ТЕСТОВУЮ среду на сервере `194.135.36.195`, которая работает независимо от продуктовой среды.

---

## 📊 Текущая ситуация

### Production (уже работает)
- **Домен:** `prod.dataworker.ru`
- **Репозиторий:** `TradeControl` (https://github.com/Electro-Interfaces/TradeControl.git)
- **Порты:** 3006 (frontend), 3001 (backend)
- **PM2 процессы:** `tradeframe-backend-proxy` (работает)
- **Папка:** `/var/www/www-root/data/www/prod.dataworker.ru`

### Testing (нужно создать)
- **Домен:** `testTF.dataworker.ru` ⚠️ НОВЫЙ
- **Репозиторий:** `tradeframe-builder` (https://github.com/Electro-Interfaces/tradeframe-builder.git)
- **Порты:** 3007 (frontend), 3002 (backend) ⚠️ НОВЫЕ
- **PM2 процессы:** нужно создать
- **Папка:** `/var/www/www-root/data/www/testTF.dataworker.ru` ⚠️ НОВАЯ

---

## 🏗️ Архитектура изоляции

```
Сервер: 194.135.36.195
│
├── PRODUCTION (не трогаем!)
│   ├── Домен: prod.dataworker.ru
│   ├── Порты: 3006, 3001
│   ├── База: Supabase Production
│   └── Репо: TradeControl
│
└── TESTING (создаем новое)
    ├── Домен: testTF.dataworker.ru  ← НОВЫЙ
    ├── Порты: 3007, 3002             ← НОВЫЕ
    ├── База: Supabase Testing        ← НОВАЯ
    └── Репо: tradeframe-builder
```

### Принципы изоляции:
✅ **Разные домены** - testTF.dataworker.ru vs prod.dataworker.ru
✅ **Разные порты** - 3007/3002 vs 3006/3001
✅ **Разные папки** - testTF.dataworker.ru/ vs prod.dataworker.ru/
✅ **Разные базы данных** - отдельный Supabase проект
✅ **Разные репозитории** - tradeframe-builder vs TradeControl
✅ **Разные PM2 процессы** - полная изоляция процессов

---

## 📋 План развертывания (5 фаз, ~90 минут)

### ⏱️ Фаза 1: DNS и SSL (15 минут)

**Цель:** Настроить домен `testTF.dataworker.ru`

**Шаги:**

1. **DNS настройка** (делает администратор домена)
   ```
   Создать A-запись:
   testTF.dataworker.ru → 194.135.36.195
   ```

2. **Проверка DNS** (после настройки через 5-10 минут)
   ```bash
   nslookup testTF.dataworker.ru
   # Должен вернуть: 194.135.36.195
   ```

3. **SSL сертификат** (на сервере)
   ```bash
   ssh root@194.135.36.195
   certbot certonly --nginx -d testTF.dataworker.ru
   ```

**Результат фазы 1:**
- ✅ DNS запись создана
- ✅ SSL сертификат получен
- ✅ Готово к настройке Nginx

---

### ⏱️ Фаза 2: Supabase тестовая база (20 минут)

**Цель:** Создать отдельную тестовую базу данных

**Шаги:**

1. **Создать новый проект в Supabase**
   - Открыть: https://supabase.com/dashboard
   - New Project → "TradeControl Testing"
   - Region: тот же что у production
   - Password: сохранить в безопасном месте
   - Дождаться создания (3-5 минут)

2. **Получить учетные данные**
   ```
   Settings → API

   Сохранить:
   - Project URL: https://xxxxx.supabase.co
   - anon/public key: eyJhbGc...
   - service_role key: eyJhbGc... (секретный!)
   ```

3. **Скопировать структуру БД из production**

   **В Production Supabase:**
   - SQL Editor → New Query
   - Выполнить:
     ```sql
     -- Экспорт структуры всех таблиц
     SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public';
     ```
   - Для каждой таблицы получить CREATE TABLE statement

   **В Testing Supabase:**
   - SQL Editor → New Query
   - Вставить и выполнить все CREATE TABLE statements

4. **Создать тестовые данные**
   ```sql
   -- Создать тестового пользователя
   INSERT INTO users (email, password_hash, role, full_name)
   VALUES (
     'test@mail.com',
     '$2a$10$...',  -- хеш пароля "test123"
     'Администратор',
     'Test User'
   );

   -- Создать тестовую сеть
   INSERT INTO networks (name, code)
   VALUES ('Test Network', 'TEST001');

   -- Создать тестовую торговую точку
   INSERT INTO trading_points (name, network_id, address)
   VALUES ('Test Station', 'uuid-network', 'Test Address 1');
   ```

**Результат фазы 2:**
- ✅ Тестовый Supabase проект создан
- ✅ Структура таблиц скопирована
- ✅ Тестовые данные добавлены
- ✅ Учетные данные сохранены

---

### ⏱️ Фаза 3: Структура на сервере (15 минут)

**Цель:** Создать папки и клонировать репозиторий

**Шаги:**

1. **Создать директорию для тестовой среды**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   mkdir -p /var/www/www-root/data/www/testTF.dataworker.ru
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   EOF
   ```

2. **Клонировать test репозиторий**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   git clone https://github.com/Electro-Interfaces/tradeframe-builder.git .
   git checkout main
   EOF
   ```

3. **Установить зависимости**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   npm install --production
   EOF
   ```

4. **Создать .env файл для test**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   cat > .env << 'ENVFILE'
   NODE_ENV=development
   VITE_APP_ENV=testing

   # Supabase Testing Project
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=test_anon_key_здесь
   VITE_SUPABASE_SERVICE_ROLE_KEY=test_service_key_здесь

   # STS API (можно использовать те же данные или тестовые)
   VITE_STS_API_URL=https://pos.autooplata.ru/tms
   VITE_STS_API_USERNAME=test_username
   VITE_STS_API_PASSWORD=test_password

   # Ports
   PORT=3007
   BACKEND_PORT=3002
   ENVFILE
   EOF
   ```

**Результат фазы 3:**
- ✅ Директория создана
- ✅ Репозиторий склонирован
- ✅ Зависимости установлены
- ✅ .env файл создан

---

### ⏱️ Фаза 4: Nginx конфигурация (15 минут)

**Цель:** Настроить reverse proxy для testTF.dataworker.ru

**Шаги:**

1. **Создать конфигурацию Nginx**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cat > /etc/nginx/sites-available/testTF.dataworker.ru << 'NGINX'
   # HTTP → HTTPS redirect
   server {
       listen 80;
       server_name testTF.dataworker.ru;
       return 301 https://$server_name$request_uri;
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name testTF.dataworker.ru;

       # SSL Configuration
       ssl_certificate /etc/letsencrypt/live/testTF.dataworker.ru/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/testTF.dataworker.ru/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       # Logging
       access_log /var/log/nginx/testTF.dataworker.ru-access.log;
       error_log /var/log/nginx/testTF.dataworker.ru-error.log;

       # Frontend (React SPA)
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

       # Backend API Proxy
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
   NGINX
   EOF
   ```

2. **Активировать конфигурацию**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   # Создать симлинк
   ln -s /etc/nginx/sites-available/testTF.dataworker.ru /etc/nginx/sites-enabled/

   # Проверить конфигурацию
   nginx -t

   # Перезагрузить Nginx
   systemctl reload nginx
   EOF
   ```

3. **Проверить доступность**
   ```bash
   curl -I https://testTF.dataworker.ru
   # Должен вернуть 502 (это нормально, PM2 еще не запущен)
   ```

**Результат фазы 4:**
- ✅ Nginx конфигурация создана
- ✅ SSL настроен
- ✅ Reverse proxy работает
- ✅ Домен доступен (502 пока нормально)

---

### ⏱️ Фаза 5: PM2 процессы (25 минут)

**Цель:** Запустить frontend и backend для тестовой среды

**Шаги:**

1. **Создать PM2 конфигурацию**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   cat > ecosystem.test.config.cjs << 'PM2CONFIG'
   module.exports = {
     apps: [
       {
         name: 'tradeframe-test-frontend',
         script: 'npm',
         args: 'run start',
         cwd: '/var/www/www-root/data/www/testTF.dataworker.ru',
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
         log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
         merge_logs: true,
         time: true
       },
       {
         name: 'tradeframe-test-backend',
         script: 'server/index.js',
         cwd: '/var/www/www-root/data/www/testTF.dataworker.ru',
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
         log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
         merge_logs: true,
         time: true
       }
     ]
   };
   PM2CONFIG
   EOF
   ```

2. **Запустить PM2 процессы**
   ```bash
   ssh root@194.135.36.195 << 'EOF'
   cd /var/www/www-root/data/www/testTF.dataworker.ru
   pm2 start ecosystem.test.config.cjs
   pm2 save
   EOF
   ```

3. **Проверить статус**
   ```bash
   ssh root@194.135.36.195 "pm2 list"

   # Должно быть:
   # ✅ tradeframe-test-frontend (online)
   # ✅ tradeframe-test-backend (online)
   # ✅ tradeframe-backend-proxy (online) - production, не трогаем
   ```

4. **Проверить логи**
   ```bash
   ssh root@194.135.36.195 "pm2 logs tradeframe-test-frontend --lines 20"
   ssh root@194.135.36.195 "pm2 logs tradeframe-test-backend --lines 20"
   ```

5. **Финальная проверка**
   ```bash
   # Проверить порты
   ssh root@194.135.36.195 "netstat -tlnp | grep -E '3007|3002'"

   # Проверить домен
   curl -I https://testTF.dataworker.ru
   # Должен вернуть 200 OK
   ```

**Результат фазы 5:**
- ✅ PM2 процессы запущены
- ✅ Frontend работает на порту 3007
- ✅ Backend работает на порту 3002
- ✅ Домен testTF.dataworker.ru отвечает

---

## ✅ Чеклист после развертывания

### Инфраструктура
- [ ] DNS запись `testTF.dataworker.ru` создана
- [ ] SSL сертификат получен и работает
- [ ] Nginx конфигурация активна
- [ ] PM2 процессы запущены и в статусе "online"
- [ ] Порты 3007 и 3002 слушают

### База данных
- [ ] Supabase Testing проект создан
- [ ] Таблицы созданы
- [ ] Тестовые данные добавлены
- [ ] Подключение из приложения работает

### Приложение
- [ ] Открывается https://testTF.dataworker.ru
- [ ] Можно залогиниться тестовым пользователем
- [ ] Dashboard загружается
- [ ] API запросы работают
- [ ] Нет ошибок в логах PM2

### Изоляция
- [ ] Production не затронут (prod.dataworker.ru работает)
- [ ] Тестовая среда использует свою базу данных
- [ ] Разные порты (test: 3007/3002, prod: 3006/3001)
- [ ] Разные папки на сервере
- [ ] PM2 процессы изолированы

---

## 🔧 Команды для управления

### PM2
```bash
# Статус всех процессов
ssh root@194.135.36.195 "pm2 list"

# Логи test frontend
ssh root@194.135.36.195 "pm2 logs tradeframe-test-frontend --lines 50"

# Логи test backend
ssh root@194.135.36.195 "pm2 logs tradeframe-test-backend --lines 50"

# Рестарт test процессов
ssh root@194.135.36.195 "pm2 restart tradeframe-test-frontend tradeframe-test-backend"

# Остановить test процессы
ssh root@194.135.36.195 "pm2 stop tradeframe-test-frontend tradeframe-test-backend"
```

### Nginx
```bash
# Проверить конфигурацию
ssh root@194.135.36.195 "nginx -t"

# Перезагрузить Nginx
ssh root@194.135.36.195 "systemctl reload nginx"

# Логи testTF
ssh root@194.135.36.195 "tail -f /var/log/nginx/testTF.dataworker.ru-access.log"
```

### Git на сервере
```bash
# Обновить код test среды
ssh root@194.135.36.195 << 'EOF'
cd /var/www/www-root/data/www/testTF.dataworker.ru
git pull origin main
npm install --production
pm2 restart tradeframe-test-frontend tradeframe-test-backend
EOF
```

---

## 📊 Итоговая архитектура

```
Сервер: 194.135.36.195
│
├── PRODUCTION (работает, не трогаем)
│   ├── prod.dataworker.ru (Nginx → 3006, 3001)
│   ├── /var/www/.../prod.dataworker.ru/
│   ├── PM2: tradeframe-backend-proxy
│   └── Supabase Production DB
│
└── TESTING (новое, изолированное)
    ├── testTF.dataworker.ru (Nginx → 3007, 3002)
    ├── /var/www/.../testTF.dataworker.ru/
    ├── PM2: tradeframe-test-frontend, tradeframe-test-backend
    └── Supabase Testing DB
```

---

## ❓ Вопросы для утверждения

1. **Домен `testTF.dataworker.ru` - подходит?** Или нужен другой?
2. **Порты 3007 и 3002 - свободны на сервере?**
3. **У вас есть доступ к DNS панели** для создания A-записи?
4. **У вас есть доступ к Supabase Dashboard** для создания test проекта?
5. **Учетные данные STS API** - будут те же что у prod или нужны отдельные тестовые?

---

## 🚀 Следующие шаги после утверждения

1. Вы утверждаете план
2. Я создаю автоматические скрипты для развертывания
3. Запускаем развертывание пошагово
4. Проверяем работоспособность
5. Документируем результат

---

**⏰ Общее время:** ~90 минут
**🔒 Риски для production:** Отсутствуют (полная изоляция)
**📝 Статус:** Ожидает утверждения

