# Технический долг для передачи

Дата актуализации: 2026-04-24

Этот список фиксирует не все идеи развития, а именно то, что мешает понятной передаче проекта внешней команде.

## Критично перед внешней передачей

| Задача | Почему важно | Где смотреть |
| --- | --- | --- |
| Провести secrets audit | в корне есть локальные env/secret-файлы, их нельзя передавать подрядчику в архиве | `.env`, `server/.env`, `SECRETS_VALUES.txt`, `ADD_TO_GITHUB_SECRETS.txt`, `.gitignore` |
| Принять единое название продукта | в проекте встречаются TradeFrame, TradeControl, TradeControl Builder, TradePoint | `src/config/version.ts`, docs, UI |
| Синхронизировать backend health version | `/health` в `server/index.js` отдает `2.1.0`, приложение сейчас `2.1.3` | `server/index.js`, `src/config/version.ts` |
| Очистить или нормализовать legacy `console.*` | правила запрещают новые console, но старые вызовы есть в runtime-коде | `rg "console\\." src server vite.config.ts` |
| Проверить пользовательские руководства со скриншотами | `docs/user-guide/` содержит старые версии и скриншоты | `docs/user-guide/` |

## Важно для разработки

| Задача | Почему важно | Где смотреть |
| --- | --- | --- |
| Обновить старый `docs/ARCHITECTURE.md` или заменить ссылкой на current | сейчас есть два источника архитектуры | `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_CURRENT.md` |
| Переписать `docs/DEVELOPER_GUIDE.md` | встречаются устаревшие команды и инструменты | `docs/DEVELOPER_GUIDE.md` |
| Сверить API-документы с backend routes | backend вырос, старые API-доки неполные | `server/index.js`, `docs/API_*.md`, `docs/architecture/*` |
| Проверить миграционные документы | часть документов описывает уже пройденную миграцию Supabase -> PostgreSQL | `docs/_archive/migration/` |
| Уточнить lifecycle test/prod БД | документация говорит о реальных данных и shared DB, подрядчику нужны четкие границы | `docs/DATABASE_SETUP.md`, `docs/ENVIRONMENT.md` |

## Улучшения качества

| Задача | Почему важно | Где смотреть |
| --- | --- | --- |
| Добавить CONTRIBUTING для подрядчика | нужен единый PR/review workflow | новый `docs/CONTRIBUTING.md` или `CONTRIBUTING.md` |
| Укрепить тесты вокруг auth/routes | это зона высокого риска | `server/routes/auth.js`, `server/middleware/`, `src/contexts/` |
| Проверить мобильные таблицы | в старых отчетах отмечены широкие таблицы на mobile | `docs/mobile/`, компоненты equipment/tables |
| Добавить smoke-инструкции для локального dev | `/api/smoke` требует auth, нужна процедура получения токена | `server/index.js`, `server/scripts/postDeploySmoke.js` |

## Не делать без отдельного плана

- Не менять схему БД без миграции и rollback-плана.
- Не менять auth storage и JWT lifecycle без e2e/smoke.
- Не переносить старые Supabase-документы обратно в active-docs.
- Не копировать production `.env` в репозиторий или подрядчику.
- Не проводить ручной production deploy в обход GitHub Actions без аварийной причины.
