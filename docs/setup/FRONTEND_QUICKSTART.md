# Frontend Quick Start (TradeFrame)

Дата: 2026-04-30

Этот документ — для разработчика, который только начал работать с TradeFrame и хочет за 10 минут поднять фронт у себя локально. Здесь три сценария — выбирай нужный.

> Если запутался — пройди в порядке A → B → C, начни с **A**.

---

## Что нужно один раз сделать перед любым сценарием

### 1. Доступы (запрашивай у МАГа)

| Ресурс | Что получить |
| --- | --- |
| GitHub `Electro-Interfaces/TradeControl` | приглашение в репозиторий |
| Plane `https://plan.dataworker.ru` | учётка + проект TradeFrame + персональный API-токен |
| Аккаунт в TradeFrame для логина | email + пароль для `prod.dataworker.ru` или `testtf.dataworker.ru` |

Дополнительно (только если будешь поднимать backend локально):

| Ресурс | Что получить |
| --- | --- |
| SSH-доступ `dw-prod` | твой публичный ключ ed25519 добавляется в `authorized_keys` пользователя `www-root` |
| Заполненный `server/.env` | через защищённый канал (Mailcow с зашифрованным архивом / KeePass) |

### 2. Тулинг

- **Node.js 22.x**, npm 10.x
- **Git**
- На Windows — `bash` (Git Bash или WSL) для удобной работы с проектом

```bash
node -v   # должно быть 22.x
npm -v    # должно быть 10.x
```

### 3. Клон + установка

```bash
git clone git@github.com:Electro-Interfaces/TradeControl.git
cd TradeControl
npm install
```

`npm install` ставит зависимости и фронта, и backend (это монорепозиторий — backend `server/` живёт рядом и собирается вместе с фронтом). Это не значит, что тебе обязательно его запускать — см. сценарии ниже.

---

## Сценарий A — фронт работает с тестовым бэком (рекомендуется)

Самый быстрый старт. **PostgreSQL не нужен. Backend локально не запускаем.** Фронт через vite dev-proxy ходит на `https://testtf.dataworker.ru/api/*`. Авторизация, юзеры, сети, точки, цены — всё работает на боевом test-сервере.

### Настройка

В корне проекта создаём `.env`:

```env
VITE_API_PROXY_TARGET=https://testtf.dataworker.ru
```

(всё; больше ничего в этот `.env` класть не нужно — секреты тут не нужны)

### Запуск

```bash
npm run dev
```

Открой `http://localhost:3000`. Логин — учётка для `testtf.dataworker.ru`.

### Что работает

- Все API-вызовы идут на test → авторизация настоящая, данные настоящие.
- HMR работает.
- Service Worker отключён в dev — никаких циклических перезагрузок.

### Что НЕ работает

- Изменения в backend-коде (`server/`) ты тут не увидишь — у тебя проксируется чужой backend. Если правишь `src/` — всё гут. Если задача требует править `server/` — переходи в **Сценарий B**.

### Проверки перед PR

```bash
npm run lint
npm run type-check
npm test
npm run build:prod
```

Эти четыре команды должны проходить без ошибок. Если что-то падает — фикси в своём коде, не в чужом.

---

## Сценарий B — полный локальный стек с туннелем к prod БД

Нужен, если:
- задача требует править backend (`server/routes/*`, `server/services/*`),
- хочешь видеть SQL-запросы и backend-логи,
- задача связана с STS/MSTO/TradeCorp проксированием.

### Настройка SSH-туннеля к PostgreSQL

База TradeFrame живёт на сервере `194.135.36.195`. Локально мы не ставим Postgres — пробрасываем туннель через SSH.

`~/.ssh/config`:

```
Host dw-prod
  HostName 194.135.36.195
  User www-root
  IdentityFile ~/.ssh/id_ed25519
  IPQoS none
```

Открыть туннель в отдельном терминале (не закрывать пока работаешь):

```bash
ssh -L 5435:127.0.0.1:5432 dw-prod
```

Туннель пробрасывает локальный порт `5435` на серверный `5432` (PostgreSQL). Пока туннель открыт, локальный backend подключается к настоящей БД, как будто она у тебя на машине.

### Заполнить `server/.env`

Скопировать шаблон:

```bash
cp server/.env.example server/.env
```

Заполнить `server/.env` значениями (получи у МАГа):

```env
# PostgreSQL (через туннель)
DATABASE_URL=postgresql://tradeframe:<пароль_от_МАГа>@localhost:5435/tradeframe

# JWT — для локалки любая длинная строка
JWT_SECRET=local-dev-secret-anything-long

# STS — реквизиты от Гаврилова / МАГа
STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=<...>
STS_API_PASSWORD=<...>

# Остальные — TradeCorp, MSTO, TSupport — нужны если будешь их трогать.
# Иначе backend стартует и без них (просто соответствующие /api/* отдадут 503).
TRADECORP_API_URL=https://api.autooplata.ru
TRADECORP_EMPLOYEE_API_URL=https://api.invoicebox.vobrabotke.ru/api
TRADECORP_LOGIN=<...>
TRADECORP_PASSWORD=<...>
TRADECORP_EMITENT_ID=15

MSTO_API_URL=http://46.229.214.21:3000
MSTO_USERNAME=<...>
MSTO_PASSWORD=<...>

TSUPPORT_API_URL=http://81.200.148.35:3080
TSUPPORT_SDK_API_KEY=<...>
TSUPPORT_SDK_SECRET=<...>

# Telegram бот в локалке НЕ нужен — оставь TELEGRAM_BOT_TOKEN пустым/закомментированным,
# он молча отключится. Соответствующие /api/telegram/* отдадут "бот не настроен".
# TELEGRAM_BOT_TOKEN=

# Отключить планировщик уведомлений (он шумит в логах локально)
DISABLE_NOTIFICATION_SCHEDULER=true

# CORS — для локального фронта на :3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=3001
```

