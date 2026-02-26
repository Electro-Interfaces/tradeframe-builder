# TradeFrame (TF)

## Назначение

Платформа управления торговыми сетями АЗС — мониторинг, аналитика, управление ценами, сменами, оборудованием.

## Стек

- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui + TypeScript
- **Backend:** Node.js (Express) — прокси для STS/TradeCorp/MSTO/TSupport API
- **БД:** Supabase (PostgreSQL)
- **Тесты:** Vitest (unit, jsdom) + Playwright (E2E, chromium)

## Dev-окружение — порты

| Сервис | Порт | URL |
|--------|------|-----|
| TradeFrame frontend | 3000 | http://localhost:3000 |
| TradeFrame backend | 3001 | http://localhost:3001 |
| TSupport frontend | 3002 | http://localhost:3002 |
| TSupport backend | 3080 (prod) | http://81.200.148.35:3080 |

## Запуск dev-окружения

**Порядок запуска: сначала бэкенд, потом фронтенд.**

Если порты заняты — убить процессы перед запуском:
```powershell
netstat -ano | findstr ":3000 :3001" | findstr "LISTENING"
taskkill //PID <PID> //F
```

### 1. Бэкенд (порт 3001)
```bash
cd server && node index.js
```
- Express-сервер, прокси для STS/TradeCorp/MSTO/TSupport API
- Telegram-бот, планировщик уведомлений
- Конфиг: **`server/.env`** (НЕ корневой `.env`!)

### 2. Фронтенд (порт 3000)
```bash
npm run dev
```
- Vite dev-сервер с HMR
- Проксирует `/api/*` на бэкенд :3001 (через vite.config.ts)

## Тестирование

```bash
npm test              # unit-тесты (vitest run)
npm run test:watch    # watch-режим
npm run test:ui       # Vitest UI в браузере
npm run test:e2e      # Playwright E2E (автозапуск dev-сервера)
npm run test:e2e:ui   # Playwright UI
```

- Unit-тесты: `src/**/__tests__/*.test.ts`
- E2E тесты: `e2e/*.spec.ts`
- Setup: `src/test/setup.ts` (@testing-library/jest-dom)
- Конфиг Vitest: `vitest.config.ts` (расширяет vite.config.ts)
- Конфиг Playwright: `playwright.config.ts` (chromium, baseURL localhost:3000)

**Важно:** тесты работают только с чистыми утилитами и UI. Никаких обращений к production БД, API или данным торговых точек.

## ENV-переменные

Два файла `.env` — не путать:

| Файл | Назначение | Читает |
|------|-----------|--------|
| `.env` (корень) | Frontend (Vite) — `VITE_*` переменные | Vite dev-сервер |
| `server/.env` | Backend (Express) — все серверные переменные | `dotenv.config()` из `server/index.js` |

**Vite** автоматически подхватывает все `VITE_*` из корневого `.env` — блок `define` в `vite.config.ts` не нужен.

Необходимые переменные:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_STS_API_URL`, `VITE_STS_API_USERNAME`, `VITE_STS_API_PASSWORD`
- `TSUPPORT_API_URL`, `TSUPPORT_SDK_API_KEY`, `TSUPPORT_SDK_SECRET` (только в `server/.env`)

## Production-сервер

| Параметр | Значение |
|----------|----------|
| IP | 194.135.36.195 |
| Назначение | Production: prod.dataworker.ru, demo.dataworker.ru, testtf.dataworker.ru |
| SSH | `ssh dw-prod` (алиас в ~/.ssh/config, ключ ed25519 прописан) |
| Веб-сервер | nginx |
| SSL | Let's Encrypt (certbot, автопродление) |
| Обновление SSL | `certbot certonly --nginx -d <домен> --non-interactive --force-renewal && systemctl reload nginx` |
| CI/CD | GitHub Actions: `.github/workflows/deploy-prod.yml`, `deploy-test.yml` |

**Примечание:** SSH-соединение нестабильное (таймауты через раз из-за сервера). Ключ ed25519 прописан, при отказе — пробовать повторно.

## Структура проекта

```
src/
  components/       # UI-компоненты (charts, equipment, layout, tanks, support...)
  contexts/         # React-контексты (Auth, Selection, Support)
  hooks/            # Кастомные хуки
  pages/            # Страницы (Prices, ShiftDashboard, support/, admin/...)
  services/         # API-клиенты и бизнес-логика
  test/             # Тестовый setup
  types/            # TypeScript типы
  utils/            # Утилиты (fuelPriority, paymentUtils, backendUrl, sanitize...)
server/
  index.js          # Express entry point
  routes/           # API-роуты (sts, support, msto, tradecorp...)
e2e/                # E2E тесты (Playwright)
docs/               # Документация (architecture, deployment, mobile, operations, setup)
```

---
> Связи: [[CLAUDE|Мастер-контекст]] | [[Dashboard]] | [[DW_Business/products/tradesuite-overview|TradeSuite обзор]] | [[ELSYPLUS/TradeCorp/CLAUDE|TradeCorp]] | [[OnlineOrders/MSTO-Terminal/CLAUDE|TradeGate]]
