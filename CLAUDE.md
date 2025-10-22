# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом данного репозитория.

## ⚡ Быстрый старт

```bash
# 1️⃣ ПЕРВЫМ запускаем Backend Proxy (порт 3001)
cd server
node index.js

# 2️⃣ ВТОРЫМ запускаем Frontend (порт 3000)
# В новом терминале:
npm run dev

# ✅ Проверка работы:
# Backend: http://localhost:3001/health
# Frontend: http://127.0.0.1:3000/
```

**Почему два сервера?**
- **Backend Proxy (3001)** - проксирует запросы к STS API с JWT авторизацией, управляет Telegram Bot и системой уведомлений
- **Frontend (3000)** - React приложение, обращается к backend proxy для получения данных

## 🚀 Команды разработки

### Запуск локальной среды разработки

**ВАЖНО**: Для полноценной работы приложения необходимо запустить ДВА сервера:

```bash
# 1. Backend Proxy Server (порт 3001)
# Обязательно запускается ПЕРВЫМ для проксирования STS API запросов
cd server
node index.js

# 2. Frontend Dev Server (порт 3000)
# Запускается после backend proxy
npm run dev
```

**Порядок запуска критичен**:
1. Сначала `server/index.js` (backend proxy на порту 3001)
2. Затем `npm run dev` (frontend на порту 3000)

**Проверка работы серверов**:
```bash
# Backend Proxy health check
curl http://localhost:3001/health

# Frontend доступен по адресу
http://127.0.0.1:3000/
```

**Архитектура запросов**:
- Frontend (3000) → Vite Proxy → Backend Proxy (3001) → STS API
- Vite конфигурация: `vite.config.ts` (proxy `/api/sts` → `localhost:3001`)
- Backend proxy: `server/index.js` + `server/routes/sts.js`
- Backend использует JWT авторизацию (автоматическое обновление токена каждые 18 минут)

### Другие команды

```bash
# Установка зависимостей
npm install

# Сборка для production
npm run build

# Сборка для разработки
npm run build:dev

# Запуск линтера
npm run lint

# Предпросмотр production сборки
npm run preview
```

## 🔧 Установка и настройка

### Зависимости Backend Proxy Server

Backend proxy сервер (`server/`) имеет собственные зависимости:

```bash
cd server
npm install
```

**Необходимые пакеты** (из `server/package.json`):
- `express` - Web сервер
- `cors` - CORS middleware
- `axios` - HTTP клиент для запросов к STS API
- `dotenv` - Загрузка переменных окружения
- `@supabase/supabase-js` - Supabase клиент для работы с БД
- `node-telegram-bot-api` - Telegram Bot API
- `node-cron` - Планировщик задач (проверки уведомлений)
- `nodemailer` - Отправка email уведомлений

### Файл server/.env

Создайте файл `server/.env` со следующими переменными:

```env
# STS API Configuration
STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=your_username
STS_API_PASSWORD=your_password

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=https://prod.dataworker.ru,http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001

# Telegram Bot Configuration
# ⚠️ ВАЖНО: Используйте РАЗНЫЕ боты для PROD и TEST!
# PROD: @TradeFrameDW_Bot (токен: 8049816280:AAEHimSlNiuyRIRA_sjrG9f78lvc9aprwa8)
# TEST: @TradeFrameTest_Bot (токен: 8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0)
TELEGRAM_BOT_TOKEN=your_bot_token_from_@BotFather
TELEGRAM_BOT_NAME=TradeFrame Notifications
TELEGRAM_BOT_USERNAME=TradeFrameDW_Bot

# Supabase Configuration
SUPABASE_URL=https://ssvazdgnmatbdynkhkqo.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Email Configuration (опционально, для email уведомлений)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_NAME=TradeFrame Notifications
SMTP_FROM_EMAIL=noreply@tradeframe.com
```

## 🗄️ Database Tools for Claude Code Agents

### SQL Direct Access Tool
**Location**: `tools/sql-direct.js`  
**Purpose**: Прямой доступ к базе данных Supabase для всех агентов

```bash
# Quick database diagnostics
node tools/sql-direct.js tables                    # List all tables
node tools/sql-direct.js describe equipment_templates  # Table structure  
node tools/sql-direct.js select equipment_templates    # Sample data

# Integration in code
import { executeSelect, describeTable } from './tools/sql-direct.js';
```

