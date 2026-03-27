# План перехода TradeFrame с Supabase на PostgreSQL

## Цель

Перевести локальные данные TradeFrame с Supabase на PostgreSQL на том же сервере, где работает приложение, и оставить для фронтенда только HTTP API через backend.

Целевая схема запросов:

`frontend -> Express backend -> PostgreSQL (localhost)`

## Что берем как эталон из TSupport

Используем как образец проект `D:\Users\magsp\ELSYPLUS\TSupport`.

Полезные паттерны:

- `scripts/lib/db.js` — единый `pg.Pool`, хелперы `query`, `queryOne`, `withTransaction`
- `db/init/*.sql` — версионированные SQL-файлы схемы
- `scripts/routes/v1/*.js` — backend-first REST API
- `scripts/routes/v1/auth.js` — логин/refresh/logout/me через PostgreSQL
- `scripts/lib/auth-middleware.js` — JWT middleware и role checks
- `scripts/migrate-from-tradeframe.js` — отдельный ETL-скрипт, а не миграция "на лету"

Что НЕ переносим как практику:

- hardcoded secrets в коде
- автосоздание таблиц прямо в `server.js` при старте
- смешение legacy/Supabase и новой PG-модели без явного флага источника данных

## Объем данных для миграции

По текущему коду TradeFrame нужно перенести:

- `users`
- `roles`
- `user_roles`
- `tenants`
- `equipment`
- `equipment_templates`
- `document_types`
- `document_versions`
- `user_document_acceptances`
- `user_legal_statuses`
- `nomenclature`
- `nomenclature_external_codes`
- `notification_rules`
- `notifications`
- `notification_delivery_log`
- `user_notification_settings`
- `user_notification_subscriptions`
- `role_notification_subscriptions`
- `telegram_link_codes`
- `broadcast_messages`
- `message_recipients`
- `tank_calibration_settings`
- `audit_log`

Не переносим как данные БД:

- STS API данные
- MSTO API данные
- TradeCorp API данные
- TSupport SDK данные

## Ключевое архитектурное решение

`tenants` не переносим как есть.

Новая модель:

- `networks`
- `trading_points`
- `trading_point_external_codes`

Правила совместимости:

- сохранить `users.id`, `roles.id`, `user_roles.user_id`, `user_roles.role_id`
- сохранить `networks.id = tenants.id`
- сохранить публичный ID торговой точки в текущем строковом формате `${networkCode}-azs-${stationCode}`
- сохранить `pwd_salt` и `pwd_hash` на первом этапе, чтобы не делать принудительный сброс паролей

## Порядок исполнения

### Этап 0. Freeze и подготовка

Задачи:

- заморозить изменения схемы Supabase
- не добавлять новых `supabase`-вызовов во фронт и backend
- подготовить `DATA_SOURCE=supabase|pg`
- зафиксировать перечень таблиц и связей

Проверка:

- список таблиц утвержден
- подтверждено, что `operations` не является обязательной таблицей миграции или включена отдельным решением

### Этап 1. PG-каркас в backend

Задачи:

- создать `server/db/pool.js`
- создать `server/db/migrations/`
- создать `server/repositories/`
- создать `server/services/auth/`
- добавить проверку подключения к PostgreSQL в `/health`

Проверка:

- backend стартует без Supabase-зависимости для нового `pg`-слоя
- `/health` показывает статус PostgreSQL
- локальный `SELECT 1` проходит

### Этап 2. Auth, Users, Roles

Задачи:

- реализовать таблицы:
  - `users`
  - `roles`
  - `user_roles`
  - `sessions` или `refresh_tokens`
