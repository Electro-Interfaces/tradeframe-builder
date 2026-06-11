# Реестр документации

Дата актуализации: 2026-04-24

Статусы:

- **Актуально** - можно использовать как рабочий источник.
- **Частично актуально** - полезно, но требует сверки с кодом или новым handover.
- **История** - архивный материал, не использовать как текущую инструкцию.
- **Пользовательское** - материалы для пользователей/презентаций, требуют UI-сверки перед публикацией.
- **Требует ревизии** - документ содержит устаревшие версии, команды или архитектуру.

## Главные документы

| Файл | Статус | Назначение |
| --- | --- | --- |
| `../README.md` | Актуально | старт проекта, команды, ссылки |
| `README.md` | Актуально | индекс документации |
| `HANDOVER.md` | Актуально | передача проекта разработчикам |
| `ARCHITECTURE_CURRENT.md` | Актуально | текущая архитектура по коду |
| `ENVIRONMENT.md` | Актуально | env и secrets |
| `OPERATIONS_RUNBOOK.md` | Актуально | эксплуатация и диагностика |
| `DOCUMENTATION_AUDIT.md` | Актуально | аудит состояния docs |
| `DOCS_STATUS.md` | Актуально | этот реестр |
| `PLANE_SETUP.md` | Актуально | текущий трекер задач и правила работы |
| `TECH_DEBT.md` | Актуально | технический долг передачи |

## Техническое ядро

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `ARCHITECTURE.md` | Частично актуально | исторический расширенный обзор, приоритет у `ARCHITECTURE_CURRENT.md` |
| `DEVELOPER_GUIDE.md` | Требует ревизии | старые команды и варианты деплоя |
| `PROJECT_DESCRIPTION.md` | Частично актуально | продуктовый обзор, версии/статистика устарели |
| `DATABASE_SETUP.md` | Частично актуально | PostgreSQL актуален, shared DB политику уточнять |
| `DESIGN_SYSTEM.md` | Частично актуально | использовать для UI, проверить брендинг |
| `DESIGN_PROMPT.md` | Требует ревизии | использует TradePoint branding |
| `FUEL_ACCOUNTING_SYSTEM.md` | Требует ревизии | есть Supabase-следы |
| `INVENTORY_ADJUSTMENT_SPEC.md` | Актуально | Техническое задание на корректировку остатков по приказу инвентаризации (для разработки, после согласования с заказчиком) |
| `INVENTORY_ADJUSTMENT_PROPOSAL.md` | Актуально | Бизнес-документ для согласования с заказчиком процедуры корректировки остатков по инвентаризации |
| `MSTO_INTEGRATION.md` | Частично актуально | сверять с `server/routes/msto.js` |
| `STS_API_EXAMPLES.md` | Частично актуально | сверять с `server/routes/sts.js` |
| `TANK_CALIBRATION.md` | Требует ревизии | старая версия и TODO |
| `VERSION_MANAGEMENT.md` | Актуально | обновлен под 2.1.3 |
| `YOUTRACK_SETUP.md` | История | legacy-трекер, новые задачи TradeFrame вести в Plane |
| `RELEASE_NOTES.md` | История | старые release notes, не текущий деплой |
| `ONBOARDING_SESSION.md` | Частично актуально | onboarding-контекст, требует сверки |

## API-документы

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `API_TRADING_NETWORK.md` | Частично актуально | сверять с backend routes/services |
| `API_SHIFT_REPORTS.md` | Частично актуально | сверять с STS responses |
| `API_SHIFT_REPORTS_1C.md` | Частично актуально | сверять с 1C/STS контрактом |
| `architecture/API_AUTHENTICATION.md` | Частично актуально | полезен для двухуровневой auth-схемы |
| `architecture/API_INTEGRATION.md` | Требует ревизии | старая версия и legacy-описания |
| `architecture/STS_API_REFERENCE.md` | Частично актуально | сверять со Swagger/STS proxy |

## Архитектурные заметки

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `architecture/README.md` | Актуально | индекс раздела |
| `architecture/NOTIFICATION_SYSTEM.md` | Частично актуально | сверять с `server/services/notification*` |
| `architecture/REMEMBER_ME_FEATURE.md` | История | версия 1.5.x |
| `architecture/ALTERNATIVE_CHARTS_PROPOSALS.md` | История | предложения, не текущая архитектура |

## Deployment

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `deployment/README.md` | Актуально | индекс раздела |
| `deployment/DEPLOYMENT.md` | Актуально | текущий штатный deploy |
| `deployment/DEPLOYMENT_GUIDE.md` | Частично актуально | сверять с `DEPLOYMENT.md` |
| `deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md` | Частично актуально | полезный чеклист, сверять порты/CI |
| `deployment/DEPLOYMENT_HISTORY.md` | История | хронология |

