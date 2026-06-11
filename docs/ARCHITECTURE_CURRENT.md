# Текущая архитектура

Дата актуализации: 2026-04-24
Версия приложения: 2.1.3

Этот документ фиксирует фактическое состояние по коду и конфигам. Для исторического контекста можно читать `docs/ARCHITECTURE.md`, но при расхождениях приоритет у этого файла.

## Общая схема

```text
Browser / PWA
  -> Vite dev proxy или nginx
  -> Express backend /api/*
  -> PostgreSQL, STS, MSTO, TradeCorp, TSupport, Telegram
```

Frontend не подключается к PostgreSQL напрямую и не хранит серверные секреты.

## Frontend

Стек:

- React 18.3
- TypeScript 5.9
- Vite 5.4
- React Router 6
- TanStack Query 5
- Tailwind CSS 3 + shadcn/ui / Radix
- Vitest + Playwright

Ключевые каталоги:

| Каталог | Назначение |
| --- | --- |
| `src/pages/` | страницы и маршруты |
| `src/components/` | UI и бизнес-компоненты |
| `src/components/ui/` | shadcn/ui primitives |
| `src/services/` | API-клиенты и бизнес-сервисы |
| `src/hooks/` | React hooks |
| `src/contexts/` | глобальные контексты, включая auth/selection |
| `src/types/` | TypeScript-типы |
| `src/utils/` | утилиты |
| `src/config/` | версия и настройки frontend |

Основной роутинг находится в `src/App.tsx`. Все основные продуктовые страницы защищены `ProtectedRoute`, часть admin-страниц требует `requireAdmin`.

Актуальные группы маршрутов:

- `/network/*` - сеть: обзор, операции, цены, заказы, остатки, поступления, купоны, сверка, продажи, уведомления, сообщения.
- `/point/*` - торговая точка: оборудование, цены, резервуары, сменные отчеты, shift dashboard.
- `/admin/*` - пользователи, роли, сети, аудит, юридические документы, тестовые страницы.
- `/settings/*` - STS/API и пользовательские уведомления.
- `/support/*` - заявки и чат.
- `/analytics/margins` - маржинальная аналитика.

## Backend

Backend запускается из `server/index.js` и использует `server/package.json`. Фактическая backend-зависимость Express задается в `server/package.json` (`express` 4.x). Корневой `package.json` содержит отдельные frontend/build зависимости.

Ключевые middleware и настройки:

- `dotenv.config()` вызывается до остальных импортов.
- CORS строится из `ALLOWED_ORIGINS`.
- `helmet` включен без CSP.
- `express-rate-limit`: отдельный лимит для `/api/auth/login`, общий лимит для `/api`.
- Health endpoints: `/health`, `/api/healthz`.
- Graceful shutdown закрывает scheduler и PostgreSQL pool.

Подключенные routes:

| Route prefix | Файл | Назначение |
| --- | --- | --- |
| `/api/sts` | `server/routes/sts.js` | STS proxy |
| `/api/tradecorp` | `server/routes/tradecorp.js` | TradeCorp proxy |
| `/api/auth` | `server/routes/auth.js` | логин, профиль, токены |
| `/api/networks` | `server/routes/networks.js` | торговые сети |
| `/api/trading-points` | `server/routes/tradingPoints.js` | торговые точки |
| `/api/users` | `server/routes/users.js` | пользователи |
| `/api/roles` | `server/routes/roles.js` | роли и права |
| `/api/legal` | `server/routes/legal.js` | юридические документы |
| `/api/nomenclature` | `server/routes/nomenclature.js` | номенклатура |
| `/api/audit` | `server/routes/audit.js` | журнал аудита |
| `/api/telegram` | `server/routes/telegramRuntime.js` | Telegram runtime |
| `/api/messages` | `server/routes/messagesRuntime.js` | broadcast-сообщения (legacy: UI-раздел рассылки удалён, оповещения переведены в чат «Новости»; эндпоинт сохранён) |
| `/api/tank-calibration` | `server/routes/tankCalibration.js` | калибровка резервуаров |
| `/api/msto` | `server/routes/msto.js` | MSTO proxy |
| `/api/support` | `server/routes/support.js` | TSupport |
| `/api/receipt-costs` | `server/routes/receiptCosts.js` | себестоимость поступлений |
| `/api/receipt-confirmations` | `server/routes/receiptConfirmations.js` | подтверждения поступлений |
| `/api/equipment-templates` | `server/routes/equipmentTemplates.js` | шаблоны оборудования |
| `/api/smoke` | `server/index.js` | авторизованный smoke по БД |

## Данные

Основная БД - PostgreSQL через `pg` и `DATABASE_URL`. Pool находится в `server/db/pool.js`.

Миграции лежат в `server/db/migrations/` и применяются командой:

```bash
npm --prefix server run db:migrate
```

Статус миграций:

```bash
npm --prefix server run db:migrate:status
```

Основные таблицы покрывают пользователей, роли, сети, торговые точки, уведомления, сообщения, аудит, юридические документы, номенклатуру, калибровку и поступления.

## Авторизация

Есть два независимых уровня:

1. App JWT: frontend отправляет `Authorization: Bearer <auth_token>` к backend. Backend проверяет пользователя через middleware.
2. STS JWT: backend получает отдельный JWT во внешнем STS API через `/v1/login` и сам добавляет его к запросам STS.

STS-логин и пароль никогда не должны попадать во frontend.

## Кэширование и фоновые процессы

- Backend использует in-memory кэш в сервисах STS/MSTO.
- `notificationScheduler` стартует при запуске backend, если `DISABLE_NOTIFICATION_SCHEDULER !== "true"`.
- Telegram bot инициализируется из `server/telegram-bot-runtime.js`.
- В локальной разработке планировщик обычно отключают через `DISABLE_NOTIFICATION_SCHEDULER=true`.

## PWA

PWA настраивается в `vite.config.ts` через `vite-plugin-pwa`.

- Service Worker отключен в development.
- Service Worker включен в test/production build.
- API-запросы `/api/*` в Workbox настроены как `NetworkOnly`.
- Статика кэшируется через `CacheFirst`.

## Версия

Источник версии: `src/config/version.ts`.

Синхронизация:

```bash
npm run sync-version
```

Сборки автоматически запускают синхронизацию перед `vite build`.