**Key Database Facts**:
- ✅ **Schema**: Uses `is_active` (boolean), NOT `status` (string)
- ✅ **IDs**: All UUIDs, not strings 
- ✅ **Access**: Service Role Key for development (full access)
- ✅ **Tables**: 8 main tables available (equipment_templates, equipment, networks, etc.)

See `tools/README.md` for complete documentation.

## 🔔 Система уведомлений и сообщений

TradeFrame Builder имеет две системы коммуникации с пользователями:
1. **Автоматические уведомления** - триггерные уведомления о событиях (пороги оборудования, офлайн, и т.д.)
2. **Broadcast сообщения** - ручная рассылка новостей и объявлений администраторами

### 🤖 Telegram Боты - ВАЖНО!

**⚠️ КРИТИЧНО: Используются ДВА РАЗНЫХ бота для PROD и TEST!**

**PRODUCTION Bot:**
- Username: @TradeFrameDW_Bot
- Token: `8049816280:AAEHimSlNiuyRIRA_sjrG9f78lvc9aprwa8`
- Назначение: Боевая среда prod.dataworker.ru
- Конфигурация: `/var/www/www-root/data/www/prod.dataworker.ru/server/.env`

**TEST Bot:**
- Username: @TradeFrameTest_Bot
- Token: `8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0`
- Назначение: Тестовая среда testtf.dataworker.ru
- Конфигурация: `/var/www/www-root/data/www/testTF.dataworker.ru/server/.env`

**Почему разные боты?**
1. Разделение пользователей - тестовые и production подписки не пересекаются
2. Разные базы данных - у PROD и TEST разные Supabase таблицы
3. Предотвращение конфликтов 409 - два сервера не конфликтуют за одного бота
4. Безопасность - компрометация TEST не затрагивает PROD

**⚠️ ВАЖНО для локальной разработки:**
- НЕ используйте PROD токен в локальном `server/.env`
- Создайте отдельный DEV бот или используйте TEST токен
- Иначе возникнет конфликт 409 (два процесса читают обновления одного бота)

### 📨 Система Broadcast Сообщений (NEW!)

Позволяет администраторам отправлять новостные сообщения и объявления пользователям через Telegram Bot и Email.

**Страница**: `/network/broadcast-messages`

**Возможности:**
- ✅ Создание и отправка сообщений через UI
- ✅ Выбор каналов доставки (Telegram, Email, оба)
- ✅ Выбор получателей (все, по ролям, конкретные пользователи)
- ✅ Типы сообщений: новости, объявления, оповещения, техобслуживание
- ✅ Приоритеты: низкий, средний, высокий, критический
- ✅ Сохранение черновиков
- ✅ История отправленных сообщений
- ✅ Статистика доставки (отправлено/доставлено/ошибки)
- ✅ Markdown форматирование

**База данных:**
- `broadcast_messages` - сообщения для рассылки
- `message_recipients` - получатели с статусами доставки
- `message_templates` - шаблоны сообщений
- `message_attachments` - вложения

**Backend API** (`/api/messages/*`):
- `GET /api/messages` - список сообщений
- `POST /api/messages` - создать сообщение
- `POST /api/messages/:id/send` - отправить сообщение
- `GET /api/messages/:id/stats` - статистика доставки

**Frontend:**
- `src/pages/BroadcastMessages.tsx` - страница отправки
- `src/services/messageService.ts` - API клиент
- `src/types/message.ts` - TypeScript типы

📖 **Подробная инструкция**: `BROADCAST_MESSAGES_SETUP.md`

### 🔔 Автоматические уведомления

TradeFrame Builder имеет полнофункциональную систему автоматических уведомлений с проверками по расписанию и мгновенной доставкой через Telegram и Email.

### Архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - UserNotificationSettings.tsx                          │
│  - NotificationRules.tsx                                 │
│  - notificationService.ts                                │
└────────────┬────────────────────────────────────────────┘
             │ HTTP /api/telegram/*
             ↓
┌─────────────────────────────────────────────────────────┐
│              BACKEND PROXY (Express :3001)               │
│  - routes/telegram.js (API endpoints)                    │
│  - telegram-bot.js (polling mode)                        │
│  - services/notificationEngine.js (ядро проверок)        │
│  - services/notificationScheduler.js (cron)              │
│  - services/emailService.js (nodemailer)                 │
│  - services/telegramService.js (Bot API)                 │
└────────────┬───────────────────────────┬─────────────────┘
             │                           │
             ↓ Supabase Client           ↓ Telegram Bot API
┌─────────────────────────┐   ┌─────────────────────────┐
│   SUPABASE DATABASE     │   │    TELEGRAM BOT         │
│  - user_notification_   │   │  @TradeFrameDW_Bot      │
│    settings             │   │  - /start [code]        │
│  - telegram_link_codes  │   │  - /help                │
│  - notification_rules   │   │  - /status              │
│  - notifications        │   │  - /unlink              │
│  - *_subscriptions      │   └─────────────────────────┘
└─────────────────────────┘
```

### Компоненты Backend (server/)

**Основные файлы:**
- `index.js` - Главный Express сервер, запускает Telegram Bot и планировщик
- `routes/telegram.js` - API endpoints для управления уведомлениями
- `telegram-bot.js` - Telegram Bot с командами (/start, /help, /status, /unlink)
- `services/notificationEngine.js` - Ядро обработки правил и отправки
- `services/notificationScheduler.js` - Автоматические проверки по расписанию (node-cron)
- `services/emailService.js` - Отправка email через Nodemailer
- `services/telegramService.js` - Отправка Telegram уведомлений

**API Endpoints (`/api/telegram/*`):**
- `POST /generate-link-code` - Генерация кода привязки (8 символов, срок 24 часа)
- `POST /save-settings` - Сохранение настроек пользователя
- `GET /get-settings/:userId` - Получение настроек
- `POST /save-subscription` - Сохранение подписки на тип события
- `GET /get-subscriptions/:userId` - Получение всех подписок
- `POST /send-test-notification` - Отправка тестового уведомления

### Компоненты Frontend (src/)

**Страницы:**
- `src/pages/UserNotificationSettings.tsx` - Настройки уведомлений пользователя
  - Email настройки (адрес, вкл/выкл)
  - Telegram настройки (привязка, отвязка, тест)
  - Режим "Не беспокоить" (время начала/конца)
  - Подписки на типы событий
- `src/pages/NotificationRules.tsx` - Управление правилами уведомлений

**Сервисы:**
- `src/services/notificationService.ts` - API клиент для работы с уведомлениями
- `src/types/notification.ts` - TypeScript типы и интерфейсы

### Таблицы Supabase

**user_notification_settings** - Настройки уведомлений пользователя
- Email: `email_enabled`, `email_address`, `email_verified`
- Telegram: `telegram_enabled`, `telegram_chat_id`, `telegram_username`, `telegram_verified`
- DND: `dnd_enabled`, `dnd_start`, `dnd_end`, `dnd_allow_critical`

**telegram_link_codes** - Временные коды привязки Telegram
- `code` - 8-символьный код (A-Z0-9)
- `expires_at` - срок действия 24 часа
- `used` - флаг использования

**notification_rules** - Правила автоматических проверок
- `type` - тип проверки (bill_acceptor_threshold, equipment_offline и т.д.)
- `schedule_type` - тип расписания (cron, interval, realtime)
- `is_active` - активность правила

**notifications** - История уведомлений
- `type`, `title`, `message`, `priority`
- `status` - pending, sent, read, archived, failed
- `channels` - каналы доставки (email, telegram)

**user_notification_subscriptions** - Подписки пользователей на типы событий
**notification_delivery_log** - Журнал доставки уведомлений
**role_notification_subscriptions** - Подписки на уровне ролей

### Типы уведомлений

- **bill_acceptor_threshold** - Пороги купюроприемника (заполнение)
- **equipment_offline** - Оборудование недоступно
- **low_fuel_level** - Критически низкий уровень топлива
- **shift_not_closed** - Смена не закрыта в установленное время

### Каналы доставки

**Telegram:**
- Бот: @TradeFrameDW_Bot
- Режим: Polling (не webhook)
- Команды:
  - `/start [code]` - Привязка аккаунта по 8-символьному коду
  - `/help` - Справка по использованию
  - `/status` - Проверка статуса привязки и подписок
  - `/unlink` - Отвязка Telegram аккаунта

**Email:**
- SMTP через Nodemailer
- Требует настройки SMTP_* переменных в `server/.env`

### Планировщик автоматических проверок

Использует `node-cron` для периодических проверок:

```javascript
// Проверка купюроприемников - каждые 6 часов
'0 */6 * * *' - 00:00, 06:00, 12:00, 18:00

