# Окружение и переменные

Дата актуализации: 2026-08-05

## Главный принцип

В проекте два `.env`-файла:

| Файл | Кто читает | Что хранит |
| --- | --- | --- |
| `.env` | Vite frontend | только `VITE_*`, без секретов |
| `server/.env` | Express backend | секреты, интеграции, БД, JWT |

Секреты нельзя коммитить, вставлять в документацию, скриншоты, issue или frontend-код.

## Frontend `.env`

Допустимые переменные:

```env
VITE_API_URL=http://localhost:3001
VITE_BASE_URL=http://localhost:3000
VITE_FALLBACK_BACKEND_URL=http://localhost:3001
VITE_APP_ENV=development
VITE_AUTH_API_MODE=backend
VITE_ADMIN_API_MODE=backend
VITE_ORG_API_MODE=backend
VITE_AUDIT_API_MODE=backend
VITE_LEGAL_API_MODE=backend
VITE_NOMENCLATURE_API_MODE=backend
```

Любая переменная с префиксом `VITE_` попадает в браузерный bundle. Не хранить там логины, пароли, токены и DSN.

## Backend `server/.env`

Минимум для локального backend:

```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

DATABASE_URL=postgresql://user:password@host:5432/tradeframe
JWT_SECRET=local-dev-secret-change-me

STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=
STS_API_PASSWORD=

DISABLE_NOTIFICATION_SCHEDULER=true
```

Интеграции по необходимости:

```env
MSTO_API_URL=
MSTO_USERNAME=
MSTO_PASSWORD=

TRADECORP_API_URL=
TRADECORP_EMPLOYEE_API_URL=
TRADECORP_LOGIN=
TRADECORP_PASSWORD=
TRADECORP_EMITENT_ID=

TSUPPORT_API_URL=
TSUPPORT_SDK_API_KEY=
TSUPPORT_SDK_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=
TELEGRAM_BOT_USERNAME=

PG_MAX_POOL_SIZE=10
PG_IDLE_TIMEOUT_MS=30000
PG_CONNECT_TIMEOUT_MS=5000

# Фоновые задачи STS
DISABLE_STS_SYNC=false
DISABLE_STS_FUEL_WARMUP=false
STS_FUEL_WARMUP_DAYS=7
```

`DISABLE_STS_SYNC=true` отключает стартовую и периодическую материализацию транзакций STS→PostgreSQL.

`DISABLE_STS_FUEL_WARMUP=true` отключает только стартовый прогрев экрана «Остатки».

`STS_FUEL_WARMUP_DAYS` задаёт единственный прогреваемый период от 1 до 31 дня; production-дефолт — 7 дней.

## CI/CD secrets

GitHub Actions создают `server/.env` на сервере из GitHub Secrets.

Обязательные группы:

- PostgreSQL: `DATABASE_URL`, `JWT_SECRET_TEST`, `JWT_SECRET_PROD`
- STS: `STS_API_URL`, `STS_API_USERNAME`, `STS_API_PASSWORD`
- MSTO: `MSTO_API_URL`, `MSTO_USERNAME`, `MSTO_PASSWORD`
- TradeCorp: `TRADECORP_API_URL`, `TRADECORP_LOGIN`, `TRADECORP_PASSWORD`, `TRADECORP_EMITENT_ID`
- TSupport: `TSUPPORT_API_URL`, `TSUPPORT_SDK_API_KEY`, `TSUPPORT_SDK_SECRET`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN_TEST`
- Deploy: `REMOTE_HOST`, `REMOTE_USER`, `SSH_PRIVATE_KEY`

## Отличия test и production

| Параметр | Test | Production |
| --- | --- | --- |
| URL | `https://testtf.dataworker.ru` | `https://prod.dataworker.ru` |
| Backend port | `3002` | `3001` |
| Frontend port | `8082` | `8080` |
| JWT secret | `JWT_SECRET_TEST` | `JWT_SECRET_PROD` |
| Telegram token | `TELEGRAM_BOT_TOKEN_TEST` | `TELEGRAM_BOT_TOKEN` |
| PM2 backend | `tradeframe-test-backend` | `tradeframe-prod-backend` |
| PM2 frontend | `tradeframe-test-frontend` | `tradeframe-prod-frontend` |

## Проверка локального backend

```bash
npm run start:backend
curl http://localhost:3001/api/healthz
```

Ожидается JSON со статусом `healthy` или `degraded`. `degraded` обычно означает, что PostgreSQL не настроен или недоступен.

## Аудит секретов перед передачей

Перед передачей внешней команде проверить:

```bash
git status --short
git ls-files .env server/.env SECRETS_VALUES.txt ADD_TO_GITHUB_SECRETS.txt
npm run check:repo-guards
```

Файлы `.env`, `server/.env`, `SECRETS_VALUES.txt`, `ADD_TO_GITHUB_SECRETS.txt` не должны уходить в репозиторий или архив передачи.
