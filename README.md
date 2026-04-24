# TradeFrame / TradeControl

Платформа управления торговыми сетями АЗС: мониторинг оборудования и резервуаров, операции, цены, смены, поступления, купоны, уведомления, пользователи, роли и интеграции.

Версия приложения: `2.1.3`.

## Передача разработчикам

Для входа в проект читать в таком порядке:

1. [`docs/HANDOVER.md`](docs/HANDOVER.md) — контекст передачи и правила работы.
2. [`docs/ARCHITECTURE_CURRENT.md`](docs/ARCHITECTURE_CURRENT.md) — текущая архитектура по коду.
3. [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — переменные окружения и секреты.
4. [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) — эксплуатация, деплой, диагностика.
5. [`docs/DOCUMENTATION_AUDIT.md`](docs/DOCUMENTATION_AUDIT.md) — что в старой документации актуально, а что нет.
6. [`docs/DOCS_STATUS.md`](docs/DOCS_STATUS.md) — полный реестр документов и статусов.
7. [`docs/PLANE_SETUP.md`](docs/PLANE_SETUP.md) — текущий трекер задач и правила работы.
8. [`docs/TECH_DEBT.md`](docs/TECH_DEBT.md) — технический долг, важный для передачи.

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

# 3. Frontend (порт 3000)
npm run dev
```

Backend в watch-режиме:

```bash
npm run dev:backend
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
npm run lint          # ESLint
npm run type-check    # TypeScript
npm test              # unit-тесты Vitest
npm run build:prod    # production build
npm run test:e2e      # E2E Playwright
```

## Деплой

| Окружение | Команда | URL |
|-----------|---------|-----|
| Test | `git push test main` | testtf.dataworker.ru |
| Production | `git push prod main` | prod.dataworker.ru |

CI/CD: GitHub Actions (`deploy-prod.yml`, `deploy-test.yml`).

Штатный деплой только через push в соответствующий remote. Ручной SSH-деплой использовать только как аварийную операцию после диагностики.

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

## Важные ограничения

- Секреты не коммитить. `.env`, `server/.env`, `SECRETS_VALUES.txt`, `ADD_TO_GITHUB_SECRETS.txt` не должны попадать в репозиторий или архив передачи.
- Frontend не ходит напрямую в PostgreSQL и внешние API с секретами; все через backend `/api/*`.
- Новые `console.log`, `console.info`, `console.warn` в runtime-код не добавлять.
- Источник версии — `src/config/version.ts`; остальные файлы синхронизируются через `npm run sync-version`.