// Проверка offline оборудования - каждые 30 минут
'*/30 * * * *' - каждые 30 минут

// Проверка уровня топлива - каждые 4 часа
'0 */4 * * *' - 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
```

### Запуск системы уведомлений

**Development:**
```bash
cd server
npm run dev
```

**Production (PM2):**
```bash
cd server
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs tradeframe-backend-proxy
```

**Проверка работы:**
```bash
# Health check
curl http://localhost:3001/health

# Проверка Telegram Bot
# Отправьте /start в @TradeFrameDW_Bot
```

### Процесс привязки Telegram

1. Пользователь открывает `/settings/notifications` в UI
2. Нажимает "Привязать Telegram"
3. Frontend вызывает `POST /api/telegram/generate-link-code`
4. Получает ссылку вида `https://t.me/TradeFrameDW_Bot?start=ABC12XYZ`
5. Пользователь открывает ссылку и нажимает START
6. Бот получает код, проверяет в таблице `telegram_link_codes`
7. Сохраняет `telegram_chat_id` в `user_notification_settings`
8. Помечает код как использованный
9. Отправляет подтверждение в Telegram

### Отправка уведомлений

**Автоматическая отправка:**
1. Планировщик запускает проверку по расписанию
2. `notificationEngine.processAllRules()` проверяет активные правила
3. Для каждого правила выполняется специфическая проверка (например, `checkBillAcceptorThresholds()`)
4. При обнаружении события создается уведомление в БД
5. `getRecipients()` находит пользователей с активными подписками
6. `sendToChannel()` отправляет через email/telegram
7. Результат логируется в `notification_delivery_log`

**Ручная отправка:**
```bash
# Тест из UI
Настройки → Уведомления → "Отправить тестовое уведомление"

# Тест из консоли
node server/test-telegram-notification.js
```

### Приоритеты уведомлений

- **critical** 🔴 - Критические (требуют немедленного внимания)
- **high** 🟠 - Высокие (важные события)
- **medium** 🟡 - Средние (информационные)
- **low** 🔵 - Низкие (общие уведомления)

### Режим "Не беспокоить"

- Настраивается через UI (время начала и конца)
- По умолчанию блокирует все уведомления
- `dnd_allow_critical` - разрешает критические уведомления
- Проверяется перед отправкой в `notificationEngine.sendToChannel()`

## Обзор архитектуры

TradeFrame Builder v1.5.16 - платформа управления торговыми сетями АЗС на базе React:

- **Vite** - Инструмент сборки и dev-сервер
- **React 18** с TypeScript
- **React Router v6** - Маршрутизация со страницами в `src/pages/`
- **shadcn/ui компоненты** - UI компоненты в `src/components/ui/`
- **Tailwind CSS** - Стилизация с кастомными цветами торговой платформы
- **React Query (TanStack Query)** - Загрузка данных и кэширование
- **React Hook Form + Zod** - Обработка форм и валидация
- **Supabase** - База данных и аутентификация
- **PWA (vite-plugin-pwa)** - Progressive Web App с офлайн поддержкой и возможностью установки

### 📋 Статус реализации функций

**✅ АКТИВНЫЕ РАЗДЕЛЫ (полностью реализованы):**
- **Торговые сети**: Обзор (`/network/overview`), Операции (`/network/operations-transactions`) - **РЕАЛЬНЫЕ данные**
- **Торговая точка**: Цены (`/point/prices`), Резервуары (`/point/tanks`), Оборудование (`/point/equipment`) - **РЕАЛЬНЫЕ данные**
- **Администрирование**: Сети и ТТ, Пользователи, Роли, Инструкции, Правовые документы, Журнал аудита - **РЕАЛЬНЫЕ данные**
- **Настройки**: API CTC настройки, Внешняя БД, **Уведомления пользователя** (`/settings/notifications`) - **РЕАЛЬНЫЕ данные**
- **Система уведомлений**: Telegram Bot (@TradeFrameDW_Bot), Email, автоматические проверки, правила уведомлений - **ПОЛНОСТЬЮ РАБОТАЕТ**

