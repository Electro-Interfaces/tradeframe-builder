# TradeControl Builder — Полное описание проекта

> **Версия:** 2.0.2
> **Дата:** Февраль 2026
> **Стек:** React 18 + TypeScript + Vite + Express + PostgreSQL
> **Назначение:** Платформа управления торговыми сетями АЗС

---

## 1. Обзор

**TradeControl Builder** — веб-платформа для управления торговыми сетями автозаправочных станций. Обеспечивает мониторинг оборудования, резервуаров, операций, ценообразования, сменных отчётов, купонов и онлайн-заказов. Поддерживает автоматические уведомления через Telegram и Email, экспорт данных в PDF/Excel, работу в офлайн-режиме (PWA).

### Ключевые возможности

- Мониторинг оборудования и резервуаров АЗС в реальном времени
- Управление ценами и расписаниями цен
- Сменные отчёты с аналитикой продаж
- Система купонов (создание, мониторинг, статистика)
- Онлайн-заказы через агрегаторы (MSTO)
- Поступления нефтепродуктов и сверка данных
- Автоматические уведомления (Telegram Bot, Email)
- Broadcast-рассылка сообщений администраторами
- Управление пользователями, ролями и правами доступа
- Правовые документы с отслеживанием принятия
- Журнал аудита действий пользователей
- PWA — установка на любые устройства, офлайн-работа
- Экспорт отчётов в PDF и Excel

---

## 2. Архитектура

