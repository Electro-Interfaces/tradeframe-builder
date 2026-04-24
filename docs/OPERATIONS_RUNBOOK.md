# Runbook эксплуатации

Дата актуализации: 2026-04-24

## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. Запустить backend:

```bash
npm run start:backend
```

3. Запустить frontend:

```bash
npm run dev
```

4. Открыть:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/api/healthz`

## Проверка портов на Windows

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | Select-Object LocalPort,State,OwningProcess
```

Если порт занят, остановить только нужный процесс после проверки PID.

## Health endpoints

| Endpoint | Доступ | Назначение |
| --- | --- | --- |
| `/health` | публичный | базовая проверка backend |
| `/api/healthz` | публичный | health для nginx/GitHub Actions |
| `/api/smoke` | авторизованный | проверка PostgreSQL и ключевых таблиц |

`/health` и `/api/healthz` возвращают `200`, если PostgreSQL подключен, и `503`, если БД не настроена или недоступна.

## Деплой

Штатный деплой идет только через GitHub Actions.

```bash
git push test main
git push prod main
```

Workflow:

- `.github/workflows/deploy-test.yml`
- `.github/workflows/deploy-prod.yml`
- `.github/workflows/smoke-check.yml`

Что делает deploy workflow:

1. `npm ci`
2. `npm run check:repo-guards`
3. `npm run sync-version`
4. `npm run build:prod`
5. создает `deployment.tar.gz`
6. копирует архив на сервер
7. создает `server/.env` из GitHub Secrets
8. выполняет `npm install --production` в `server/`
9. пересоздает PM2 процессы
10. проверяет сайт, `/api/healthz` и авторизованный smoke

## Серверные пути и процессы

| Контур | Путь | PM2 |
| --- | --- | --- |
| Test | `/var/www/www-root/data/www/testTF.dataworker.ru` | `tradeframe-test-frontend`, `tradeframe-test-backend` |
| Production | `/var/www/www-root/data/www/prod.dataworker.ru` | `tradeframe-prod-frontend`, `tradeframe-prod-backend` |

PM2 порты:

| Контур | Frontend | Backend |
| --- | --- | --- |
| Test | `8082` | `3002` |
| Production | `8080` | `3001` |

## Проверка деплоя

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://testtf.dataworker.ru
curl -s -o /dev/null -w "%{http_code}\n" https://testtf.dataworker.ru/api/healthz

curl -s -o /dev/null -w "%{http_code}\n" https://prod.dataworker.ru
curl -s -o /dev/null -w "%{http_code}\n" https://prod.dataworker.ru/api/healthz
```

Проверка workflow:

```bash
gh run list --repo Electro-Interfaces/tradeframe-builder --limit 3
gh run list --repo Electro-Interfaces/TradeControl --limit 3
```

Логи упавшего workflow:

```bash
gh run view <run_id> --repo <repo> --log-failed
```

## Типовые инциденты

### Frontend отвечает, API дает 502/500

Проверить:

- PM2 backend процесс запущен.
- `/api/healthz` отвечает.
- `server/.env` создан и содержит `DATABASE_URL`, `JWT_SECRET`, интеграционные переменные.
- PostgreSQL доступен с сервера.
- Nginx проксирует `/api/` на правильный backend port.

### `/api/healthz` возвращает 503

Обычно проблема в PostgreSQL:

- отсутствует `DATABASE_URL`;
- БД недоступна;
- неверные credentials;
- превышены лимиты подключений.

### STS возвращает 401/403

Проверить:

- `STS_API_URL`, `STS_API_USERNAME`, `STS_API_PASSWORD`;
- доступность `https://pos.autooplata.ru/tms`;
- whitelist IP, если он используется на стороне STS;
- backend-логи `stsProxyService` / `routes/sts`.

### После релиза пользователи видят старую версию

Проверить:

- версия изменена только в `src/config/version.ts`;
- `npm run sync-version` прошел в workflow;
- service worker обновился;
- пользователь выполнил hard refresh или переоткрыл PWA.

### GitHub Actions упал на build

Типовые причины:

- файл импортируется, но не добавлен в git;
- TypeScript ошибка;
- repo guard нашел секрет или legacy-имя;
- изменился `package-lock.json`, но не закоммичен.

## Откат

Deploy workflow создает backup на сервере:

- test: `/var/backups/tradeframe/test-backup-<timestamp>.tar.gz`
- prod: `/var/backups/tradeframe/prod-backup-<timestamp>.tar.gz`

Откат требует ручной операции на сервере и должен выполняться только после фикса причины сбоя и проверки текущих PM2/Nginx настроек.

## Регулярные проверки

- `smoke-check.yml` для test по расписанию и вручную.
- Проверка GitHub Actions после каждого push.
- Проверка `/api/healthz` после релиза.
- Периодический secrets audit перед передачей архива внешним подрядчикам.