### Корневой `.env` (фронт)

В сценарии B `.env` в корне может быть пустым — vite по умолчанию проксирует на `http://localhost:3001`, что нам и нужно.

### Запуск

В трёх отдельных терминалах:

```bash
# Терминал 1 — SSH-туннель (не закрывать)
ssh -L 5435:127.0.0.1:5432 dw-prod

# Терминал 2 — backend на :3001
npm run start:backend
# или для watch-режима:
# npm run dev:backend

# Терминал 3 — frontend на :3000
npm run dev
```

### Проверка

- `http://localhost:3001/api/healthz` → `200 OK`. Если `503` — туннель упал или `DATABASE_URL` неверный.
- `http://localhost:3000` → форма логина. Войти учёткой от prod.
- В терминале backend видишь логи запросов и SQL.

### Внимание: данные настоящие

В сценарии B твой локальный backend ходит в **prod-PostgreSQL**. Любые `INSERT/UPDATE/DELETE` через `/api/*` пишутся в боевую базу. Для отладки read-only сценариев это безопасно. Если задача — менять данные, согласуй с МАГом, какие операции ты выполняешь.

---

## Сценарий C — полностью offline (свой Postgres + дамп)

Нужен, только если совсем нет SSH-доступа на `dw-prod` или нужна изолированная песочница.

### Что понадобится

- Docker Desktop
- Дамп `tradeframe.sql.gz` от админа (МАГ или DBA)

### Запуск Postgres локально

```bash
docker run -d --name tf-pg \
  -e POSTGRES_USER=tradeframe \
  -e POSTGRES_PASSWORD=local \
  -e POSTGRES_DB=tradeframe \
  -p 5432:5432 \
  postgres:16
```

### Залить дамп

```bash
gunzip -c tradeframe.sql.gz | \
  docker exec -i tf-pg psql -U tradeframe -d tradeframe
```

### Применить миграции

```bash
DATABASE_URL=postgresql://tradeframe:local@localhost:5432/tradeframe \
  npm --prefix server run db:migrate:status
```

Если есть `[PENDING]` миграции — применить:

```bash
DATABASE_URL=postgresql://tradeframe:local@localhost:5432/tradeframe \
  npm --prefix server run db:migrate
```

### `server/.env`

Как в сценарии B, но `DATABASE_URL=postgresql://tradeframe:local@localhost:5432/tradeframe`.

### Запуск

```bash
npm run start:backend     # терминал 1
npm run dev               # терминал 2
```

---

## Частые проблемы

### `Bot token not provided` / Telegram-ошибки в логах backend
Telegram-бот не запускается, если в `server/.env` нет `TELEGRAM_BOT_TOKEN` или он пустой. **Это норма для локалки.** Сервер при этом продолжает работать.

### `DATABASE_URL не задан`, `/api/healthz` отдаёт 503
В `server/.env` нет `DATABASE_URL` или туннель к prod БД не открыт. См. сценарий B/C.

### `network error` / `ERR_CONNECTION_REFUSED` в DevTools на запросах `/api/*`
В сценарии A не задан `VITE_API_PROXY_TARGET` — vite пытается стучать в `localhost:3001`, а локального backend нет. Создай `.env` с `VITE_API_PROXY_TARGET=https://testtf.dataworker.ru` и перезапусти `npm run dev`.

### `Origin http://localhost:3000 not allowed by CORS` при логине в сценарии A
Это значило, что vite-proxy не подменял заголовок `Origin` при перенаправлении на test backend, и backend срабатывал по CORS. Поправлено в `vite.config.ts` — теперь при удалённом `VITE_API_PROXY_TARGET` proxy подменяет `Origin`/`Referer` на target. После `git pull` и перезапуска `npm run dev` логин работает.

### Логин не работает, отдаёт 401
Учётки `dev/dev` не существует. Используй боевую учётку для test или prod (получи у МАГа).

### Запуск рушится из-за PORT 3000 / 3001 уже занят
```powershell
# Windows / PowerShell:
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue |
  Select-Object LocalPort, State, OwningProcess
# Убить нужный PID:
Stop-Process -Id <PID> -Force
```

```bash
# macOS / Linux:
lsof -i :3000 :3001
kill -9 <PID>
```

---

## Что читать дальше

- `README.md` — общий обзор проекта и команд.
- `docs/HANDOVER.md` — передача проекта, окружения, правила.
- `docs/ARCHITECTURE_CURRENT.md` — текущая архитектура по коду.
- `docs/PLANE_SETUP.md` — трекер задач (Plane).
- `docs/OPERATIONS_RUNBOOK.md` — эксплуатация и диагностика.
- `docs/DEV_ACCESS_CHECKLIST.md` — полный чек-лист доступов и что у кого получать.

---

## Куда писать вопросы

- Бизнес/scope/приоритеты — в комментарий к задаче в Plane.
- Доступы (SSH, БД, GitHub) — МАГ.
- Backend / интеграции / STS — Гаврилов.
- Срочные технические — общий чат команды.
