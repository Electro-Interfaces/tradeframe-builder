# 🚀 Быстрый запуск для разработки

## Команды запуска

```bash
# Терминал 1: Backend Proxy Server (порт 3001)
cd server
node index.js

# Терминал 2: Frontend Dev Server (порт 3000)
npm run dev
```

## Проверка работы

```bash
# Backend health check
curl http://localhost:3001/health

# Frontend
http://127.0.0.1:3000/
```

## Что делает каждый сервер?

### Backend Proxy (порт 3001)
- Проксирует запросы к STS API
- Автоматически получает и обновляет JWT токены
- Скрывает учетные данные от frontend

### Frontend (порт 3000)
- React приложение с Vite dev server
- Обращается к backend proxy через `/api/sts/*`
- Hot Module Replacement (HMR) для быстрой разработки

## Архитектура запросов

```
Frontend (3000)
    ↓ fetch('/api/sts/v1/tanks')
Vite Proxy (vite.config.ts)
    ↓ proxy → localhost:3001
Backend Proxy (3001)
    ↓ добавляет JWT token
STS API (https://pos.autooplata.ru/tms)
```

## Troubleshooting

### Backend не запускается
```bash
cd server
npm install  # Установить зависимости
```

### Порт занят
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Нет данных от STS API
1. Проверить `server/.env` файл
2. Проверить логи backend: см. вывод в терминале
3. Проверить health check: `curl http://localhost:3001/health`

## Подробная документация

- **CLAUDE.md** - полная инструкция для Claude Code
- **server/README.md** - документация backend proxy сервера
- **API_INTEGRATION.md** - описание интеграции с внешними API
