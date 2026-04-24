# Передача проекта разработчикам

Дата актуализации: 2026-04-24
Версия приложения: 2.1.3
Статус: активная разработка и эксплуатация

## Назначение

TradeFrame / TradeControl - веб-платформа для управления сетями АЗС: оборудование, резервуары, операции, цены, смены, поступления, купоны, уведомления, рассылки, пользователи, роли, юридические документы и интеграции с внешними системами.

## Что читать в первую очередь

1. `README.md` - быстрый вход и команды.
2. `docs/HANDOVER.md` - этот документ, контекст передачи.
3. `docs/ARCHITECTURE_CURRENT.md` - текущая архитектура по коду.
4. `docs/ENVIRONMENT.md` - переменные окружения и секреты.
5. `docs/OPERATIONS_RUNBOOK.md` - эксплуатация, деплой, диагностика.
6. `docs/DOCS_STATUS.md` - полный реестр документов и статусов.
7. `docs/DOCUMENTATION_AUDIT.md` - состояние старой документации.
8. `docs/PLANE_SETUP.md` - текущий трекер задач.

## Окружения

| Окружение | URL | Backend | Frontend | Назначение |
| --- | --- | --- | --- | --- |
| Local | `http://localhost:3000` | `localhost:3001` | Vite | разработка |
| Test | `https://testtf.dataworker.ru` | PM2 `tradeframe-test-backend`, порт `3002` | PM2 `tradeframe-test-frontend`, порт `8082` | проверка перед production |
| Production | `https://prod.dataworker.ru` | PM2 `tradeframe-prod-backend`, порт `3001` | PM2 `tradeframe-prod-frontend`, порт `8080` | боевой контур |

## Быстрый запуск

```bash
npm install
npm run start:backend
npm run dev
```

Backend нужно запускать первым. Frontend проксирует `/api/*` на `http://localhost:3001` через `vite.config.ts`.

Для разработки backend в watch-режиме:

```bash
npm run dev:backend
```

## Проверки перед передачей изменений

Минимальный набор:

```bash
npm run lint
npm run type-check
npm test
npm run build:prod
```

Для изменений в маршрутах, авторизации, навигации, критичном UI или интеграциях:

```bash
npm run test:e2e
```

Для production/test деплоя дополнительно проходит `npm run check:repo-guards` в GitHub Actions.

## Трекер задач

Основной трекер задач: Plane self-hosted, `https://plan.dataworker.ru`, проект TradeFrame.

Новые задачи, баги, решения по приоритетам и приемку фиксировать только в Plane. YouTrack в старых документах и ссылках считать историческим источником; новые задачи TradeFrame там не заводить.

Секреты Plane API и персональные токены не хранить в репозитории. Для автоматизации использовать защищенные переменные окружения или локальные agent skills, без хардкода токенов в docs/code.

## Основные правила разработки

- Все пользовательские API-запросы из frontend идут через backend `/api/*`.
- Секреты и пароли не должны попадать во frontend bundle и репозиторий.
- Учетные данные STS, MSTO, TradeCorp, TSupport, Telegram и PostgreSQL хранятся только в `server/.env` локально и GitHub Secrets на CI/CD.
- Новые `console.log`, `console.info`, `console.warn` в runtime-код не добавлять. Существующие legacy-вызовы требуют отдельной чистки.
- Для frontend использовать существующие паттерны: `services`, React Query hooks, shadcn/ui, Tailwind, алиас `@/`.
- Для backend использовать цепочку `routes -> services/repositories -> db/pool`, не давать frontend прямой доступ к PostgreSQL.
- Перед изменениями в правах и ролях читать `server/middleware`, `server/routes/roles.js`, `src/contexts/AuthContext*` и профильные сервисы.

## Основные зоны кода

| Зона | Где искать |
| --- | --- |
| Роутинг SPA | `src/App.tsx` |
| Макет и меню | `src/components/layout/` |
| API-клиенты frontend | `src/services/` |
| Авторизация frontend | `src/contexts/`, `src/services/auth/` |
| Backend entrypoint | `server/index.js` |
| Backend routes | `server/routes/` |
| PostgreSQL pool | `server/db/pool.js` |
| SQL миграции | `server/db/migrations/` |
| CI/CD | `.github/workflows/deploy-test.yml`, `.github/workflows/deploy-prod.yml`, `.github/workflows/smoke-check.yml` |
| PM2 | `ecosystem.test.config.cjs`, `ecosystem.prod.config.cjs` |

## Интеграции

| Интеграция | Назначение | Backend route |
| --- | --- | --- |
| STS / poscontrol | цены, операции, резервуары, смены, оборудование | `/api/sts/*` |
| TradeCorp | корпоративный процессинг | `/api/tradecorp/*` |
| MSTO | онлайн-заказы агрегаторов | `/api/msto/*` |
| TSupport | заявки и чат поддержки | `/api/support/*` |
| Telegram | привязка аккаунтов и уведомления | `/api/telegram/*` |
| PostgreSQL | пользователи, роли, сети, документы, уведомления и доменные данные | backend repositories |

## Деплой

| Контур | Remote | Команда |
| --- | --- | --- |
| Test | `test` | `git push test main` |
| Production | `prod` | `git push prod main` |

Деплой автоматический через GitHub Actions. Ручной SSH-деплой не является штатным процессом.

## Риски для входящей команды

- В `docs/` есть исторические документы, не все соответствуют состоянию версии 2.1.3. Перед опорой на старый документ сверяться с `docs/DOCUMENTATION_AUDIT.md`.
- В старых документах встречаются Supabase, GitHub Pages, `npm run api:dev`, версии `1.5.x` и `2.0.2`; это не должно считаться текущим состоянием без проверки по коду.
- В проекте есть реальные production/test интеграции и данные. Любые миграции БД и изменения авторизации требуют отдельного плана и проверки на test.
- `npm run sync-version` меняет `package.json`, `public/manifest.json` и `index.html`. Источник версии - `src/config/version.ts`.
