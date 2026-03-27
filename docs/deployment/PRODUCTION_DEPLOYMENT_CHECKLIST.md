# Production Deployment Checklist

## Проблема CORS в production

**Симптомы:**
```
Access to fetch at 'http://localhost:3001/api/telegram/...' from origin 'https://testtf.dataworker.ru' has been blocked by CORS policy
```

**Причина:** Frontend пытается обратиться к hardcoded `localhost:3001` URL, который недоступен в production.

**Решение:** ✅ Исправлено в commit `53cad1e` - все hardcoded URLs заменены на относительные пути

---

## 🔧 Требования для каждой среды

### 1. **Development (localhost:3000)**
- ✅ Frontend: `npm run dev` (порт 3000)
- ✅ Backend: `cd server && node index.js` (порт 3001)
- ✅ Vite proxy: настроен в `vite.config.ts` (строки 25-43)
- ✅ CORS: `ALLOWED_ORIGINS=http://localhost:3000`

### 2. **Testing (testtf.dataworker.ru)**
- 🔶 Frontend: Nginx → `/var/www/testtf/dist/`
- 🔶 Backend: PM2 → `tradeframe-test-backend` (порт 3002)
- ⚠️ Nginx proxy: должен проксировать `/api/*` на backend (см. ниже)
- ⚠️ CORS: `ALLOWED_ORIGINS=https://testtf.dataworker.ru`

### 3. **Production (prod.dataworker.ru)**
- 🔶 Frontend: Nginx → `/var/www/prod/dist/`
- 🔶 Backend: PM2 → `tradeframe-prod-backend` (порт 3001)
- ⚠️ Nginx proxy: должен проксировать `/api/*` на backend (см. ниже)
- ⚠️ CORS: `ALLOWED_ORIGINS=https://prod.dataworker.ru`

---

## 📋 Шаги настройки Production/Testing

### Шаг 1: Настройка Nginx

**Файл:** `/etc/nginx/sites-available/testtf.dataworker.ru.conf` (или `prod.dataworker.ru.conf`)

Добавить в `server` блок:

```nginx
# Backend Proxy для всех API endpoints
location /api/ {
    proxy_pass http://localhost:3001/api/;  # Или 3002/3007 для testing
    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_cache_bypass $http_upgrade;

    proxy_connect_timeout 30s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;  # STS API может отвечать до 95 сек
}
```

**Применить конфигурацию:**
```bash
sudo nginx -t                    # Проверка синтаксиса
sudo systemctl reload nginx      # Применить без перезапуска
```

---

### Шаг 2: Настройка ALLOWED_ORIGINS в .env

**Для Testing** (`.env.test` или `.env` на сервере):
```bash
ALLOWED_ORIGINS=https://testtf.dataworker.ru,http://localhost:3000
PORT=3002
```

**Для Production** (`.env.production` или `.env` на сервере):
```bash
ALLOWED_ORIGINS=https://prod.dataworker.ru,http://localhost:3000
PORT=3001
```

**ВАЖНО:** После изменения `.env` необходимо перезапустить backend:
```bash
pm2 restart tradeframe-test-backend  # Для testing
pm2 restart tradeframe-prod-backend  # Для production
```

---

### Шаг 3: Проверка работы Backend

**1. Проверить, что backend запущен:**
```bash
pm2 list
# Должен показать `tradeframe-test-backend` или `tradeframe-prod-backend`
```

**2. Проверить health check:**
```bash
curl http://localhost:3001/health  # Для production
curl http://localhost:3002/health  # Для testing
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-28T...",
  "environment": "development",
  "version": "2.1.0",
  "dataSource": "pg",
  "postgres": {
    "configured": true,
    "connected": true
  }
}
```

**3. Проверить Nginx proxy:**
```bash
curl https://testtf.dataworker.ru/api/healthz  # Для testing
curl https://prod.dataworker.ru/api/healthz    # Для production
```

---

### Шаг 4: Проверка CORS

**Открыть браузер → DevTools → Console**

При загрузке приложения НЕ ДОЛЖНО быть ошибок:
- ❌ `Access to fetch at 'http://localhost:3001/...'` - **НЕПРАВИЛЬНО**
- ✅ `GET https://testtf.dataworker.ru/api/telegram/...` - **ПРАВИЛЬНО**

---

### Шаг 5: Проверка post-deploy smoke

После деплоя GitHub Actions должен пройти:

- `Verify deployment`
- `Authenticated smoke test`

Smoke-проверка бьёт по:

- `GET /api/auth/me`
- `GET /api/support/unread`
- `GET /api/legal/document-types`
- `GET /api/messages?limit=1`
- `GET /api/sts/v2/info`

---

## 🐛 Troubleshooting

### Проблема: "502 Bad Gateway" при обращении к /api/

**Причина:** Backend не запущен или Nginx proxy настроен неправильно

**Решение:**
```bash
# 1. Проверить backend
pm2 list
pm2 logs tradeframe-test-backend  # или tradeframe-prod-backend

# 2. Проверить порт
netstat -tlnp | grep 3001  # Или 3002/3007

# 3. Если не запущен - запустить
cd /var/www/testtf/server  # Или /var/www/prod/server
pm2 start index.js --name tradeframe-test-backend
```

---

### Проблема: CORS ошибки в production

**Причина:** ALLOWED_ORIGINS не содержит домен production

**Решение:**
```bash
# 1. Проверить текущие настройки
pm2 env 0  # Показать переменные окружения процесса

# 2. Обновить .env на сервере
nano /var/www/testtf/.env  # Или /var/www/prod/.env

# Добавить:
ALLOWED_ORIGINS=https://testtf.dataworker.ru

# 3. Перезапустить backend
pm2 restart tradeframe-test-backend  # или tradeframe-prod-backend
```

---

### Проблема: "Cannot GET /api/telegram/..."

**Причина:** Nginx конфигурация не содержит `location /api/`

**Решение:**
1. Скопировать конфигурацию из `server/nginx-config-example.conf`
2. Добавить в `/etc/nginx/sites-available/[domain].conf`
3. Применить: `sudo nginx -t && sudo systemctl reload nginx`

---

## ✅ Итоговый чеклист

Перед деплоем на production/testing:

- [ ] Backend запущен через PM2
- [ ] Nginx конфигурация содержит `location /api/` блок
- [ ] `.env` содержит правильный `ALLOWED_ORIGINS`
- [ ] Health check доступен: `curl https://[domain]/api/healthz`
- [ ] GitHub Actions шаги `Verify deployment` и `Authenticated smoke test` завершились зелёным
- [ ] В браузере нет CORS ошибок
- [ ] API запросы идут на `https://[domain]/api/...`, а не `localhost:3001`

---

## 📁 Связанные файлы

- `server/index.js` - Backend server (строки 17-36 - CORS конфигурация)
- `server/nginx-config-example.conf` - Пример Nginx конфигурации
- `vite.config.ts` - Dev proxy конфигурация (строки 25-43)
- `src/services/notificationService.ts` - ✅ Исправлено (все URL относительные)
- `.env.test` - Конфигурация для testing среды
- `.env.production` - Конфигурация для production среды