- сделать backend routes:
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/auth/change-password`
  - `/api/auth/users/by-email`
  - `/api/users`
  - `/api/roles`
- перевести фронт с прямого Supabase на HTTP API через совместимый feature flag

Основные файлы замены:

- `src/services/auth/authService.ts`
- `src/contexts/NewAuthContext.tsx`
- `src/services/usersSupabaseService.ts`
- `src/services/roleService.ts`

Проверка:

- логин/логаут работают через backend
- роли и права совпадают с текущими
- пользователь после refresh страницы остается авторизован
- при `DATA_SOURCE=supabase` поведение остается совместимым с текущим продом

#### Флаги безопасного включения

- frontend:
  - `VITE_AUTH_API_MODE=legacy|backend`
  - `VITE_ADMIN_API_MODE=legacy|backend`
- backend:
  - `AUTH_DATA_SOURCE=supabase|pg`
  - `DATA_SOURCE=supabase|pg`
  - `JWT_SECRET`

Порядок активации:

1. задеплоить backend auth при `AUTH_DATA_SOURCE=supabase`
2. включить `VITE_AUTH_API_MODE=backend` только на стенде
3. включить `VITE_ADMIN_API_MODE=backend` только на стенде
4. проверить логин, logout, refresh страницы, смену имени, смену пароля, CRUD пользователей и ролей
5. только потом включать backend auth/admin API на production
6. после ETL переключать backend на `AUTH_DATA_SOURCE=pg`

Важно:

- первое включение `VITE_AUTH_API_MODE=backend` приведет к разовому re-login для существующих legacy-сессий, потому что старые клиентские `authToken` не являются серверными токенами

Команды rehearsal:

```bash
cd server
npm run db:migrate
npm run etl:auth:export
npm run etl:auth:load -- --reset
npm run etl:auth:validate
```

### Этап 3. Networks и Trading Points

Задачи:

- реализовать таблицы:
  - `networks`
  - `trading_points`
  - `trading_point_external_codes`
- написать ETL `tenants -> networks + trading_points + trading_point_external_codes`
- перевести фронтовые сервисы сетей и точек на HTTP API

Основные файлы замены:

- `src/services/networksService.ts`
- `src/services/tradingPointsService.ts`
- `src/contexts/SelectionContext.tsx`

Проверка:

- список сетей совпадает
- список точек совпадает
- RBAC по `scope_value/scope_values` не ломается
- выбор сети и точки сохраняется корректно

#### Флаги безопасного включения

- frontend:
  - `VITE_ORG_API_MODE=legacy|backend`
- backend:
  - `ORG_DATA_SOURCE=supabase|pg`
  - `DATA_SOURCE=supabase|pg`

Порядок активации:

1. задеплоить backend routes `/api/networks` и `/api/trading-points` при `ORG_DATA_SOURCE=supabase`
2. включить `VITE_ORG_API_MODE=backend` только на стенде
3. проверить списки сетей, списки точек, выбор сети/точки и сценарии с ограничениями по ролям
4. выполнить rehearsal ETL в PostgreSQL
5. после сверки counts и бизнес-сценариев переключать backend на `ORG_DATA_SOURCE=pg`

Команды rehearsal:

```bash
cd server
npm run db:migrate
npm run etl:org:export
npm run etl:org:transform
npm run etl:org:load -- --reset
npm run etl:org:validate
```

### Этап 4. Equipment, Legal, Nomenclature

Задачи:

- реализовать таблицы:
  - `equipment`
  - `equipment_templates`
  - `tank_calibration_settings`
  - `document_types`
  - `document_versions`
  - `user_document_acceptances`
  - `user_legal_statuses`
  - `nomenclature`
  - `nomenclature_external_codes`
- сделать backend routes для этих модулей
- перевести фронт на HTTP API

Основные файлы замены:

- `src/services/equipmentSupabase.ts`
- `src/services/equipmentTypes.ts`
- `src/services/legalDocumentsSupabaseService.ts`
- `src/services/nomenclatureApiService.ts`
- `server/routes/tankCalibration.js`

Проверка:

- CRUD по оборудованию работает
- калибровка резервуаров работает
- юридические документы открываются и сохраняются
- номенклатура и внешние коды не теряются

#### Флаги безопасного включения

- frontend:
  - `VITE_LEGAL_API_MODE=legacy|backend`
  - `VITE_NOMENCLATURE_API_MODE=legacy|backend`
- backend:
  - `LEGAL_DATA_SOURCE=supabase|pg`
  - `NOMENCLATURE_DATA_SOURCE=supabase|pg`
  - `DATA_SOURCE=supabase|pg`

Порядок активации для правовых документов:

1. задеплоить backend route `/api/legal` при `LEGAL_DATA_SOURCE=supabase`
2. включить `VITE_LEGAL_API_MODE=backend` только на стенде
3. проверить login page с загрузкой актуальных документов, acceptance flow после логина, `LegalConsentGuard`, список документов, создание черновика, публикацию и журнал согласий
4. выполнить rehearsal ETL в PostgreSQL
5. после сверки counts и smoke-сценариев переключать backend на `LEGAL_DATA_SOURCE=pg`

Команды rehearsal для правовых документов:

```bash
cd server
npm run db:migrate
npm run etl:legal:export
npm run etl:legal:load -- --reset
npm run etl:legal:validate
```

Порядок активации для номенклатуры:

1. задеплоить backend route `/api/nomenclature` при `NOMENCLATURE_DATA_SOURCE=supabase`
2. включить `VITE_NOMENCLATURE_API_MODE=backend` только на стенде
3. проверить список номенклатуры, создание, редактирование, архив/активацию и работу выбора топлива в equipment-формах
4. выполнить rehearsal ETL в PostgreSQL
5. после сверки counts и smoke-сценариев переключать backend на `NOMENCLATURE_DATA_SOURCE=pg`

Команды rehearsal для номенклатуры:

```bash
cd server
npm run db:migrate
npm run etl:nomenclature:export
npm run etl:nomenclature:load -- --reset
npm run etl:nomenclature:validate
```

### Этап 5. Notifications, Messaging, Audit

Задачи:

- реализовать таблицы:
  - `notification_rules`
  - `notifications`
  - `notification_delivery_log`
  - `user_notification_settings`
  - `user_notification_subscriptions`
  - `role_notification_subscriptions`
  - `telegram_link_codes`
  - `broadcast_messages`
  - `message_recipients`
  - `audit_log`
- перевести backend-роуты и engine с Supabase на PG

Основные файлы замены:

- `server/services/notificationEngine.js`
- `server/routes/telegramRuntime.js`
- `server/routes/messagesRuntime.js`
- `server/routes/audit.js`
- `src/services/auditLogSupabaseService.ts`

Проверка:

- Telegram linkage работает
- настройки уведомлений читаются и сохраняются через backend
- правила уведомлений читаются и редактируются через backend
- уведомления читаются и помечаются прочитанными через backend
- массовые сообщения создаются, отправляются и читаются через backend
- журнал аудита создается и читается через backend

#### Флаги безопасного включения

- frontend:
  - отдельный feature flag не нужен: `messageService` уже backend-first, `notificationService` переведен на backend-first
  - `VITE_AUDIT_API_MODE=legacy|backend`
- backend:
  - `NOTIFICATION_DATA_SOURCE=supabase|pg`
  - `MESSAGING_DATA_SOURCE=supabase|pg`
  - `AUDIT_DATA_SOURCE=supabase|pg`
  - `DATA_SOURCE=supabase|pg`

Порядок активации:

1. задеплоить backend routes `/api/telegram/*` и `/api/messages/*` при `NOTIFICATION_DATA_SOURCE=supabase` и `MESSAGING_DATA_SOURCE=supabase`
2. только после этого выкатывать frontend сборку с новым `notificationService`
3. на стенде проверить страницы уведомлений, Telegram linking, тестовую отправку, создание/отправку broadcast message и чтение статистики
4. выполнить rehearsal ETL в PostgreSQL
5. после сверки counts и smoke-сценариев переключать backend на `NOTIFICATION_DATA_SOURCE=pg`
6. отдельно после этого переключать backend на `MESSAGING_DATA_SOURCE=pg`
7. отдельно после этого включать `VITE_AUDIT_API_MODE=backend` на стенде и только потом переключать `AUDIT_DATA_SOURCE=pg`

Команды rehearsal:

```bash
cd server
npm run db:migrate
npm run etl:notifications:export
npm run etl:notifications:load -- --reset
npm run etl:notifications:validate
npm run etl:messaging:export
npm run etl:messaging:load -- --reset
npm run etl:messaging:validate
npm run etl:audit:export
npm run etl:audit:load -- --reset
npm run etl:audit:validate
```

Важно:

- текущий runtime-контур `notifications/messaging` уже готов к staged rollout через backend source switch
- текущий runtime-контур `audit_log` готов к staged rollout через `VITE_AUDIT_API_MODE` + backend source switch
- `notificationEngine.js` и `notificationScheduler.js` пока еще остаются на legacy Supabase-контуре и завязаны на `tenants.settings.stations[]`
- финальный cutover по блоку уведомлений нельзя считать завершенным, пока `notificationEngine` не уйдет с legacy `tenants`

### Этап 6. Cutover rehearsal

Задачи:

- подготовить ETL-скрипты:
  - `export-supabase.js`
  - `transform-tenants.js`
  - `load-pg.js`
  - `validate-migration.js`
- прогнать полную миграцию на staging
- сделать минимум два rehearsal-прогона

Проверка:

- row count по таблицам совпадает
- случайная выборка записей совпадает
- критические сценарии проходят smoke test

### Этап 7. Production cutover

Задачи:

- включить maintenance mode
- снять финальный snapshot из Supabase
- прогнать финальный ETL
- переключить backend на `DATA_SOURCE=pg`
- выкатить frontend без прямой зависимости от Supabase

Проверка:

- login
- users/roles
- networks/trading points
- equipment
- legal docs
- notifications
- messages
- audit

### Этап 8. Stabilization

Задачи:

- держать Supabase как источник отката 2-4 недели
- сравнивать данные PG и Supabase по критическим сущностям
- после стабилизации удалить:
  - `src/services/supabaseServiceClient.ts`
  - `src/config/supabaseConfig.ts`
  - `server/routes/supabase.js`

Проверка:

- нет вызовов Supabase в runtime-коде
- все модули работают через backend + PostgreSQL

## Порядок будущих SQL-файлов

- `001_extensions.sql`
- `010_users_roles.sql`
- `020_networks_trading_points.sql`
- `030_equipment.sql`
- `040_legal.sql`
- `050_nomenclature.sql`
- `060_notifications.sql`
- `070_messaging.sql`
- `080_audit.sql`
- `090_indexes_constraints.sql`

## Порядок ETL-скриптов

- `01_export_users_roles.js`
- `02_export_tenants.js`
- `03_transform_tenants.js`
- `04_export_equipment_legal_catalog.js`
- `05_export_notifications_messaging_audit.js`
- `06_load_core.js`
- `07_load_networks_points.js`
- `08_load_modules.js`
- `09_validate_counts.js`
- `10_validate_business_rules.js`

## Правило выполнения

Переход выполняем только последовательно.

После каждого этапа:

1. кодовая проверка
2. smoke test
3. фиксация результатов
4. только потом следующий этап

## Текущее состояние

- эталонный `pg`-подход в `TSupport` изучен
- в `TradeFrame` уже есть:
  - `server/db/pool.js`
  - `server/db/migrate.js`
  - `server/db/migrations/001_extensions.sql`
  - `server/db/migrations/010_users_roles.sql`
  - `server/db/migrations/020_networks_trading_points.sql`
  - `server/db/migrations/030_equipment.sql`
  - `server/db/migrations/040_legal.sql`
  - `server/db/migrations/050_nomenclature.sql`
  - `/health` с проверкой PostgreSQL
  - совместимый `/api/auth/*` backend-слой с переключением `Supabase/PG`
  - совместимые `/api/networks`, `/api/trading-points`, `/api/users`, `/api/roles`
  - совместимый `/api/legal` backend-слой с переключением `Supabase/PG`
  - совместимый `/api/nomenclature` backend-слой с переключением `Supabase/PG`
  - совместимый `/api/tank-calibration` backend-слой с переключением `Supabase/PG`
  - совместимый `/api/telegram/*` backend-слой с переключением `Supabase/PG`
  - совместимый `/api/messages/*` backend-слой с переключением `Supabase/PG`
  - совместимый `/api/audit/*` backend-слой с переключением `Supabase/PG`
  - frontend auth-адаптер с режимами `legacy/backend`
  - backend-first `notificationService` без прямого runtime-доступа к Supabase
  - feature-flagged `auditLogService` через `VITE_AUDIT_API_MODE`
  - ETL-команды `etl:notifications:*` и `etl:messaging:*`
  - ETL-команды `etl:audit:*`
- следующий шаг:
  - поднять PostgreSQL на стенде и прогнать `db:migrate`
  - выполнить rehearsal `etl:auth:*`, `etl:org:*`, `etl:legal:*`, `etl:nomenclature:*`, `etl:tank-calibration:*`, `etl:notifications:*`, `etl:messaging:*`, `etl:audit:*`
  - включать `VITE_AUTH_API_MODE`, `VITE_ADMIN_API_MODE`, `VITE_ORG_API_MODE`, `VITE_LEGAL_API_MODE`, `VITE_NOMENCLATURE_API_MODE`, `VITE_AUDIT_API_MODE` только по очереди на staging
  - после успешного rehearsal переключать backend source flags по одному модулю: `AUTH_DATA_SOURCE`, `ORG_DATA_SOURCE`, `LEGAL_DATA_SOURCE`, `NOMENCLATURE_DATA_SOURCE`, `NOTIFICATION_DATA_SOURCE`, `MESSAGING_DATA_SOURCE`, `AUDIT_DATA_SOURCE`
  - следующим отдельным этапом переписать `notificationEngine` с legacy `tenants.settings.stations[]` на новую org-модель
