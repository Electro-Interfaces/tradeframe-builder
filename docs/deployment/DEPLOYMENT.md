# Деплой TradeFrame / TradeControl

Дата актуализации: 2026-04-24

Этот документ описывает текущий штатный деплой. Старые варианты с GitHub Pages, Vercel/Netlify и ручной выкладкой не используются как основной процесс.

## Окружения

| Окружение | URL | GitHub repo | Remote | Backend |
| --- | --- | --- | --- | --- |
| Test | `https://testtf.dataworker.ru` | `Electro-Interfaces/tradeframe-builder` | `test` | порт `3002` |
| Production | `https://prod.dataworker.ru` | `Electro-Interfaces/TradeControl` | `prod` | порт `3001` |

## Команды

```bash
# Проверка перед деплоем
npm run lint
npm run type-check
npm test
npm run build:prod

# Деплой на test
git push test main

# Деплой на production
git push prod main
```

## GitHub Actions

Файлы workflow:

- `.github/workflows/deploy-test.yml`
- `.github/workflows/deploy-prod.yml`
- `.github/workflows/smoke-check.yml`

Deploy workflow выполняет:

1. `npm ci`
2. `npm run check:repo-guards`
3. `npm run sync-version`
4. `npm run build:prod`
5. упаковку `dist/`, `server/`, `package.json`, `ecosystem.*.config.cjs`
6. копирование архива на сервер
7. создание `server/.env` из GitHub Secrets
8. `npm install --production` в `server/`
9. пересоздание PM2 процессов
10. проверку сайта, `/api/healthz` и авторизованный smoke

## PM2 процессы

| Окружение | Frontend | Backend |
| --- | --- | --- |
| Test | `tradeframe-test-frontend` | `tradeframe-test-backend` |
| Production | `tradeframe-prod-frontend` | `tradeframe-prod-backend` |

## Серверные пути

| Окружение | Путь |
| --- | --- |
| Test | `/var/www/www-root/data/www/testTF.dataworker.ru` |
| Production | `/var/www/www-root/data/www/prod.dataworker.ru` |

## Проверка после деплоя

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

## Секреты

`server/.env` на серверах создается workflow из GitHub Secrets. Не копировать локальные `.env` в репозиторий и не передавать их вместе с кодом.

Подробно: `docs/ENVIRONMENT.md`.

## Откат

Workflow создает backup перед распаковкой новой версии:

- test: `/var/backups/tradeframe/test-backup-<timestamp>.tar.gz`
- prod: `/var/backups/tradeframe/prod-backup-<timestamp>.tar.gz`

Откат выполняется вручную на сервере только после диагностики причины сбоя.
