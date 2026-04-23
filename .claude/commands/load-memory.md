# Load Memory - Загрузка Knowledge Graph

Загрузи в Knowledge Graph основную информацию о проекте TradeFrame Builder.

## Действия

1. **Создай сущности (entities) проекта:**
   - TradeFrame Builder (тип: Project)
   - Frontend (тип: Module)
   - Backend Proxy (тип: Module)
   - Supabase Database (тип: Database)
   - STS API (тип: External API)
   - Notification System (тип: System)
   - PWA (тип: Feature)

2. **Добавь наблюдения (observations) для каждой сущности:**

   **TradeFrame Builder:**
   - Версия: v1.5.16
   - Назначение: Платформа управления торговыми сетями АЗС
   - Технологии: React 18, TypeScript, Vite, Tailwind CSS
   - Окружения: Development (localhost), Test (GitHub Pages), Production (prod.dataworker.ru)

   **Frontend:**
   - Порт: 3000
   - Dev-сервер: Vite
   - UI библиотека: shadcn/ui
   - State management: React Query (TanStack Query)
   - Routing: React Router v6
   - Формы: React Hook Form + Zod

   **Backend Proxy:**
   - Порт: 3001
   - Сервер: Express.js
   - Файл запуска: server/index.js
   - JWT авторизация для STS API (обновление каждые 18 минут)
   - Запускается ПЕРВЫМ перед frontend

   **Supabase Database:**
   - URL: https://ssvazdgnmatbdynkhkqo.supabase.co
   - Назначение: Пользователи, роли, настройки, уведомления
   - Основные таблицы: user_notification_settings, telegram_link_codes, notification_rules, broadcast_messages

   **STS API:**
   - URL: https://pos.autooplata.ru/tms
   - Swagger: https://pos.autooplata.ru/tms/docs
   - Аутентификация: JWT Bearer Token
   - Основные endpoints: /v1/transactions, /v1/tanks, /v1/shifts, /v1/prices

   **Notification System:**
   - Telegram Bot PROD: @TradeFrameDW_Bot (token хранить только в operator vault)
   - Telegram Bot TEST: @TradeFrameTest_Bot (token хранить только в operator vault)
   - Email: Nodemailer через SMTP
   - Планировщик: node-cron (купюроприемники каждые 6ч, offline каждые 30мин, топливо каждые 4ч)
   - Команды бота: /start [code], /help, /status, /unlink

   **PWA:**
   - Plugin: vite-plugin-pwa
   - Service Worker: Workbox
   - Кэширование: NetworkFirst для API (24ч), CacheFirst для шрифтов (1год)
   - Manifest: dist/manifest.webmanifest
   - Иконки: pwa-192x192.png, pwa-512x512.png

3. **Создай связи (relations) между сущностями:**
   - TradeFrame Builder → contains → Frontend
   - TradeFrame Builder → contains → Backend Proxy
   - TradeFrame Builder → contains → PWA
   - Frontend → uses → Backend Proxy
   - Backend Proxy → connects_to → Supabase Database
   - Backend Proxy → connects_to → STS API
   - Backend Proxy → manages → Notification System
   - Notification System → uses → Supabase Database

4. **Добавь ключевые файлы и директории:**

   **Key Directories (тип: Directory):**
   - src/pages/ (страницы маршрутов)
   - src/components/ (переиспользуемые компоненты)
   - src/services/ (API клиенты)
   - server/routes/ (Express маршруты)
   - server/services/ (бизнес-логика backend)

   **Important Files (тип: File):**
   - CLAUDE.md (инструкции для Claude Code)
   - server/index.js (главный файл backend)
   - server/telegram-bot.js (Telegram Bot)
   - src/services/stsProxyClient.ts (клиент для STS API)
   - vite.config.ts (конфигурация Vite и PWA)
   - server/.env (переменные окружения)

5. **Создай связи для файлов:**
   - Backend Proxy → has_main_file → server/index.js
   - Notification System → uses → server/telegram-bot.js
   - Frontend → configured_by → vite.config.ts
   - Backend Proxy → configured_by → server/.env

После загрузки подтверди, что Knowledge Graph успешно создан и содержит все основные компоненты проекта.
