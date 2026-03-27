# TradeControl

Платформа управления торговыми сетями АЗС — мониторинг, аналитика, управление ценами, сменами, оборудованием.

## Стек

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js (Express) — прокси для STS/TradeCorp/MSTO API
- **БД:** PostgreSQL (подключение через pg напрямую)
- **Тесты:** Vitest (unit) + Playwright (E2E)

## Quick Start

```bash
# 1. Установить зависимости
npm install

# 2. Backend (порт 3001) — запускаем ПЕРВЫМ
npm run start:backend

# 3. Frontend (порт 3000) — в новом терминале
npm run dev
```

Production preview из корня:
```bash
npm run build:prod
npm run start
```

**ENV-файлы** (не в репозитории, запросите у МАГа):
- `.env` — frontend переменные (`VITE_*`, опционально `VITE_FALLBACK_BACKEND_URL`)
- `server/.env` — backend (`STS_*`, TradeCorp, MSTO, Telegram, PostgreSQL)

## Тестирование

```bash
npm test              # unit-тесты (Vitest)
npm run test:e2e      # E2E (Playwright, автозапуск dev-сервера)
```

## Деплой

| Окружение | Команда | URL |
|-----------|---------|-----|
| Test | `git push test main` | testtf.dataworker.ru |
| Production | `git push prod main` | prod.dataworker.ru |

CI/CD: GitHub Actions (`deploy-prod.yml`, `deploy-test.yml`).

## Репозитории

| Remote | Репозиторий | Назначение |
|--------|-------------|------------|
| `prod` | Electro-Interfaces/TradeControl | Production |
| `test` | Electro-Interfaces/tradeframe-builder | Test |

## Структура

```
src/
  components/       # UI-компоненты
  contexts/         # React-контексты (Auth, Selection)
  hooks/            # Кастомные хуки
  pages/            # Страницы
  services/         # API-клиенты (apiClient.ts — единый HTTP-клиент)
  types/            # TypeScript типы
  utils/            # Утилиты
server/
  index.js          # Express entry point
  routes/           # API-роуты (тонкие роутеры)
  services/         # Бизнес-логика (stsProxyService, mstoProxyService, *PgSource)
  middleware/       # Auth, RBAC, scope filter
  db/               # PostgreSQL pool (pg)
docs/               # Документация
e2e/                # E2E тесты (Playwright)
```

## Внешние API

| API | Назначение | Документация |
|-----|------------|--------------|
| STS (poscontrol) | Данные АЗС, цены, транзакции | [Swagger](https://pos.autooplata.ru/tms/docs) |
| TradeCorp | Процессинг топливных карт | api.autooplata.ru |
| MSTO | Онлайн-заказы (Яндекс.Заправки и др.) | 46.229.214.21:3000 |
| TSupport | Поддержка клиентов | 81.200.148.35:3080 |

## Production

| Параметр | Значение |
|----------|----------|
| Сервер | 194.135.36.195 |
| SSH | `ssh dw-prod` |
| PM2 | `tradeframe-prod-frontend`, `tradeframe-prod-backend` |
