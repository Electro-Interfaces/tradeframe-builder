# 🔧 Исправление ошибки аутентификации STS API на production

## Проблема
Backend прокси на https://prod.dataworker.ru возвращает:
```
HTTP 500: Failed to authenticate with STS API
```

## Причина
Файл `.env` с учетными данными STS API не установлен на production сервере.

## Решение

### 1. SSH подключение к серверу
```bash
ssh user@prod.dataworker.ru
```

### 2. Перейти в директорию с backend сервером
```bash
cd /path/to/backend  # Уточните путь у администратора
```

### 3. Создать файл .env с правильными учетными данными
```bash
cat > .env << 'ENVFILE'
# Backend Proxy Configuration
# Эти переменные НИКОГДА не попадут в frontend bundle

# STS API Configuration (External Trading System)
STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=UserApi
STS_API_PASSWORD=lHQfLZHzB3tn

# Backend Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (разрешенные домены для frontend)
ALLOWED_ORIGINS=https://prod.dataworker.ru,http://localhost:3000,http://localhost:3002
ENVFILE
```

### 4. Перезапустить backend сервер
```bash
# Если используется PM2
pm2 restart ecosystem.config.cjs

# Или если используется systemd
sudo systemctl restart tradeframe-backend
```

### 5. Проверить логи
```bash
# PM2
pm2 logs

# Systemd
sudo journalctl -u tradeframe-backend -f
```

### 6. Проверить работоспособность
Откройте в браузере:
```
https://prod.dataworker.ru/health
```

Должен вернуть:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production",
  "version": "1.0.0"
}
```

## Альтернативное решение

Если у вас нет прямого доступа к серверу, можно установить переменные окружения через панель управления хостингом или через PM2:

```bash
pm2 start ecosystem.config.cjs --update-env
```

Убедитесь, что в `ecosystem.config.cjs` прописаны переменные окружения:
```javascript
env: {
  STS_API_URL: 'https://pos.autooplata.ru/tms',
  STS_API_USERNAME: 'UserApi',
  STS_API_PASSWORD: 'lHQfLZHzB3tn',
  PORT: 3001,
  NODE_ENV: 'production',
  ALLOWED_ORIGINS: 'https://prod.dataworker.ru,http://localhost:3000'
}
```

## Проверка после исправления

1. Откройте https://prod.dataworker.ru в браузере
2. Перейдите на страницу "Оборудование"
3. Данные резервуаров и терминалов должны загрузиться успешно
4. Проверьте консоль браузера - ошибок не должно быть
