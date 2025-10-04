# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом данного репозитория.

## 🚀 Команды разработки

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера (порт 3000)
npm run dev

# Сборка для production
npm run build

# Сборка для разработки
npm run build:dev

# Запуск линтера
npm run lint

# Предпросмотр production сборки
npm run preview
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

### 📋 Статус реализации функций

**✅ АКТИВНЫЕ РАЗДЕЛЫ (полностью реализованы):**
- **Торговые сети**: Обзор (`/network/overview`), Операции (`/network/operations-transactions`) - **РЕАЛЬНЫЕ данные**
- **Торговая точка**: Цены (`/point/prices`), Резервуары (`/point/tanks`), Оборудование (`/point/equipment`) - **РЕАЛЬНЫЕ данные**
- **Администрирование**: Сети и ТТ, Пользователи, Роли, Инструкции, Правовые документы, Журнал аудита - **РЕАЛЬНЫЕ данные**
- **Настройки**: API CTC настройки, Внешняя БД

**🚫 АРХИВНЫЕ РАЗДЕЛЫ (НЕ РЕАЛИЗОВАНЫ):**
- Оповещения сети, Сообщения, Сменные отчеты (в группе "РАЗНОЕ")
- История цен, остатки топлива, журнал оборудования
- Номенклатура, типы оборудования и компонентов

> **Важно:** Архивные разделы отображаются в меню в группе "РАЗНОЕ (НЕ ИСПОЛЬЗУЕТСЯ)" но не имеют функциональной реализации. См. `src/components/layout/AppSidebar.tsx` строки 157-161.

## Структура проекта

### Ключевые директории
- `src/pages/` - Компоненты маршрутов, подключенные в App.tsx
- `src/components/` - Переиспользуемые компоненты, организованные по функциям
- `src/services/` - API клиенты и сервисный слой
- `src/contexts/` - React контексты (Auth, Selection)
- `src/hooks/` - Кастомные React хуки
- `src/types/` - Определения типов TypeScript
- `src/config/` - Конфигурация (версия приложения в `version.ts`)

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
- **Аутентификация**: HTTP Basic Auth
- **Swagger документация**: https://pos.autooplata.ru/tms/docs (OpenAPI 3.1.0)
- **Конфигурация**: `src/services/apiConfigService.ts` (строки 124, 136-137)
- **Переменные окружения**:
  - `VITE_STS_API_URL` - URL API
  - `VITE_STS_API_USERNAME` - логин для доступа
  - `VITE_STS_API_PASSWORD` - пароль для доступа

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

## Развертывание

### Система двойного репозитория
- **Demo (GitHub Pages)**: `electro-interfaces/tradeframe-builder` → https://electro-interfaces.github.io/tradeframe-builder/
- **Production**: `electro-interfaces/TradeControl` → https://prod.dataworker.ru/

### Автоматический деплой
- **Demo**: При push в ветку `main` автоматически происходит деплой на GitHub Pages через GitHub Actions
- **Production**: Имеет собственную схему деплоя на рабочий домен https://prod.dataworker.ru/

## Важные заметки

- Текущая версия: **v1.5.16** (управляется через `src/config/version.ts`)
- Независимый проект (больше не связан с Lovable.dev)
- Компонентный таггер активен в режиме разработки
- Поддерживает PM2 деплой с `ecosystem.config.js`
- Express сервер доступен для production развертывания

## Рабочий язык

**ОБЯЗАТЕЛЬНО**: Все взаимодействие с агентами Claude Code ведется на **русском языке**. Планы, отчеты, комментарии, коммиты - все на русском.