**🚫 АРХИВНЫЕ РАЗДЕЛЫ (НЕ РЕАЛИЗОВАНЫ):**
- Оповещения сети, Сообщения, Сменные отчеты (в группе "РАЗНОЕ")
- История цен, остатки топлива, журнал оборудования
- Номенклатура, типы оборудования и компонентов

> **Важно:** Архивные разделы отображаются в меню в группе "РАЗНОЕ (НЕ ИСПОЛЬЗУЕТСЯ)" но не имеют функциональной реализации. См. `src/components/layout/AppSidebar.tsx` строки 157-161.

## Структура проекта

### Ключевые директории

**Frontend**:
- `src/pages/` - Компоненты маршрутов, подключенные в App.tsx
- `src/components/` - Переиспользуемые компоненты, организованные по функциям
- `src/services/` - API клиенты и сервисный слой
  - `src/services/stsProxyClient.ts` - Клиент для работы с backend proxy (используется вместо прямых запросов к STS API)
- `src/contexts/` - React контексты (Auth, Selection)
- `src/hooks/` - Кастомные React хуки
- `src/types/` - Определения типов TypeScript
- `src/config/` - Конфигурация (версия приложения в `version.ts`)

**Backend Proxy Server**:
- `server/index.js` - Главный файл Express сервера (порт 3001), запускает Telegram Bot и планировщик
- `server/routes/sts.js` - Маршруты для проксирования STS API запросов (JWT авторизация)
- `server/routes/telegram.js` - API endpoints для системы уведомлений
- `server/telegram-bot.js` - Telegram Bot с командами (/start, /help, /status, /unlink)
- `server/services/notificationEngine.js` - Ядро системы уведомлений
- `server/services/notificationScheduler.js` - Планировщик автоматических проверок
- `server/services/emailService.js` - Отправка email уведомлений
- `server/services/telegramService.js` - Отправка Telegram уведомлений
- `server/.env` - Переменные окружения (STS API, Telegram Bot, Supabase, SMTP)
- `server/package.json` - Зависимости: express, cors, axios, dotenv, @supabase/supabase-js, node-telegram-bot-api, node-cron, nodemailer
- `server/ecosystem.config.cjs` - PM2 конфигурация для production

### Паттерн маршрутизации
Все маршруты определены в `src/App.tsx`:
- Админ маршруты: `/admin/*`
- Маршруты настроек: `/settings/*`
- Сетевые маршруты: `/network/*`
- Маршруты точек: `/point/*`

### Интеграция API

**Гибридная система доступа к данным:**

#### 🔐 Внутренняя аутентификация (Supabase)
- **База пользователей**: PostgreSQL через Supabase REST API (**РЕАЛЬНЫЕ данные**)
- **Токены**: Генерируются локально, срок действия 1 час с автообновлением
- **Конфигурация**: `src/services/auth/authService.ts` (строки 38-39 - URL и ключи)
- **Обновление**: При 401 ошибке через сохраненные учетные данные
- **⚠️ ВАЖНО**: Торговые сети, торговые точки, пользователи и роли ВСЕГДА используют реальные данные, не mock

