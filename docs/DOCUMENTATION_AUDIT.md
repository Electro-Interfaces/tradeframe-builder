# Аудит документации

Дата аудита: 2026-04-24
База сравнения: код, `package.json`, `server/package.json`, `server/index.js`, `src/App.tsx`, `vite.config.ts`, GitHub Actions, PM2 configs.

## Вывод

Документация накоплена за несколько этапов развития проекта. В ней есть полезные материалы, но часть файлов описывает старые состояния: GitHub Pages, Supabase, версии `1.5.x`, команду `npm run api:dev`, Jest/Cypress и устаревшие схемы деплоя. Для передачи проекта внешней команде текущими источниками считать:

- `README.md`
- `docs/README.md`
- `docs/HANDOVER.md`
- `docs/ARCHITECTURE_CURRENT.md`
- `docs/ENVIRONMENT.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/DOCS_STATUS.md`
- `docs/TECH_DEBT.md`
- этот аудит

## Методика

Проверено:

- полный список файлов `docs/`;
- ключевые entrypoint-документы;
- поиск устаревших маркеров: `Supabase`, `GitHub Pages`, `api:dev`, `1.5.`, `2.0.2`, `Jest`, `Cypress`, `Vercel`, `Netlify`, `localhost:3002`, `TradePoint`;
- фактические команды и зависимости из `package.json` и `server/package.json`;
- фактические backend routes из `server/index.js`;
- фактические SPA routes из `src/App.tsx`;
- фактический CI/CD из `.github/workflows/`.

Это не заменяет доменную ревизию каждого пользовательского руководства со скриншотами, но закрывает техническую достоверность для разработчиков.

## Актуальные документы

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `README.md` | актуализирован | главный вход в проект |
| `AGENTS.md` | в целом актуален | есть формулировка про GitHub Pages для `npm run build`, но основные правила корректны |
| `CLAUDE.md` | в целом актуален | полезен как AI/операционный контекст |
| `server/README.md` | частично актуален | архитектура backend верная, но часть команд Linux-ориентирована |
| `server/db/README.md` | актуален | короткое правило PG-слоя |
| `docs/ARCHITECTURE_CURRENT.md` | новый актуальный | приоритет над старым `docs/ARCHITECTURE.md` |
| `docs/HANDOVER.md` | новый актуальный | использовать для передачи подрядчику |
| `docs/ENVIRONMENT.md` | новый актуальный | использовать вместо пересылки `.env` |
| `docs/OPERATIONS_RUNBOOK.md` | новый актуальный | эксплуатация и инциденты |
| `docs/DOCS_STATUS.md` | новый актуальный | полный реестр документов и статусов |
| `docs/TECH_DEBT.md` | новый актуальный | backlog подготовки к передаче |

## Требуют обновления или имеют устаревшие фрагменты

| Файл | Проблема | Действие |
| --- | --- | --- |
| `docs/ARCHITECTURE.md` | старые примеры React Query, Jest/Cypress, неполный backend | оставлен как исторический обзор, добавлен warning |
| `docs/DEVELOPER_GUIDE.md` | встречается `npm run api:dev`, Vercel/Netlify, старый testing-раздел | добавлен warning, для команд использовать `README.md` |
| `docs/PROJECT_DESCRIPTION.md` | версия `2.0.2`, статистика и routes могут быть устаревшими | добавлен warning, требует отдельной продуктовой ревизии |
| `docs/VERSION_MANAGEMENT.md` | старая версия в примерах | актуализирован под 2.1.3 |
| `src/config/README.md` | старая версия `1.5.15` в примерах | актуализирован под 2.1.3 |
| `docs/deployment/DEPLOYMENT.md` | ранее содержал старые варианты деплоя | заменен актуальным описанием штатного деплоя |
| `docs/setup/QUICKSTART.md` | частично актуален, но есть старые ссылки | добавлен блок про актуальные документы |
| `docs/architecture/API_INTEGRATION.md` | версия `1.5.16`, есть legacy-описания режимов | использовать только по STS details, требует ревизии |
| `docs/architecture/API_AUTHENTICATION.md` | полезен, но содержит code snippets с `console.*` и историю | использовать как справку, не копировать snippets вслепую |
| `docs/DATABASE_SETUP.md` | в целом соответствует PG, но формулировка про shared production DB рискованна | передавать подрядчику вместе с `ENVIRONMENT.md` |
| `docs/FUEL_ACCOUNTING_SYSTEM.md` | упоминает Supabase как справочник | требует перепроверки по текущему backend |
| `docs/TANK_CALIBRATION.md` | версия `1.5.76+` | требует обновления статуса |
| `docs/MSTO_INTEGRATION.md` | не проверялся глубоко | требует проверки при работах с MSTO |
| `docs/STS_API_EXAMPLES.md` | вероятно полезен как API-примеры | сверять с текущим `server/routes/sts.js` |
| `docs/API_SHIFT_REPORTS*.md` | предметная API-документация | сверять с текущими STS responses |
| `docs/API_TRADING_NETWORK.md` | предметная API-документация | сверять с текущими routes/services |

