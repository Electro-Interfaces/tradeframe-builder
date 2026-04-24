# Load Memory - загрузка актуального контекста TradeFrame

Загрузи в Knowledge Graph основную информацию о проекте TradeFrame / TradeControl по состоянию версии 2.1.3.

## Перед загрузкой

Прочитай локальные источники правды:

1. `README.md`
2. `docs/HANDOVER.md`
3. `docs/ARCHITECTURE_CURRENT.md`
4. `docs/ENVIRONMENT.md`
5. `docs/OPERATIONS_RUNBOOK.md`
6. `docs/DOCS_STATUS.md`
7. `docs/PLANE_SETUP.md`
8. `docs/TECH_DEBT.md`

Не используй старые документы из `docs/_archive/`, `docs/mobile/`, `docs/operations/` как текущую инструкцию без сверки с `docs/DOCS_STATUS.md`.

## Сущности

Создай сущности:

- TradeFrame / TradeControl (Project)
- Frontend (Module)
- Backend API (Module)
- PostgreSQL Database (Database)
- STS API (External API)
- MSTO API (External API)
- TradeCorp API (External API)
- TSupport API (External API)
- Notification System (System)
- Telegram Bot Runtime (System)
- PWA (Feature)
- CI/CD (System)
- Plane Tracker (Task Tracker)

## Наблюдения

### TradeFrame / TradeControl

- Версия: 2.1.3.
- Назначение: платформа управления торговыми сетями АЗС.
- Основные зоны: оборудование, резервуары, операции, цены, смены, поступления, купоны, уведомления, пользователи, роли, юридические документы.
- Текущий трекер задач: Plane self-hosted, `https://plan.dataworker.ru`, проект TradeFrame.
- YouTrack является legacy-источником для старых ссылок, не текущим трекером задач TradeFrame.
- Локальный frontend: `http://localhost:3000`.
- Локальный backend: `http://localhost:3001`.
- Test: `https://testtf.dataworker.ru`.
- Production: `https://prod.dataworker.ru`.

### Frontend

- Стек: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix, React Router, TanStack Query.
- Entry routing: `src/App.tsx`.
- Основные каталоги: `src/pages`, `src/components`, `src/services`, `src/hooks`, `src/contexts`, `src/types`, `src/utils`, `src/config`.
- Все API-запросы идут через backend `/api/*`.

### Backend API

- Entry point: `server/index.js`.
- Runtime dependencies: `server/package.json`.
- Health: `/health`, `/api/healthz`.
- Smoke: `/api/smoke` с авторизацией.
- Основные routes: `server/routes/sts.js`, `msto.js`, `tradecorp.js`, `support.js`, `auth.js`, `networks.js`, `tradingPoints.js`, `users.js`, `roles.js`, `legal.js`, `nomenclature.js`, `audit.js`, `telegramRuntime.js`, `messagesRuntime.js`, `tankCalibration.js`.

### PostgreSQL Database

- Основная БД приложения.
- Подключение только через backend `pg`.
- Pool: `server/db/pool.js`.
- Миграции: `server/db/migrations/`.
- Переменная: `DATABASE_URL` только в `server/.env` и GitHub Secrets.

### STS API

- Base URL: `https://pos.autooplata.ru/tms`.
- Swagger: `https://pos.autooplata.ru/tms/docs`.
- Backend получает STS JWT через `/v1/login`.
- Frontend не хранит STS credentials.
- Основные данные: цены, операции, резервуары, смены, оборудование.

### Notification System

- Scheduler: `server/services/notificationScheduler.js`.
- Engine: `server/services/notificationEngine.js`.
- Telegram runtime: `server/telegram-bot-runtime.js`.
- Локально обычно отключается через `DISABLE_NOTIFICATION_SCHEDULER=true`.

### PWA

- Настройка: `vite.config.ts`.
- Service Worker отключен в development.
- Service Worker включен в test/production build.
- API `/api/*` не кэшируется service worker, используется NetworkOnly.

### CI/CD

- Test deploy: `git push test main`.
- Production deploy: `git push prod main`.
- Workflows: `.github/workflows/deploy-test.yml`, `deploy-prod.yml`, `smoke-check.yml`.
- Workflow выполняет `npm ci`, `npm run check:repo-guards`, `npm run sync-version`, `npm run build:prod`, deploy archive, PM2 restart, health/smoke checks.

### Plane Tracker

- URL: `https://plan.dataworker.ru`.
- Проект: TradeFrame.
- Назначение: задачи разработки, баги, приемка, приоритеты.
- Секреты Plane API и персональные токены не сохранять в memory.

## Связи

- TradeFrame / TradeControl → contains → Frontend.
- TradeFrame / TradeControl → contains → Backend API.
- Frontend → calls → Backend API.
- Backend API → connects_to → PostgreSQL Database.
- Backend API → proxies → STS API.
- Backend API → proxies → MSTO API.
- Backend API → proxies → TradeCorp API.
- Backend API → proxies → TSupport API.
- Backend API → manages → Notification System.
- Notification System → uses → Telegram Bot Runtime.
- Frontend → configured_by → `vite.config.ts`.
- Backend API → configured_by → `server/.env`.
- CI/CD → deploys → Test.
- CI/CD → deploys → Production.
- TradeFrame / TradeControl → tracks_work_in → Plane Tracker.

## Важные запреты

- Не сохранять секреты, токены и `.env` значения в memory.
- Не считать Supabase текущей БД проекта.
- Не считать GitHub Pages текущим test-деплоем.
- Не считать YouTrack текущим трекером задач TradeFrame.
- Не добавлять новые `console.log`, `console.info`, `console.warn` в runtime-код.

После загрузки подтверди, что Knowledge Graph создан по актуальной версии 2.1.3 и не содержит старых Supabase/GitHub Pages утверждений как текущих.