#### 🌐 Внешний API торговой сети (STS)
- **Назначение**: Получение данных по работе торговой сети и POS-системы
- **Аутентификация**: JWT Bearer Token (автоматическое получение через `/v1/login`)
- **Swagger документация**: https://pos.autooplata.ru/tms/docs (OpenAPI 3.1.0)
- **Backend Proxy**: `server/routes/sts.js` - автоматическое управление JWT токенами
- **Переменные окружения** (в `server/.env`):
  - `STS_API_URL` - URL API (https://pos.autooplata.ru/tms)
  - `STS_API_USERNAME` - логин для получения JWT
  - `STS_API_PASSWORD` - пароль для получения JWT
  - `ALLOWED_ORIGINS` - разрешенные домены для CORS
- **Особенности**:
  - JWT токен обновляется автоматически каждые 18 минут (срок действия 20 минут)
  - Все запросы от frontend идут через backend proxy на `http://localhost:3001/api/sts/*`
  - Backend proxy добавляет JWT токен в заголовок `Authorization: Bearer {token}`

**Доступные endpoints**:
- `/v1/transactions`, `/v2/transactions` - Транзакции
- `/v1/info` - Статусы ТО
- `/v1/tanks` - Резервуары
- `/v1/shifts` - **НОВОЕ**: Список смен
- `/v1/report/receipts` - **НОВОЕ**: Поступления нефтепродуктов
- `/v1/report/shift_report` - **НОВОЕ**: Сменный отчет (ПСМ, резервуары, продажи, наличные)
- `/v1/prices`, `/v1/schedule/prices/{station_number}` - Управление ценами
- `/v1/control/*` - Управление терминалами и сменами

> См. полную документацию в `API_INTEGRATION.md`

#### 🛠️ Управление учетными данными
- **Конфигурация подключений**: UI настройки `/settings/external-database`
- **Переключение источников**: Supabase, внешний API, mock данные
- **Автотестирование**: Проверка доступности подключений
- **Безопасность**: Учетные данные не хранятся в коде, только в переменных окружения

#### 📡 HTTP клиенты
- `src/services/httpClients.ts`: Retry логика, Idempotency-Key, Trace-Id
- `src/services/auth/authService.ts`: Простое SHA-256 хеширование паролей
- Автоматическая обработка токенов из localStorage/sessionStorage

## Паттерны компонентов

### UI Компоненты
- Все UI примитивы из shadcn/ui в `src/components/ui/`
- Следуйте существующим паттернам при создании новых компонентов
- Используйте CVA (class-variance-authority) для вариантов компонентов
- Применяйте утилитарные классы Tailwind с помощником `cn()`

### Компоненты форм
- Используйте React Hook Form со схемами Zod
- Компоненты форм используют обертку `<Form>` из `src/components/ui/form.tsx`
- Схемы валидации должны быть определены с помощью Zod

### Загрузка данных
- Используйте хуки React Query для API вызовов
- Сервисный слой обрабатывает HTTP запросы
- Состояния загрузки обрабатываются с помощью Skeleton компонентов
- Состояния ошибок используют компоненты ErrorState/EmptyState

## Конфигурация TypeScript

- Алиас пути `@/*` указывает на `./src/*`
- Мягкие настройки TypeScript (нет неявного any, неиспользуемые параметры разрешены)
- Определения типов должны быть в `src/types/`

## Конвенции стилизации

- Tailwind CSS для всей стилизации
- Кастомные цвета темы: trade.blue, trade.purple, trade.green, trade.orange
- Цвета состояний: success, warning, error
- Ширина контейнера установлена на 100% с отступом 1.5rem
- Используйте существующие переменные теней и радиуса границ

## 🚀 Развертывание

### Трехуровневая система окружений

TradeFrame Builder использует **3 окружения** для безопасной разработки и деплоя:

```
DEVELOPMENT (localhost) → TEST (GitHub Pages) → PRODUCTION (prod.dataworker.ru)
```

#### 1️⃣ DEVELOPMENT (Локальная разработка)
- **URL**: http://127.0.0.1:3000/
- **Backend**: http://localhost:3001/
- **Service Worker**: ❌ ОТКЛЮЧЕН
- **PWA**: ❌ НЕТ
- **HMR**: ✅ ДА (Vite Hot Reload)
- **Назначение**: Быстрая разработка и отладка

```bash
# Запуск
cd server && node index.js  # Terminal 1
npm run dev                  # Terminal 2
```

#### 2️⃣ TEST (Тестовый сервер)
- **URL**: https://electro-interfaces.github.io/tradeframe-builder/
- **Git Remote**: `test` (tradeframe-builder repo)
- **Service Worker**: ✅ ВКЛЮЧЕН
- **PWA**: ✅ ПОЛНОСТЬЮ РАБОТАЕТ
- **Данные**: РЕАЛЬНЫЕ (Supabase + STS API)
- **Назначение**: Тестирование с полным PWA перед production

```bash
# Деплой на TEST
git add . && git commit -m "feat: описание"
git push test main  # GitHub Actions автоматически соберет и задеплоит
```

#### 3️⃣ PRODUCTION (Боевой сервер)
- **URL**: https://prod.dataworker.ru/
- **Git Remote**: `prod` (TradeControl repo)
- **Service Worker**: ✅ ВКЛЮЧЕН
- **PWA**: ✅ ПОЛНОСТЬЮ РАБОТАЕТ
- **Данные**: РЕАЛЬНЫЕ (Supabase + STS API)
- **Назначение**: Работа с реальными пользователями

```bash
# Деплой на PRODUCTION (ТОЛЬКО после успешного тестирования на TEST!)
git push prod main
```

### Рекомендуемый Workflow

```
1. Разработка на localhost (без Service Worker)
   ↓
2. Деплой на TEST → Тестирование с PWA
   ↓
3. Деплой на PRODUCTION (только после успешных тестов)
```

📖 **Полная документация**: см. [DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md)

## Важные заметки

- Текущая версия: **v1.5.16** (управляется через `src/config/version.ts`)
- Независимый проект (больше не связан с Lovable.dev)
- Компонентный таггер активен в режиме разработки
- Поддерживает PM2 деплой с `ecosystem.config.js` и `server/ecosystem.config.cjs`
- Express сервер доступен для production развертывания
- **Система уведомлений полностью работает**: Telegram Bot (@TradeFrameDW_Bot), Email, автоматические проверки
- **Backend Proxy обязателен**: Для работы системы уведомлений и STS API необходим запущенный `server/index.js`
- **RLS политики Supabase**: Backend использует SERVICE_KEY для обхода RLS, frontend использует ANON_KEY с JWT токенами пользователей

## Рабочий язык

**ОБЯЗАТЕЛЬНО**: Все взаимодействие с агентами Claude Code ведется на **русском языке**. Планы, отчеты, комментарии, коммиты - все на русском.

## 📱 PWA (Progressive Web App)

TradeFrame Builder поддерживает PWA функциональность с помощью `vite-plugin-pwa`.

### Основные возможности

- ✅ **Автоматическое обновление** - Service Worker обновляется при новых версиях
- ✅ **Офлайн работа** - кэширование статических ресурсов и API запросов
- ✅ **Установка на устройства** - работает как нативное приложение на Android, iOS, Desktop
- ✅ **Оптимизированное кэширование**:
  - API запросы: стратегия `NetworkFirst` (24 часа)
  - Google Fonts: стратегия `CacheFirst` (1 год)
  - Статические ресурсы: автоматическое кэширование

### Конфигурация

**Файлы:**
- `vite.config.ts` - конфигурация PWA плагина
- `public/pwa-192x192.png` - стандартная иконка
- `public/pwa-512x512.png` - большая иконка (также maskable)
- `dist/manifest.webmanifest` - генерируется автоматически при сборке
- `dist/sw.js` - Service Worker
- `dist/workbox-*.js` - библиотека Workbox

**Манифест:**
```json
{
  "name": "TradeFrame Builder",
  "short_name": "TradeFrame",
  "description": "Платформа управления торговыми сетями АЗС",
  "theme_color": "#1e293b",
  "background_color": "#0f172a",
  "display": "standalone"
}
```

### Тестирование PWA

```bash
# Сборка с PWA
npm run build

# Предпросмотр production сборки
npm run preview

# Проверка в Chrome DevTools
# Application → Service Workers
# Application → Manifest
# Lighthouse → Run audit (PWA категория)
```

### Установка на устройства

- **Desktop (Chrome/Edge):** иконка установки в адресной строке
- **Android:** Chrome → Меню → "Добавить на главный экран"
- **iOS:** Safari → Поделиться → "На экран Домой"

📖 **Полная документация:** `PWA_SETUP.md`

## 🚫 Запреты на код

**СТРОГО ЗАПРЕЩЕНО**:
- **НЕ добавлять `console.log()` в код** при любых изменениях и дополнениях
- Не использовать отладочные выводы в консоль без явного запроса пользователя
- Если необходима отладка - использовать комментарии или просить разрешения у пользователя