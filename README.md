# 🏪 TradeControl Builder

Платформа управления торговыми сетями АЗС с полной интеграцией Supabase.

## 📋 Статус функций

### ✅ Реализованные разделы
- **Торговые сети**: Обзор, операции и транзакции (**РЕАЛЬНЫЕ данные**)
- **Торговые точки**: Цены, резервуары, оборудование (**РЕАЛЬНЫЕ данные**)
- **Администрирование**: Управление сетями, **реальными пользователями**, **реальными ролями**
- **Настройки**: API STS, подключение к внешней БД
- **Профиль пользователя**: Полное управление профилем и правами (**реальные данные**)

> ⚠️ **ВАЖНО**: Торговые сети, торговые точки, пользователи и роли используют только РЕАЛЬНЫЕ данные, не демо

### 🚫 Неиспользуемые разделы
Следующие разделы **НЕ РЕАЛИЗОВАНЫ** в текущей версии:
- История цен, остатки топлива, журнал оборудования
- Оповещения сети, сообщения, сменные отчеты
- Номенклатура, типы оборудования и компонентов
- Шаблоны API команд, регламенты
- Инструменты миграции и настройки БД

📖 **Подробности**: см. `UNUSED_FEATURES.md`

## 🚀 Quick Start

### Локальная разработка

```bash
# 1. Backend Proxy (порт 3001) - запускаем ПЕРВЫМ
cd server
node index.js

# 2. Frontend (порт 3000) - в новом терминале
npm run dev
```

### Трехуровневая система окружений

```
DEVELOPMENT (localhost) → TEST (GitHub Pages) → PRODUCTION (prod.dataworker.ru)
```

**Подробнее**: см. [DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md) и [QUICKSTART.md](./QUICKSTART.md)

## 🗄️ Database Tools for Claude Code Agents

### SQL Direct Access
Прямой доступ к базе данных для всех агентов Claude Code:

```bash
# Список таблиц
node tools/sql-direct.js tables

# Структура таблицы
node tools/sql-direct.js describe equipment_templates

# Данные из таблицы
node tools/sql-direct.js select equipment_templates
```

**Полная документация**: См. `tools/README.md`

## 🌐 STS API Integration

### Swagger документация
- **URL**: https://pos.autooplata.ru/tms/docs
- **Формат**: OpenAPI 3.1.0

### Новые endpoints для отчетности
- **`/v1/shifts`** - Список смен с информацией по ПСМ
- **`/v1/report/receipts`** - Поступления нефтепродуктов
- **`/v1/report/shift_report`** - Полный сменный отчет (ПСМ, резервуары, продажи, наличные)

**Реализация**:
- TypeScript типы: `src/types/shifts.ts`
- Сервис: `src/services/shiftsService.ts`
- Документация: `API_INTEGRATION.md`

## Project info

**URL**: https://lovable.dev/projects/a07dc2aa-b36e-4a02-8c1d-c7c0906efdc5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a07dc2aa-b36e-4a02-8c1d-c7c0906efdc5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## 🚀 Развертывание проекта

### Деплой на TEST окружение

```bash
git add .
git commit -m "feat: описание изменений"
git push test main  # GitHub Actions автоматически соберет и задеплоит
```

**URL**: https://electro-interfaces.github.io/tradeframe-builder/

### Деплой на PRODUCTION

```bash
# ТОЛЬКО после успешного тестирования на TEST!
git push prod main
```

**URL**: https://prod.dataworker.ru/

📖 **Полная документация по деплою**: [DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md)

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Быстрый старт (локально)

- Установка зависимостей: `npm install`
- Запуск в dev-режиме: `npm run dev`
- Сборка: `npm run build`
- Предпросмотр: `npm run preview`
- Линтинг: `npm run lint`
- Тесты: `npm test` (пока заглушка)

## Acceptance Criteria (по умолчанию)

- Сборка успешна: `npm run build` завершается без ошибок.
- Линтинг чистый: `npm run lint` без ошибок (warning допустимы).
- Dev-сервер поднимается и основные страницы открываются без ошибок в консоли.
- Критические пути работают: загрузка демо-данных, список сетей, операции, поиск.
- Изменения не ломают существующие сценарии (ручная быстрая проверка).

## Конфигурация Codex CLI

В `.codex-cli.json` зафиксированы дефолты для ускоренной работы:

- Язык ответов/планов: русский, принудительно.
- Approval-политика: `never`.
- Песочница: `danger-full-access`.
- Сеть: `enabled`.

При необходимости можно временно переопределить эти параметры на время конкретного сеанса.

## Порядок согласования (Approvals)

- На старте: агент показывает краткий план этапов и ждёт явного согласования.
- После согласования: выполняет все этапы без дополнительных запросов (policy: `never`).
- Изменение плана: при необходимости агент предложит обновлённый план одним блоком на переутверждение.
