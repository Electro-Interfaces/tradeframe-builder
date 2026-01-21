---
name: tradeframe-expert
description: Эксперт по проекту TradeFrame Builder. Используй при работе с резервуарами, сменами, оборудованием, STS API, уведомлениями и другими компонентами проекта.
---

# TradeFrame Builder - Эксперт проекта

## Архитектура проекта

### Frontend (React + TypeScript)
- **Vite** - сборка и dev-сервер (порт 3000)
- **React 18** с TypeScript
- **shadcn/ui** - UI компоненты в `src/components/ui/`
- **Tailwind CSS** - стилизация
- **React Query** - загрузка данных и кэширование
- **Supabase** - база данных и аутентификация

### Backend Proxy (Express)
- **Express сервер** (порт 3001)
- **JWT авторизация** для STS API
- **Telegram Bot** для уведомлений
- **Email сервис** через Nodemailer

## Ключевые директории

```
src/
├── pages/           # Страницы приложения
├── components/      # React компоненты
├── services/        # API клиенты
├── contexts/        # React контексты (Auth, Selection)
├── hooks/           # Кастомные хуки
├── types/           # TypeScript типы
└── config/          # Конфигурация (version.ts!)

server/
├── index.js         # Главный Express сервер
├── routes/          # API маршруты (sts.js, telegram.js)
├── services/        # Бэкенд сервисы
└── .env             # Переменные окружения (НЕ коммитить!)
```

## Важные файлы

| Файл | Назначение |
|------|-----------|
| `src/config/version.ts` | **Версия приложения** - обновлять при изменениях! |
| `server/.env` | Переменные окружения (STS API, Telegram, Supabase) |
| `vite.config.ts` | Конфигурация Vite и прокси |
| `CLAUDE.md` | Инструкции для Claude Code |

## Запуск проекта

```bash
# 1. Backend Proxy (ПЕРВЫМ!)
cd server && node index.js

# 2. Frontend (в новом терминале)
npm run dev

# Проверка
curl http://localhost:3001/health   # Backend
# Frontend: http://127.0.0.1:3000/
```

## Работа с STS API

**Путь запросов:**
```
Frontend (3000) → Vite Proxy → Backend Proxy (3001) → STS API
```

**Основные endpoints:**
- `/v1/tanks` - Резервуары
- `/v1/shifts` - Смены
- `/v1/transactions` - Транзакции
- `/v1/report/shift_report` - Сменный отчет
- `/v1/prices` - Цены

**Клиент:** `src/services/stsProxyClient.ts`

## Система уведомлений

**Компоненты:**
- `server/telegram-bot.js` - Telegram Bot (@TradeFrameDW_Bot)
- `server/services/notificationEngine.js` - Ядро уведомлений
- `server/services/emailService.js` - Email уведомления

**Типы уведомлений:**
- `bill_acceptor_threshold` - Пороги купюроприемника
- `equipment_offline` - Оборудование недоступно
- `low_fuel_level` - Низкий уровень топлива
- `shift_not_closed` - Смена не закрыта

## Деплой

```bash
# TEST (GitHub Pages)
git push test main

# PRODUCTION (автоматически через GitHub Actions)
git push prod main
```

## Правила разработки

1. **Версия** - обновлять `src/config/version.ts` при изменениях
2. **Типы** - использовать TypeScript типы из `src/types/`
3. **API** - все запросы через `stsProxyClient.ts`
4. **Стили** - Tailwind CSS, не инлайн стили
5. **Компоненты** - shadcn/ui из `src/components/ui/`

## Частые задачи

### Добавить новую страницу
1. Создать компонент в `src/pages/`
2. Добавить маршрут в `src/App.tsx`
3. Добавить пункт меню в `src/components/layout/AppSidebar.tsx`

### Добавить новый API endpoint
1. Добавить маршрут в `server/routes/sts.js`
2. Создать функцию в `src/services/stsProxyClient.ts`
3. Добавить TypeScript типы в `src/types/`

### Обновить версию
1. Изменить версию в `src/config/version.ts`
2. Добавить запись в CHANGELOG (если есть)