## Setup

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `setup/README.md` | Актуально | индекс раздела |
| `setup/QUICKSTART.md` | Частично актуально | добавлена ссылка на новые docs |
| `setup/DEV_START.md` | Частично актуально | сверять команды с `README.md` |
| `setup/PWA_SETUP.md` | Частично актуально | сверять с `vite.config.ts` |
| `setup/PDF_EXPORT_SETUP_GUIDE.md` | Требует ревизии | версия 1.5.x |
| `setup/BROADCAST_MESSAGES_SETUP.md` | История | UI-раздел рассылки удалён, оповещения переведены в чат «Новости»; backend `/api/messages` сохранён как legacy |
| `setup/CRON_BUILDER_GUIDE.md` | Частично актуально | сверять с текущими компонентами |
| `setup/SCHEDULE_EDITOR_GUIDE.md` | Частично актуально | сверять с текущим UI |
| `setup/TANK_CALIBRATION_SETUP.md` | Частично актуально | сверять с PG/API |
| `setup/TELEGRAM_BOT_SETUP.md` | Частично актуально | сверять с `server/telegram-bot-runtime.js` |
| `setup/TELEGRAM_BOTS.md` | Частично актуально | сверять токены/боты через secrets |
| `setup/DNS_FIX_PERMANENT.md` | История | инфраструктурная заметка |

## Operations

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `operations/README.md` | Актуально | индекс раздела |
| `operations/FIX_PRODUCTION_STS_AUTH.md` | История | отчет об инциденте |
| `operations/OPERATIONS_OPTIMIZATIONS.md` | История | отчет по оптимизации |
| `operations/OPERATIONS_OPTIMIZATIONS_RESULTS.md` | История | результаты прошлой оптимизации |
| `operations/OPERATIONS_PAGE_PERFORMANCE_REPORT.md` | История | старый отчет, есть Supabase-следы |
| `operations/PERFORMANCE_OPTIMIZATIONS.md` | История | старый отчет, есть старые порты |

## Mobile

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `mobile/README.md` | Актуально | индекс раздела |
| `mobile/MOBILE_ADAPTATION_ANALYSIS.md` | История | отчет по 1.5.30 |
| `mobile/MOBILE_ADAPTATION_REPORT.md` | История | отчет по 1.5.16 |
| `mobile/MOBILE_API_STABILITY.md` | История | отчет по 1.5.29 |
| `mobile/MOBILE_READINESS_ADMIN.md` | История | отчет по 1.5.31 |
| `mobile/SAFARI_CHROME_ADAPTATION.md` | История | отчет по 1.5.29 |

## User guide

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `user-guide/README.md` | Пользовательское | индекс, версия устаревала |
| `user-guide/USER_GUIDE.md` | Пользовательское | требует сверки UI |
| `user-guide/COMPLETE_GUIDE.md` | Пользовательское | требует сверки UI |
| `user-guide/COMPLETE_GUIDE_v2.md` | Пользовательское | требует сверки UI |
| `user-guide/TRADEFRAME_GUIDE.md` | Пользовательское | требует сверки UI |
| `user-guide/TERMINAL_TCO_GUIDE.md` | Пользовательское | терминальное руководство |
| `user-guide/TERMINAL_TCO_PASSPORT.md` | Пользовательское | паспорт терминала |

## Архив

| Папка | Статус | Комментарий |
| --- | --- | --- |
| `_archive/README.md` | Актуально | индекс архива |
| `_archive/deployment-legacy/*` | История | старые деплой-схемы |
| `_archive/migration/*` | История | миграция Supabase -> PostgreSQL и связанные планы |
| `_archive/reports/*` | История | прошлые исследовательские отчеты |

## Документация в кодовых каталогах

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `../server/README.md` | Частично актуально | backend proxy, использовать с `OPERATIONS_RUNBOOK.md` |
| `../server/db/README.md` | Актуально | PG слой |
| `../server/repositories/README.md` | Частично актуально | repository layer |
| `../src/config/README.md` | Актуально | версия |
| `../src/pages/NetworksPage/README.md` | Частично актуально | модульная справка |
| `../src/pages/admin/Roles/README.md` | Частично актуально | модульная справка |
| `../src/pages/admin/Users/README.md` | Частично актуально | модульная справка |

## AI / Agent файлы

| Файл | Статус | Комментарий |
| --- | --- | --- |
| `../AGENTS.md` | Актуально | общие правила для AI-агентов |
| `../AGENT.md` | Актуально | bootstrap для нейтральных AI-агентов |
| `../CLAUDE.md` | Актуально | Claude-специфика проекта |
| `../.codex-cli.json` | Частично актуально | локальная конфигурация Codex CLI, не менять без причины |
| `../.claude/deployment-knowledge.md` | Актуально | краткая памятка деплоя для Claude |
| `../.claude/commands/load-memory.md` | Актуально | загрузка Knowledge Graph без Supabase/GitHub Pages как текущих источников |
| `../.claude/skills/tradeframe-expert/SKILL.md` | Актуально | локальный skill проекта |
| `../.claude/skills/git-workflow/SKILL.md` | Актуально | git/deploy workflow |
| `../.claude/skills/plane-tasks/SKILL.md` | Актуально | текущий трекер задач TradeFrame |
| `../.claude/skills/youtrack-tasks/SKILL.md` | История | legacy YouTrack, только для старых ссылок |
| `../.claude/skills/russian-code/SKILL.md` | Актуально | русский язык и стиль кода |