### 2.1. Общая схема

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18 + Vite)                │
│                    Порт: 3000 (dev) / 8080 (prod)            │
│                                                              │
│  src/pages/          — 38 страниц-маршрутов                  │
│  src/components/     — 200+ компонентов (shadcn/ui + бизнес) │
│  src/services/       — 75+ API-клиентов и бизнес-сервисов    │
│  src/hooks/          — 41 кастомный React хук                │
│  src/types/          — 25 файлов TypeScript типов            │
│  src/contexts/       — 3 React контекста (Auth, Selection)   │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP /api/*
                             │ (Vite Proxy в dev, Nginx в prod)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│               BACKEND PROXY (Express.js)                     │
│               Порт: 3001 (prod) / 3002 (test)                │
│                                                              │
│  server/index.js              — Главный сервер               │
│  server/routes/sts.js         — STS API прокси (JWT)         │
│  server/routes/msto.js        — MSTO API прокси              │
│  server/routes/tradecorp.js   — TradeCorp API прокси         │
│  server/routes/telegram.js    — Telegram уведомления API     │
│  server/routes/messages.js    — Broadcast сообщения API      │
│  server/routes/tankCalibration.js — Калибровка резервуаров   │
│  server/telegram-bot-runtime.js  — Telegram Bot (polling)   │
│  server/services/             — Движок уведомлений, cron     │
│  server/repositories/pg/      — SQL-запросы (node-postgres)  │
└───────┬──────────┬──────────┬──────────┬─────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐
   │PostgreSQL│ │STS API │ │ MSTO │ │TradeCorp │
   │  (БД)   │ │(POS)   │ │      │ │          │
   └──────────┘ └────────┘ └──────┘ └──────────┘
```

### 2.2. Поток данных

```
Frontend (React)
  → Vite Proxy (/api/* → localhost:3001)
    → Backend Proxy (Express)
      → JWT авторизация (автоматическое обновление каждые 18 мин)
        → Внешний API (STS / MSTO / TradeCorp)
          → Ответ с кэшированием (TTL: 1–120 мин)
```

### 2.3. Трёхуровневая система окружений

| Параметр | DEVELOPMENT | TEST | PRODUCTION |
|----------|-------------|------|------------|
| **URL** | localhost:3000 | testtf.dataworker.ru | prod.dataworker.ru |
| **Backend порт** | 3001 | 3002 | 3001 |
| **Service Worker** | Отключён | Включён | Включён |
| **PWA** | Нет | Полная | Полная |
| **HMR** | Да | Нет | Нет |
| **Данные** | Реальные | Реальные | Реальные |
| **Деплой** | Ручной | GitHub Actions | GitHub Actions |
| **Telegram Bot** | DEV/TEST бот | TEST бот | PROD бот |

---

## 3. Технологический стек

### 3.1. Frontend

| Технология | Версия | Назначение |
|------------|--------|-----------|
| React | 18.3.1 | UI фреймворк |
| TypeScript | 5.9.3 | Типизация |
| Vite | 5.4.19 | Сборка и dev-сервер |
| React Router | 6.30.1 | Маршрутизация (SPA) |
| TanStack Query | 5.90.12 | Загрузка данных, кэширование |
| React Hook Form | 7.68.0 | Формы |
| Zod | 4.1.13 | Валидация схем |
| Tailwind CSS | 3.4.17 | Стилизация |
| shadcn/ui (Radix) | — | 60 UI-компонентов |
| Recharts | 3.5.1 | Графики и диаграммы |
| Chart.js | 4.5.1 | Дополнительные графики |
| Lucide Icons | 0.561.0 | Иконки |
| Sonner | 2.0.7 | Toast-уведомления |
| ExcelJS / XLSX | 4.4.0 / 0.18.5 | Экспорт в Excel |
| jsPDF + html2canvas | 3.0.4 / 1.4.1 | Экспорт в PDF |
| Axios | 1.13.2 | HTTP-клиент |
| vite-plugin-pwa | — | PWA поддержка |
| Lovable Tagger | 1.1.13 | Тегирование компонентов (dev) |

### 3.2. Backend

| Технология | Версия | Назначение |
|------------|--------|-----------|
| Node.js | 18+ | Среда выполнения |
| Express | 4.18.2 | HTTP-сервер |
| Axios | 1.6.2 | HTTP-клиент (STS API) |
| CORS | 2.8.5 | CORS middleware |
| dotenv | 16.3.1 | Переменные окружения |
| pg | 8.x | PostgreSQL клиент |
| node-telegram-bot-api | 0.66.0 | Telegram Bot |
| node-cron | 3.0.3 | Планировщик задач |
| nodemailer | 6.9.7 | Отправка email |
| node-cache | 5.1.2 | In-memory кэш |

### 3.3. Инфраструктура

| Технология | Назначение |
|------------|-----------|
| PostgreSQL (pg) | База данных + аутентификация (JWT) |
| GitHub Actions | CI/CD (автодеплой) |
| PM2 | Менеджер процессов (prod/test) |
| Nginx | Обратный прокси (prod/test) |
| SCP + SSH | Доставка артефактов |

---

## 4. Структура проекта

```
TradeControl/
│
├── src/                              # Frontend (React + TypeScript)
│   ├── pages/                        # 38 страниц-маршрутов
│   ├── components/                   # 200+ компонентов
│   │   ├── ui/                       #   60 shadcn/ui примитивов
│   │   ├── layout/                   #   Header, Sidebar, MainLayout
│   │   ├── equipment/                #   16 компонентов оборудования
│   │   ├── tanks/                    #   6 компонентов резервуаров
│   │   ├── coupons/                  #   11 компонентов купонов
│   │   ├── shift-reports/            #   7 компонентов смен
│   │   ├── shift-dashboard/          #   10 компонентов дашборда
│   │   ├── operations/               #   5 компонентов операций
│   │   ├── charts/                   #   10 графиков
│   │   ├── reconciliation/           #   12 компонентов сверки
│   │   ├── notifications/            #   7 компонентов уведомлений
│   │   ├── messages/                 #   4 компонента сообщений
│   │   ├── dialogs/                  #   8 диалогов
│   │   ├── common/                   #   10 общих компонентов
│   │   ├── legal/                    #   4 юридических компонента
│   │   ├── external-codes/           #   Внешние коды станций
│   │   ├── online-orders/            #   Онлайн-заказы
│   │   ├── pwa/                      #   PWA installer
│   │   └── ...                       #   Ещё ~10 групп
│   ├── services/                     # 75+ сервисов
│   │   ├── auth/                     #   Аутентификация
│   │   ├── stsProxyClient.ts         #   STS API клиент
│   │   ├── mstoProxyClient.ts        #   MSTO API клиент
│   │   ├── tradecorpProxyClient.ts   #   TradeCorp API клиент
│   │   ├── apiClient.ts              #   Единый HTTP-клиент для backend API
│   │   ├── operationsService.ts      #   Операции/транзакции
│   │   ├── pricesService.ts          #   Цены
│   │   ├── tanksService.ts           #   Резервуары
│   │   ├── equipmentService.ts       #   Оборудование
│   │   ├── couponsService.ts         #   Купоны
│   │   ├── shiftReportsService.ts    #   Сменные отчёты
│   │   ├── onlineOrdersService.ts    #   Онлайн-заказы
│   │   ├── receiptsService.ts        #   Поступления
│   │   ├── reconciliationService.ts  #   Сверка данных
│   │   ├── fuelInventoryService.ts   #   Остатки топлива
│   │   ├── notificationService.ts    #   Уведомления
│   │   ├── messageService.ts         #   Broadcast сообщения
│   │   ├── *ExportService.ts         #   6 экспорт-сервисов (PDF/Excel)
│   │   ├── *BusinessLogic.ts         #   4 бизнес-логики
│   │   └── httpClients.ts            #   Retry, Idempotency, Trace
│   ├── hooks/                        # 41 кастомный хук
│   ├── types/                        # 25 файлов TypeScript типов
│   ├── contexts/                     # 3 React контекста
│   ├── config/                       # Конфигурация (version.ts)
│   └── lib/                          # Утилиты (cn, React Query)
│
├── server/                           # Backend Proxy (Express.js)
│   ├── index.js                      # Главный сервер (запуск Bot + Cron)
│   ├── telegram-bot.js               # Telegram Bot (polling)
│   ├── routes/
│   │   ├── sts.js                    # STS API прокси (JWT)
│   │   ├── msto.js                   # MSTO API прокси
│   │   ├── tradecorp.js              # TradeCorp API прокси
│   │   ├── telegram.js               # Telegram уведомления
│   │   ├── messages.js               # Broadcast сообщения
│   │   ├── stsProxyService.js        # STS API прокси (кэш, токены)
│   │   └── tankCalibration.js        # Калибровка резервуаров
│   ├── services/
│   │   ├── notificationEngine.js     # Ядро проверок и отправки
│   │   ├── notificationScheduler.js  # Cron-планировщик
│   │   ├── emailService.js           # SMTP (Nodemailer)
│   │   └── telegramService.js        # Telegram Bot API
│   ├── ecosystem.config.cjs          # PM2 конфигурация
│   ├── package.json                  # Зависимости backend
│   └── .env                          # Переменные окружения (не в Git)
│
├── public/                           # Статика и PWA
│   ├── pwa-192x192.png              # PWA иконка 192x192
│   ├── pwa-512x512.png              # PWA иконка 512x512 (maskable)
│   ├── favicon.ico                   # Favicon
│   └── manifest.json                 # PWA манифест
│
├── database/migrations/              # SQL миграции (6 файлов)
├── scripts/                          # Скрипты разработки (40+)
├── tools/                            # Утилиты БД и отладки (35+)
├── docs/                             # Документация (14 файлов)
├── .github/workflows/                # CI/CD (2 workflow)
│
├── vite.config.ts                    # Vite + PWA + Proxy
├── tailwind.config.ts                # Tailwind + дизайн-система
├── tsconfig.json                     # TypeScript конфиг
├── package.json                      # Root зависимости
└── ecosystem.*.config.cjs            # PM2 конфиги (dev/test/prod)
```

### Статистика кодовой базы

| Метрика | Значение |
|---------|----------|
| Файлов .tsx (компоненты) | 293 |
| Файлов .ts (логика) | 231 |
| Всего исходных файлов | 527 |
| Страниц (маршрутов) | 38 |
| UI компонентов shadcn | 60 |
| Бизнес-компонентов | 140+ |
| Сервисов и API клиентов | 75+ |
| Кастомных хуков | 41 |
| TypeScript типов | 25 файлов |
| Backend маршрутов | 7 файлов |
| SQL миграций | 6 файлов |
| GitHub Actions workflows | 2 |

---

## 5. Маршрутизация (все страницы)

Все маршруты определены в `src/App.tsx`. Применяется Lazy Loading для оптимизации загрузки.

### Торговые сети (`/network/*`)

| Маршрут | Страница | Описание |
|---------|----------|----------|
| `/network/overview` | NetworkOverview | Обзор сети — статусы ТО, KPI |
| `/network/operations-transactions` | OperationsTransactions | Операции и транзакции |
| `/network/pricing` | NetworkPricing | Ценообразование по сети |
| `/network/online-orders` | OnlineOrdersMonitor | Мониторинг онлайн-заказов (MSTO) |
| `/network/fuel-inventory` | FuelInventory | Остатки топлива по сети |
| `/network/receipts` | Receipts | Поступления нефтепродуктов |
| `/network/coupons` | CouponsPage | Управление купонами |
| `/network/reconciliation` | ReconciliationPage | Сверка данных |
| `/network/sales-analysis` | SalesAnalysisPage | Анализ продаж |
| `/network/notifications` | NetworkNotifications | Оповещения сети |
| `/network/broadcast-messages` | BroadcastMessages | Рассылка сообщений |
| `/network/messages` | Messages | Сообщения |

### Торговая точка (`/point/*`)

| Маршрут | Страница | Описание |
|---------|----------|----------|
| `/point/prices` | Prices | Цены торговой точки (STS API) |
| `/point/tanks` | Tanks | Резервуары — уровни, калибровка |
| `/point/equipment` | Equipment | Оборудование — статусы, команды |
| `/point/shift-reports-v2` | ShiftReportsV2 | Сменные отчёты V2 |
| `/point/shift-dashboard` | ShiftDashboard | Дашборд текущей смены |

### Администрирование (`/admin/*`)

| Маршрут | Страница | Описание |
|---------|----------|----------|
| `/admin/networks` | NetworksPage | Управление сетями и ТТ |
| `/admin/users-and-roles` | Users | Управление пользователями |
| `/admin/roles` | Roles | Роли и разрешения |
| `/admin/legal-documents` | LegalDocuments | Правовые документы |
| `/admin/legal-documents/editor` | LegalDocumentEditor | Редактор документов |
| `/admin/legal-documents/history` | LegalDocumentHistory | История версий |
| `/admin/legal-documents/acceptances` | LegalUsersAcceptances | Отслеживание принятия |
| `/admin/audit` | AuditLog | Журнал аудита |
| `/admin/data-migration` | DataMigration | Миграция данных |

### Настройки (`/settings/*`)

| Маршрут | Страница | Описание |
|---------|----------|----------|
| `/settings/api-cts` | STSApiSettings | Настройки STS API |
| `/settings/external-database` | ExternalDatabaseSettings | Внешняя БД |
| `/settings/notifications` | UserNotificationSettings | Уведомления пользователя |

### Прочие

| Маршрут | Страница | Описание |
|---------|----------|----------|
| `/login` | LoginPageWithLegal | Вход с принятием документов |
| `/profile` | SimpleProfile | Профиль пользователя |
| `/` | Equipment | Главная (оборудование) |

---

## 6. Backend API Endpoints

### 6.1. STS API Прокси (`/api/sts/*`)

Все запросы проксируются к внешнему STS API с автоматической JWT авторизацией.

| Метод | Endpoint | TTL кэша | Описание |
|-------|----------|----------|----------|
| GET | `/api/sts/v1/transactions` | 3 мин | Транзакции V1 |
| GET | `/api/sts/v2/transactions` | 5 мин | Транзакции V2 |
| GET | `/api/sts/v1/info` | 1 мин | Статусы ТО |
| GET | `/api/sts/v2/info` | 1 мин | Статусы V2 |
| GET | `/api/sts/v1/tanks` | 2 мин | Резервуары |
| GET | `/api/sts/v1/shifts` | 5 мин | Список смен |
| GET | `/api/sts/v1/coupons` | Без кэша | Купоны |
| GET | `/api/sts/v1/coupons_manual` | Без кэша | Ручные купоны |
| POST | `/api/sts/v1/control/coupon` | — | Создание купона |
| GET | `/api/sts/v1/report/receipts` | 5 мин | Поступления |
| GET | `/api/sts/v1/report/shift_report` | 2 часа | Сменный отчёт |
| GET | `/api/sts/v1/prices` | 5 мин | Цены |
| GET | `/api/sts/v1/schedule/prices/:station` | — | Расписание цен |
| GET | `/api/sts/v1/pos/prices/:station` | — | POS цены |
| POST | `/api/sts/v1/control/terminal/open` | — | Открыть терминал |
| POST | `/api/sts/v1/control/terminal/close` | — | Закрыть терминал |
| POST | `/api/sts/v1/control/shift/open` | — | Открыть смену |
| POST | `/api/sts/v1/control/shift/close` | — | Закрыть смену |
| GET | `/api/sts/_cache/stats` | — | Статистика кэша |
| POST | `/api/sts/_cache/clear` | — | Очистка кэша |

### 6.2. MSTO API (`/api/msto/*`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/msto/health` | Health check |
| GET | `/api/msto/servicePoints` | Точки обслуживания |
| GET | `/api/msto/transactions` | Транзакции MSTO |
| GET | `/api/msto/transactions/:id` | Детали транзакции |
| GET | `/api/msto/tariffs` | Тарифы |
| GET | `/api/msto/orders/history` | История заказов |
| GET | `/api/msto/orders/details` | Детали заказов |
| GET | `/api/msto/orders/statuses` | Статусы заказов |
| POST | `/api/msto/_cache/clear` | Очистка кэша |

### 6.3. TradeCorp API (`/api/tradecorp/*`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/tradecorp/transactions` | Транзакция |
| POST | `/api/tradecorp/transactions/summary` | Сводка транзакций |
| GET | `/api/tradecorp/health` | Health check |

### 6.4. Telegram / Уведомления (`/api/telegram/*`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/generate-link-code` | Генерация кода привязки (8 символов, 24 часа) |
| POST | `/save-settings` | Сохранение настроек уведомлений |
| GET | `/get-settings/:userId` | Получение настроек |
| POST | `/save-subscription` | Подписка на тип событий |
| GET | `/get-subscriptions/:userId` | Получение подписок |
| POST | `/send-test-notification` | Тестовое уведомление |
| GET | `/get-rules/:tenantId` | Правила уведомлений |
| POST | `/create-rule` | Создание правила |
| PUT | `/update-rule/:ruleId` | Обновление правила |
| DELETE | `/delete-rule/:ruleId` | Удаление правила |

### 6.5. Broadcast сообщения (`/api/messages/*`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Список сообщений |
| GET | `/:id` | Детали сообщения |
| POST | `/` | Создание сообщения |
| PUT | `/:id` | Обновление сообщения |
| DELETE | `/:id` | Удаление сообщения |
| POST | `/:id/send` | Отправка сообщения |
| GET | `/:id/stats` | Статистика доставки |

### 6.6. Прочие

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Health check сервера |
| GET | `/api/equipment-templates` | Шаблоны оборудования |
| GET/POST/DELETE | `/api/tank-calibration/*` | Калибровка резервуаров |

---

## 7. База данных (PostgreSQL)

### 7.1. Основные таблицы

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `users` | Пользователи | id (UUID), email, name, phone, status, pwd_salt, pwd_hash |
| `user_roles` | Связь пользователь-роль | user_id, role_id, scope_value |
| `roles` | Роли и разрешения | id, name, code, permissions (JSONB) |
| `tenants` | Торговые сети и ТТ | id, code, type, settings (JSONB со станциями) |
| `networks` | Торговые сети | id, name, is_active |
| `trading_points` | Торговые точки АЗС | id, network_id, name, is_active |
| `equipment_templates` | Шаблоны оборудования | id, name, system_type, technical_code, is_active |
| `equipment` | Оборудование | id, trading_point_id, template_id, is_active |
| `nomenclature` | Номенклатура товаров | id, name, is_active |
| `fuel_types` | Типы топлива | id, name, is_active |
| `audit_logs` | Журнал аудита | user_id, action, resource, timestamp |

### 7.2. Таблицы уведомлений

| Таблица | Назначение |
|---------|-----------|
| `user_notification_settings` | Настройки уведомлений (email, telegram, DND) |
| `telegram_link_codes` | Временные коды привязки Telegram (8 символов, 24 часа) |
| `notification_rules` | Правила автоматических проверок |
| `notifications` | История уведомлений |
| `notification_delivery_log` | Журнал доставки |
| `user_notification_subscriptions` | Подписки пользователей на типы событий |
| `role_notification_subscriptions` | Подписки на уровне ролей |

### 7.3. Таблицы сообщений

| Таблица | Назначение |
|---------|-----------|
| `broadcast_messages` | Сообщения для рассылки |
| `message_recipients` | Получатели с статусами доставки |
| `message_templates` | Шаблоны сообщений |
| `message_attachments` | Вложения |

### 7.4. Прочие таблицы

| Таблица | Назначение |
|---------|-----------|
| `tank_calibration_settings` | Настройки калибровки резервуаров |
| `legal_documents` | Правовые документы |
| `legal_document_acceptances` | Принятие документов пользователями |

### 7.5. Особенности

- Все ID — UUID
- Статус активности — `is_active` (boolean), НЕ `status` (string)
- Настройки сетей/станций — JSONB в `tenants.settings`
- Внешние коды станций — `settings.stations[].external_codes[]`
- Backend использует SERVICE_ROLE_KEY (обход RLS)
- Frontend использует ANON_KEY с JWT токенами пользователей

---

## 8. Внешние интеграции

### 8.1. STS API (POS-система)

- **URL:** `https://pos.autooplata.ru/tms`
- **Документация:** Swagger OpenAPI 3.1.0 (`/tms/docs`)
- **Аутентификация:** JWT Bearer Token (обновление каждые 18 минут)
- **Возможности:** Транзакции, резервуары, смены, цены, купоны, поступления, управление терминалами
- **Прокси:** `server/routes/sts.js` с in-memory кэшированием

### 8.2. MSTO (Агрегатор онлайн-заказов)

- **Назначение:** Получение онлайн-заказов с агрегаторов
- **Возможности:** Точки обслуживания, транзакции, тарифы, история заказов, статусы
- **Прокси:** `server/routes/msto.js`

### 8.3. TradeCorp (Корпоративный процессинг)

- **Назначение:** Корпоративные транзакции и сводки
- **Прокси:** `server/routes/tradecorp.js`

### 8.4. Telegram Bot

- **PRODUCTION бот:** @TradeControlDW_Bot
- **TEST бот:** @TradeControlTest_Bot
- **Режим:** Polling (не webhook)
- **Команды:**

| Команда | Действие |
|---------|----------|
| `/start [code]` | Привязка аккаунта по 8-символьному коду |
| `/help` | Справка по использованию |
| `/status` | Проверка статуса привязки и подписок |
| `/unlink` | Отвязка Telegram аккаунта |

### 8.5. Email (SMTP)

- **Библиотека:** Nodemailer
- **Назначение:** Уведомления и broadcast сообщения
- **Конфигурация:** SMTP_HOST, SMTP_PORT, SMTP_USER в `server/.env`

### 8.6. PostgreSQL

- **Назначение:** PostgreSQL БД + аутентификация + RLS
- **Клиент:** `pg` (node-postgres)
- **Доступ:** REST API + Realtime подписки

---

## 9. Система уведомлений

### 9.1. Архитектура

```
┌─────────────────────────────────────────────┐
│         Планировщик (node-cron)             │
│                                             │
│  */30 * * * *  → Оборудование offline       │
│  0 */4 * * *   → Низкий уровень топлива     │
│  0 */6 * * *   → Пороги купюроприемника     │
│  */15 * * * *  → Терминал offline            │
│  0 */2 * * *   → Непробитые чеки            │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│       Notification Engine                    │
│                                             │
│  1. Получить активные правила               │
│  2. Выполнить проверку (STS API / БД)       │
│  3. Создать уведомление в notifications     │
│  4. Найти получателей (подписки + роли)     │
│  5. Проверить DND и дедупликацию            │
│  6. Отправить через Telegram / Email        │
│  7. Записать в delivery_log                 │
└──────────────────┬──────────┬───────────────┘
                   ▼          ▼
            ┌──────────┐ ┌─────────┐
            │ Telegram │ │  Email  │
            │   Bot    │ │  SMTP   │
            └──────────┘ └─────────┘
