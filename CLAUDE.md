# TradeFrame (TF)

## Назначение

Проект TradeFrame — Vue + Supabase + Node.js.

## Стек

- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui
- **Backend:** Node.js (Express) + Supabase

## Dev-окружение — порты

| Сервис | Порт | URL |
|--------|------|-----|
| TradeFrame frontend | 3000 | http://localhost:3000 |
| TradeFrame backend | 3001 | http://localhost:3001 |
| TSupport frontend | 3002 | http://localhost:3002 |
| TSupport backend | 3003 | http://localhost:3003 |

## Запуск dev-окружения

**Порядок запуска: сначала бэкенд, потом фронтенд.**

Если порты заняты — убить процессы перед запуском:
```powershell
netstat -ano | findstr ":3000 :3001 :3002 :3003" | findstr "LISTENING"
taskkill //PID <PID> //F
```

### 1. Бэкенд (порт 3001)
```bash
cd server && node index.js
```
- Express-сервер, прокси для STS/TradeCorp/MSTO/TSupport API
- Telegram-бот, планировщик уведомлений
- Конфиг: `server/.env`

### 2. Фронтенд (порт 3000)
```bash
npm run dev
```
- Vite dev-сервер с HMR
- Проксирует `/api/*` на бэкенд :3001 (через vite.config.ts)

## Production-сервер

| Параметр | Значение |
|----------|----------|
| IP | 194.135.36.195 |
| Назначение | Production: prod.dataworker.ru, demo.dataworker.ru, testtf.dataworker.ru |
| SSH | `ssh dw-prod` (алиас в ~/.ssh/config, ключ ed25519 прописан) |
| Веб-сервер | nginx |
| SSL | Let's Encrypt (certbot, автопродление) |
| Обновление SSL | `certbot certonly --nginx -d <домен> --non-interactive --force-renewal && systemctl reload nginx` |

**Примечание:** SSH-соединение нестабильное (таймауты через раз из-за сервера). Ключ ed25519 прописан, при отказе — пробовать повторно.

---
> Связи: [[CLAUDE|Мастер-контекст]] | [[Dashboard]] | [[DW_Business/products/tradesuite-overview|TradeSuite обзор]] | [[ELSYPLUS/TradeCorp/CLAUDE|TradeCorp]] | [[OnlineOrders/MSTO-Terminal/CLAUDE|TradeGate]]
