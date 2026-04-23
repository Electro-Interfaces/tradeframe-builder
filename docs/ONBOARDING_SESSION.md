# TradeFrame — Обзорная сессия архитектуры

> Материал для онбординга команды разработки.
> Задача: [TF-47](https://mag.youtrack.cloud/issue/TF-47)

---

## 1. Что такое TradeFrame

**Платформа управления торговыми сетями АЗС** — мониторинг, аналитика, управление ценами, сменами, оборудованием, купонами, резервуарами.

- **Production:** [prod.dataworker.ru](https://prod.dataworker.ru)
- **Test:** [testtf.dataworker.ru](https://testtf.dataworker.ru)
- **Репозиторий (test):** [Electro-Interfaces/tradeframe-builder](https://github.com/Electro-Interfaces/tradeframe-builder)
- **Репозиторий (prod):** [Electro-Interfaces/TradeControl](https://github.com/Electro-Interfaces/TradeControl)
- **Версия:** 2.1.2
- **Масштаб:** ~152k LOC, 235 компонентов, 31 страница

---

## 2. Команда

| Роль | Кто | Зона ответственности |
|------|-----|---------------------|
| Заказчик / Архитектор | МАГ (Михеев) | Требования, приоритеты, ревью, бизнес |
| Frontend Lead | Козик Артем | React, компоненты, страницы, дизайн-система |
| Backend Lead | Гаврилов Валерий | Express, PostgreSQL, API интеграции |
| Frontend | Куляпин Леонид | Подключается к задачам frontend |
| Frontend (позже) | Москаленков Артём | Усиление команды |

---

## 3. Стек технологий

### Frontend
| Что | Технология | Версия |
|-----|-----------|--------|
| Фреймворк | React | 18.3.1 |
| Сборщик | Vite | 5.4.19 |
| Язык | TypeScript | 5.9.3 |
| Стили | Tailwind CSS + shadcn/ui | 3.4.17 |
| Роутинг | React Router | 6.30.1 |
| Серверный стейт | React Query | 5.90.12 |
| Формы | React Hook Form + Zod | — |
| Графики | Recharts | — |

### Backend
| Что | Технология |
|-----|-----------|
| Сервер | Express 5.2 (Node.js) |
| БД | PostgreSQL (pg driver) |
| Процессы | PM2 |
| Безопасность | Helmet, rate-limiting, JWT |

### DevOps
| Что | Инструмент |
|-----|-----------|
| CI/CD | GitHub Actions |
| Тесты | Vitest (unit) + Playwright (E2E) |
| Линтинг | ESLint |
| Деплой | SCP → PM2 restart |

---

## 4. Архитектура — как всё связано

```
┌─────────────────────────────────────────────────────┐
│                    БРАУЗЕР                           │
│                                                     │
│  React SPA (Vite)                                   │
│  ├── React Router (страницы)                        │
│  ├── React Query (кэш серверных данных)             │
│  ├── Context API (Auth, Selection)                  │
│  └── stsProxyClient → /api/sts/*                    │
│                        /api/tradecorp/*             │
│                        /api/msto/*                  │
└────────────┬────────────────────────────────────────┘
             │ HTTP (localhost:3000 → proxy → :3001)
             ▼
┌─────────────────────────────────────────────────────┐
│              EXPRESS BACKEND (:3001)                 │
│                                                     │
│  Middleware: CORS → Helmet → Rate Limit → JWT Auth  │
│                                                     │
│  Routes (18 модулей):                               │
│  ├── /api/sts/*        → STS API (poscontrol)       │
│  ├── /api/tradecorp/*  → TradeCorp API              │
│  ├── /api/msto/*       → MSTO (онлайн-заказы)      │
│  ├── /api/auth/*       → JWT логин/токены           │
│  ├── /api/networks/*   → Управление сетями          │
│  ├── /api/trading-points/* → Торговые точки         │
│  ├── /api/users/*      → Пользователи               │
│  ├── /api/support/*    → Заявки/чат                  │
│  └── ... (ещё 10 модулей)                           │
│                                                     │
│  Services: Telegram бот, уведомления, планировщик   │
│  DB: PostgreSQL (pg pool)                           │
└────────────┬──────────┬──────────┬──────────────────┘
             │          │          │
             ▼          ▼          ▼
        ┌─────────┐ ┌───────┐ ┌──────────┐
        │ STS API │ │ MSTO  │ │TradeCorp │
        │poscontrol│ │онлайн │ │процессинг│
        │:8012    │ │:3000  │ │          │
        └─────────┘ └───────┘ └──────────┘
```

**Ключевой паттерн:** Frontend НИКОГДА не обращается к внешним API напрямую. Всё через backend proxy. Креденшалы хранятся только на сервере.

---

## 5. Структура проекта

```
TradeFrame/
├── src/                        # Frontend
│   ├── components/             # UI-компоненты (38 категорий)
│   │   ├── layout/             # MainLayout, Header, AppSidebar, BottomNav
│   │   ├── equipment/          # ← ЭТАЛОН дизайна
│   │   ├── prices/             # Карточки цен, история
│   │   ├── tanks/              # Резервуары, анализ, калибровка
│   │   ├── coupons/            # Купоны, фильтры, KPI
│   │   ├── operations/         # Операции, таблицы
│   │   ├── ui/                 # shadcn/ui примитивы (50+ компонентов)
│   │   └── ...                 # ещё 30+ категорий
│   ├── pages/                  # Страницы (31 шт.)
│   ├── hooks/                  # Кастомные хуки (53 шт.)
│   ├── services/               # API клиенты (96 файлов)
│   ├── contexts/               # React Context (Auth, Selection, Support)
│   ├── types/                  # TypeScript типы (26 файлов)
│   ├── utils/                  # Утилиты (47 файлов)
│   └── index.css               # Дизайн-токены (di-*)
├── server/                     # Backend
│   ├── index.js                # Express точка входа
│   ├── routes/                 # API маршруты (18 модулей)
│   ├── services/               # Бизнес-логика
│   ├── middleware/              # Auth, RBAC
│   ├── repositories/           # Слой данных (PostgreSQL)
│   └── db/                     # Пул подключений
├── docs/                       # Документация (20+ файлов)
├── e2e/                        # E2E тесты (Playwright)
├── .github/workflows/          # CI/CD (3 пайплайна)
└── package.json                # Зависимости и скрипты
```

---

## 6. Запуск локально

### Предварительно
- Node.js 22.x, npm 10.x
- PostgreSQL (или доступ к dev-базе)
- Git + SSH ключ для GitHub

### Шаги

```bash
# 1. Клонировать
git clone git@github.com:Electro-Interfaces/tradeframe-builder.git
cd tradeframe-builder

# 2. Установить зависимости
npm install
cd server && npm install && cd ..

# 3. Настроить env
# Корневой .env (frontend):
# VITE_FALLBACK_BACKEND_URL=http://localhost:3001

# server/.env (backend):
# DATABASE_URL=postgresql://...
# STS_API_URL=https://pos.autooplata.ru/tms
# STS_API_USERNAME=...
# STS_API_PASSWORD=...
# JWT_SECRET=...

# 4. Запустить бэкенд
cd server && node index.js
# → http://localhost:3001

# 5. Запустить фронтенд (новый терминал)
npm run dev
# → http://localhost:3000
```

### Проверка
- Открыть http://localhost:3000 — должна появиться страница логина
- Войти с тестовыми credentials
- Перейти на страницу Оборудование — данные должны загружаться из STS API

---

## 7. Дизайн-система

### Эталон — страница Оборудование

Все страницы приводятся к единому стилю. Ключевые правила:

| Элемент | Паттерн |
|---------|---------|
| Карточки | `bg-di-surface-mid rounded-xl border border-transparent hover:border-di-primary/20 p-4` |
| Статус | Dot `w-2 h-2 rounded-full` + `text-[10px] font-bold uppercase` |
| Цвета | Tailwind стандартные: `green-500`, `amber-500`, `red-500`, `blue-500` |
| Шрифт заголовков | `font-headline` (Manrope) |
| Шрифт тела | Inter (по умолчанию) |
| Заголовок страницы | `font-headline font-bold text-lg/text-xl` — одна строка с кнопками |

### CSS токены
Определены в `src/index.css` как CSS переменные `--di-*`, подключены в `tailwind.config.ts` как `di.{token}`.
Автоматически переключаются light/dark через `:root` / `.dark`.

### Запреты
- ❌ Градиенты на кнопках
- ❌ Hex-цвета (`#4ade80`) — использовать Tailwind (`green-500`)
- ❌ `di-primary` для синего в светлой теме (он серый) — использовать `blue-500`
- ❌ Декоративные элементы без смысла

---

## 8. Аутентификация и роли

### JWT Flow
1. `POST /api/auth/login` → `{ token, user }`
2. Token хранится в localStorage / sessionStorage (Remember Me)
3. Каждый запрос: `Authorization: Bearer {token}`
4. Backend валидирует через middleware `requireAuth`

### 5 ролей
| Роль | Уровень | Доступ |
|------|---------|--------|
| `super_admin` | Глобальный | Всё |
| `network_admin` | Сеть | Управление сетью и её ТТ |
| `point_manager` | Точка | Управление одной ТТ |
| `operator` | Точка | Просмотр данных ТТ |
| `driver` | Минимальный | Только свои данные |

### Проверка в коде
```tsx
const { hasPermission, isAdmin, canManagePrices } = useNewAuth();
if (canManagePrices()) { /* показать кнопку */ }
```

---

## 9. Внешние API

| API | Назначение | Endpoint | Прокси |
|-----|-----------|----------|--------|
| **STS (poscontrol)** | Терминалы, цены, транзакции | pos.autooplata.ru/tms | `/api/sts/*` |
| **TradeCorp** | Процессинг топливных карт | api.autooplata.ru | `/api/tradecorp/*` |
| **MSTO** | Онлайн-заказы (Яндекс и др.) | 46.229.214.21:3000 | `/api/msto/*` |
| **TSupport** | Поддержка клиентов | 81.200.148.35:3080 | `/api/support/*` |

**Swagger STS:** https://pos.autooplata.ru/tms/docs

---

## 10. CI/CD Pipeline

```
git push test main
        │
        ▼
GitHub Actions (deploy-test.yml)
        │
        ├── npm ci
        ├── check:repo-guards
        ├── sync-version
        ├── build:prod (с TEST env vars)
        ├── tar.gz архив (dist + server)
        ├── SCP → /tmp/ на сервере
        ├── Backup старой версии
        ├── Extract + npm install
        ├── PM2 restart (frontend + backend)
        ├── Health check (HTTP 200)
        └── Smoke test (authenticated)
```

**Команды деплоя:**
- Test: `git push test main` → автодеплой
- Prod: `git push prod main` → автодеплой (отдельный workflow)

---

## 11. Скрипты

```bash
# Разработка
npm run dev              # Vite dev-сервер (:3000)
npm run dev:backend      # Express (:3001)

# Качество
npm run lint             # ESLint проверка
npm run lint:fix         # Автоисправление
npm run type-check       # TypeScript проверка (tsc --noEmit)

# Тесты
npm test                 # Unit (vitest)
npm run test:e2e         # E2E (playwright)
npm run test:all         # Всё вместе

# Сборка
npm run build:prod       # Production build
npm run build:analyze    # Анализ бандла
```

---

## 12. 4 направления работы

### Рефакторинг
Strict TypeScript, Prettier, типизация any, unit-тесты, shared компоненты.

### Редизайн
Equipment = эталон → накат на все страницы → потом на все проекты ElsyPlus.

### Функционал
Новые фичи по задачам бизнеса (терминалы, аналитика, 1С, уведомления).

### Инфраструктура
Test/prod среды, бэкапы, мониторинг, CI автотесты на PR.

---

## 13. Первые задачи

Доска: [YT проект TF](https://mag.youtrack.cloud/issues/TF)

| ID | Задача | Кто |
|----|--------|-----|
| TF-46 | Онбординг — настройка dev-окружения | Козик |
| TF-48 | Prettier + husky pre-commit | Козик |
| TF-49 | TypeScript strict — этап 1 | Козик |
| TF-51 | Unit-тесты stsApi, couponsApi | Гаврилов |
| TF-52 | Редизайн Операции | Козик |
| TF-55 | CI: vitest + tsc + lint на PR | Гаврилов |

---

## 14. Полезные ссылки

- **Документация:** `docs/` (20+ файлов на русском)
- **STS Swagger:** https://pos.autooplata.ru/tms/docs
- **YouTrack:** https://mag.youtrack.cloud/issues/TF
- **Test:** https://testtf.dataworker.ru
- **Prod:** https://prod.dataworker.ru