```

### 9.2. Типы уведомлений

| Тип | Расписание | Описание |
|-----|-----------|----------|
| `bill_acceptor_threshold` | Каждые 6 часов | Пороги купюроприемника |
| `equipment_offline` | Каждые 30 минут | Оборудование недоступно |
| `low_fuel_level` | Каждые 4 часа | Критически низкий уровень топлива |
| `terminal_offline` | Каждые 15 минут | Терминал недоступен |
| `unpunched_receipts` | Каждые 2 часа | Непробитые чеки |

### 9.3. Приоритеты

| Приоритет | Описание |
|-----------|----------|
| `critical` | Требует немедленного внимания |
| `high` | Важные события |
| `medium` | Информационные |
| `low` | Общие уведомления |

### 9.4. Режим "Не беспокоить" (DND)

- `dnd_enabled` — включение/выключение
- `dnd_start` / `dnd_end` — временной интервал
- `dnd_allow_critical` — пропускать критические уведомления

### 9.5. Процесс привязки Telegram

1. Пользователь нажимает "Привязать Telegram" в UI
2. Генерируется 8-символьный код (срок — 24 часа)
3. Пользователь переходит по ссылке `t.me/Bot?start=КОД`
4. Бот проверяет код в `telegram_link_codes`
5. Сохраняет `telegram_chat_id` в `user_notification_settings`
6. Отправляет подтверждение в Telegram

---

## 10. Broadcast сообщения

### Возможности

- Создание и отправка сообщений через UI (`/network/broadcast-messages`)
- Каналы доставки: Telegram, Email, оба
- Получатели: все, по ролям, конкретные пользователи
- Типы: новости, объявления, оповещения, техобслуживание
- Приоритеты: низкий, средний, высокий, критический
- Черновики, история, статистика доставки
- Markdown форматирование

---

## 11. Дизайн-система

### 11.1. Цветовая палитра

```
Фон:         hsl(215 28% 12%)    — Тёмный сланец
Карточки:    hsl(217 32% 17%)    — Чуть светлее фона
Акцент:      hsl(217 91% 60%)    — Синий