## Исторические и архивные документы

Все файлы в `docs/_archive/` считать историческими. Их нельзя использовать как текущую инструкцию без сверки с кодом.

Частые устаревшие темы в архиве:

- Supabase как основной источник;
- GitHub Pages как test-деплой;
- миграционные планы, уже частично выполненные;
- старые версии `1.5.x`;
- старые nginx/PM2 рецепты.

## Документы по мобильной адаптации и операциям

| Группа | Статус | Комментарий |
| --- | --- | --- |
| `docs/mobile/*` | полезные исторические отчеты | содержат версии `1.5.x`, использовать как backlog идей |
| `docs/operations/*` | полезны как отчеты по прошлым оптимизациям | есть Supabase/старые порты, не считать текущими runbook |
| `docs/setup/*` | смешанный статус | `QUICKSTART` актуализирован, остальные читать точечно |

## Пользовательская документация

`docs/user-guide/` содержит руководства, docx/html и скриншоты. Это отдельный пласт продуктовой документации. Технически он не блокирует передачу разработчикам, но перед передачей клиентам его нужно отдельно сверить с текущим UI версии 2.1.3.

Замеченные признаки устаревания:

- версии `1.5.31`, `1.5.50+`, `2.0.2`;
- старые скриншоты;
- возможное несовпадение названий TradeFrame / TradeControl / TradePoint.

## Названия продукта

В коде и документации встречаются:

- TradeFrame
- TradeControl
- TradeControl Builder
- TradePoint

Текущее техническое имя репозитория и продукта в контексте разработки: TradeFrame / TradeControl. `TradePoint` встречается в версии и дизайн-документах и требует бизнес-решения: оставить как новый бренд или унифицировать.

## Рекомендуемые задачи в backlog

1. Принять единое продуктовое имя и обновить UI/docs.
2. Перенести неактуальные active-docs в `docs/_archive/` после проверки владельцем.
3. Переписать `docs/ARCHITECTURE.md` на основе `docs/ARCHITECTURE_CURRENT.md`.
4. Обновить `docs/DEVELOPER_GUIDE.md` или заменить его ссылкой на новый handover.
5. Провести продуктовую ревизию `docs/user-guide/` со скриншотами.
6. Очистить или задокументировать legacy `console.*`.
7. Сверить все API-документы с текущими backend routes и STS responses.
8. Добавить короткий `docs/CONTRIBUTING.md` для внешней команды, если разработка пойдет через pull requests.

## Найденные несоответствия кода и документации

| Несоответствие | Факт |
| --- | --- |
| Версия backend health | `server/index.js` сейчас возвращает `version: "2.1.0"`, при этом `src/config/version.ts` и `package.json` — `2.1.3` |
| Backend Express | backend устанавливается из `server/package.json`, где Express 4.x; корневой `package.json` содержит Express 5.x, но backend runtime использует `server/` |
| Test backend port | в CI/PM2 test backend — `3002`; локально backend — `3001` |
| GitHub Pages | остался только build mode/исторические упоминания; штатный test-деплой сейчас `testtf.dataworker.ru` через GitHub Actions |