trade.blue   — Основной акцент (синий)
trade.purple — Фиолетовый акцент
trade.green  — Зелёный (emerald) — успех
trade.orange — Оранжевый — предупреждение

success      — Зелёный (hsl 120 100% 40%)
warning      — Жёлтый (hsl 45 100% 55%)
error        — Красный (hsl 0 84% 60%)
```

### 11.2. Типографика и отступы

- Border Radius: 12px / 10px / 8px (lg / md / sm)
- Тени: soft (2px), medium (4px), large (8px)
- Минимальная зона касания: 44x44px (мобильные)
- Тема: только тёмная

### 11.3. Адаптивность

| Breakpoint | Описание |
|-----------|----------|
| `< 768px` | Мобильная версия (карточки вместо таблиц, Sheet-меню) |
| `≥ 768px` | Десктопная версия (боковая панель, таблицы) |
| `< 500px height` | Landscape-оптимизация |

### 11.4. Layout

**Desktop:**
```
┌─ Header (80px) ──────────────────────────────┐
│ [Logo] [v2.0.2] [Сеть ▾] [ТТ ▾] [Профиль]  │
├─ Sidebar (256px) ─┬─ Content (flex-1) ───────┤
│  Торговые сети    │  KPI Cards (grid 2-4)    │
│  Торговая точка   │  Графики (350px)         │
│  Администрирование│  Таблицы (sortable)      │
│  Настройки        │  Диалоги, формы          │
└───────────────────┴──────────────────────────┘
```

**Mobile:**
```
┌─ Header ─────────────────────────────────────┐
│ [☰] [Сеть ▾] [Уведомления] [+]              │
├──────────────────────────────────────────────┤
│ [Выбор ТТ]                                   │
├──────────────────────────────────────────────┤
│ KPI Cards (grid-cols-1)                      │
│ Графики (250px)                              │
│ Карточки данных (вместо таблиц)              │
│ BottomSheet диалоги                          │
└──────────────────────────────────────────────┘
```

---

## 12. PWA (Progressive Web App)

### Возможности

- Установка на все платформы (Chrome, Safari, Android, iOS)
- Офлайн-работа с кэшированием API и статики
- Автоматическое обновление Service Worker
- Push-иконки для рабочего стола

### Стратегии кэширования (Workbox)

| Ресурс | Стратегия | Время жизни |
|--------|-----------|-------------|
| API запросы (`/api/*`) | NetworkFirst | 24 часа |
| Статика (JS, CSS, изображения) | CacheFirst | 30 дней |
| Google Fonts | CacheFirst | 1 год |

### Манифест

```json
{
  "name": "TradeControl Builder",
  "short_name": "TradeControl",
  "description": "Платформа управления торговыми сетями АЗС",
  "theme_color": "#1e293b",
  "background_color": "#0f172a",
  "display": "standalone"
}
```

---

## 13. CI/CD (GitHub Actions)

### 13.1. Deploy to PRODUCTION

- **Репозиторий:** Electro-Interfaces/TradeControl
- **Триггер:** push на `main`
- **Сервер:** prod.dataworker.ru
- **Процесс:**
  1. `npm ci` + `npm run build:prod`
  2. Создание `.env` из GitHub Secrets
  3. Архивирование (dist/, server/, package.json)
  4. SCP на сервер
  5. `npm install` зависимостей на сервере
  6. PM2 restart (`tradeframe-prod-frontend:8080`, `tradeframe-prod-backend:3001`)
  7. Бэкап предыдущей версии

### 13.2. Deploy to TEST

- **Репозиторий:** Electro-Interfaces/tradeframe-builder
- **Триггер:** push на `main`
- **Сервер:** testtf.dataworker.ru
- **Процесс:** аналогичен PRODUCTION
- **Отличия:** порт backend 3002, TEST Telegram бот

### 13.3. Переменные окружения (GitHub Secrets)

| Категория | Переменные |
|-----------|-----------|
| PostgreSQL | DATABASE_URL, JWT_SECRET |
| STS API | VITE_STS_API_URL, VITE_STS_API_USERNAME, VITE_STS_API_PASSWORD |
| MSTO | MSTO_API_URL, MSTO_USERNAME, MSTO_PASSWORD |
| TradeCorp | TRADECORP_API_URL, TRADECORP_LOGIN, TRADECORP_PASSWORD, TRADECORP_EMITENT_ID |
| Telegram | TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_TOKEN_TEST |
| SSH Deploy | SSH_PRIVATE_KEY, REMOTE_HOST, REMOTE_USER |

---

## 14. Торговые сети и станции

### Текущая конфигурация

| API ID | Название | MSTO ID | STS ID | Адрес |
|--------|----------|---------|--------|-------|
| 1 | АКАЗС №1 Непокоренных | 212 | 1 | СПб, пр. Непокорённых, 51 |
| 2 | АКАЗС №2 Выборг | 238 | 2 | Ленинградское шоссе д.79 |
| 3 | АКАЗС №3 Кудрово | 245 | 3 | СПб, пр. Строителей, 21 |
| 4 | АКАЗС №4 Первомайское | 251 | 4 | Выборгский р-н, п. Первомайское, ул. Ленина д. 49А |
| 6 | АКАЗС №6 Колпино | 268 | 6 | Колпино, ул. Межевая, 2 |

### Внешние коды станций

Каждая станция может иметь несколько внешних кодов для разных систем:

| Система | Описание |
|---------|----------|
| `sts` | Код в STS API (station_number) |
| `msto` | Код в MSTO (ID у агента) |
| `fuelup` | Код в FuelUp |
| `yandex` | Код в Яндекс Заправках |
| `benzuber` | Код в Benzuber |
| `1c` | Код в 1С |
| `crm` | Код в CRM |
| `processing` | Код в процессинге |

Хранятся в `tenants.settings.stations[].external_codes[]` (JSONB).

---

## 15. Управление пользователями

### Аутентификация

- **Провайдер:** Backend JWT (server/services/auth/)
- **Хранение:** localStorage (auth_token)
- **Сессия:** JWT с автоматическим обновлением
- **Хэширование паролей:** SHA-256 (salt + password)

### Роли и разрешения

- Роли хранятся в таблице `roles` с массивом `permissions` (JSONB)
- Связь пользователь-роль через `user_roles` (поддержка нескольких ролей)
- Разрешения проверяются через `permissionService.ts`
- Видимость меню зависит от разрешений (`useMenuVisibility`)

---

## 16. Экспорт данных

### Форматы

| Формат | Библиотека | Применение |
|--------|-----------|-----------|
| Excel (.xlsx) | ExcelJS + XLSX | Операции, купоны, смены, поступления, сеть |
| PDF | jsPDF + html2canvas | Сменные отчёты, сеть |

### Экспорт-сервисы

- `operationsExportService.ts` — операции
- `couponsExportService.ts` — купоны
- `shiftReportExportService.ts` — сменные отчёты
- `receiptsExportService.ts` — поступления
- `networkExportService.ts` — сводка по сети (Excel)
- `networkPdfExportService.ts` — сводка по сети (PDF)
- `pricesExportService.ts` — цены

---

## 17. HTTP-клиент и Retry-логика

### Конфигурация (`src/services/httpClients.ts`)

- **Retry:** до 3 попыток с exponential backoff (1с → 2с → 4с)
- **Timeout:** 45 сек (первая), 90 сек (повторные)
- **Заголовки:**
  - `Idempotency-Key` — предотвращение дублирования
  - `X-Trace-Id` — трассировка запросов
  - `X-User-Id`, `X-User-Name` — контекст пользователя

### Кэширование (Backend)

- In-memory кэш (`node-cache`) с настраиваемым TTL
- TTL по типу данных: 1 мин (статусы) — 2 часа (отчёты)
- Ручная очистка через `/_cache/clear`
- Статистика через `/_cache/stats`

---

## 18. Инструменты разработки

### SQL Direct Access (`tools/sql-direct.js`)

```bash
node tools/sql-direct.js tables                     # Список таблиц
node tools/sql-direct.js describe equipment_templates  # Структура
node tools/sql-direct.js select equipment_templates    # Данные
```

### Скрипты (`scripts/`)

- `update-version.cjs` — обновление версии приложения
- `seedExternalCodes.ts` — массовая загрузка внешних кодов
- `checkReadiness.ts` — проверка готовности окружения
- `scripts/js/*.cjs` — 50+ скриптов миграций, генерации, тестов

### PM2 конфигурации

| Файл | Окружение |
|------|-----------|
| `ecosystem.config.cjs` | Development |
| `ecosystem.test.config.cjs` | Test |
| `ecosystem.prod.config.cjs` | Production |

---

## 19. Документация

| Файл | Содержание |
|------|-----------|
| `CLAUDE.md` | Инструкции для Claude Code |
| `docs/ARCHITECTURE.md` | Архитектура приложения |
| `docs/DEVELOPER_GUIDE.md` | Руководство разработчика |
| `docs/API_TRADING_NETWORK.md` | API торговой сети |
| `docs/API_SHIFT_REPORTS.md` | API сменных отчётов |
| `docs/STS_API_EXAMPLES.md` | Примеры STS API |
| `docs/DATABASE_SETUP.md` | Настройка базы данных |
| `docs/TANK_CALIBRATION.md` | Калибровка резервуаров |
| `docs/MSTO_INTEGRATION.md` | Интеграция с MSTO |
| `docs/DESIGN_SYSTEM.md` | Дизайн-система |
| `docs/VERSION_MANAGEMENT.md` | Управление версиями |
| `docs/user-guide/` | Пользовательская документация + скриншоты |
| `DEPLOYMENT_STRATEGY.md` | Стратегия развёртывания |
| `BROADCAST_MESSAGES_SETUP.md` | Настройка рассылки |
| `PWA_SETUP.md` | Настройка PWA |

---

## 20. YouTrack (Управление задачами)

- **URL:** https://mag.youtrack.cloud/
- **Проект:** TradeControl (TF)
- **Доска:** TradeControl Builder (ID: 147-35, спринт: 148-47)
- **Формат задач:** TF-XXX
- **Формат коммитов:** `тип(TF-XXX): описание на русском`
- **Статусы:** Open → Подготовка → In Progress → To Verify → Done

---

## 21. Запуск проекта

### Development

```bash
# 1. Установка зависимостей
npm install
cd server && npm install && cd ..

# 2. Настройка переменных окружения
# Создать server/.env (см. шаблон в CLAUDE.md)

# 3. Запуск Backend (первым!)
cd server && node index.js

# 4. Запуск Frontend (в другом терминале)
npm run dev

# 5. Проверка
# Backend:  http://localhost:3001/health
# Frontend: http://127.0.0.1:3000/
```

### Production

```bash
# Автоматический деплой через GitHub Actions
git push prod main

# Или ручной запуск workflow:
gh workflow run "Deploy to PRODUCTION Environment" \
  --repo Electro-Interfaces/TradeControl --ref main

# Проверка:
gh run list --repo Electro-Interfaces/TradeControl --limit 3
```

---

> **Примечание:** В данном документе намеренно не указаны ключи доступа, пароли, SSH-ключи и токены. Все секреты хранятся в `server/.env` (локально) и GitHub Secrets (CI/CD).
