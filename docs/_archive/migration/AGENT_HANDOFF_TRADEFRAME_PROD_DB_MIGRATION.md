# Handoff: миграция калибровочных таблиц в реальную БД TradeFrame

Дата фиксации: 2026-03-10

## Что уже сделано локально

- В репозитории добавлена миграция [server/db/migrations/100_tank_calibration_tables.sql](/D:/Users/magsp/ELSYPLUS/TradeFrame/server/db/migrations/100_tank_calibration_tables.sql)
- Локально миграция уже применена в dev-БД из `server/.env`
- Локально проверки прошли:
  - `npm run lint`
  - `npm run type-check`
  - `npx vitest run src/utils/__tests__/calibrationAlgorithm.test.ts src/utils/__tests__/calibrationHelpers.test.ts`

## Что уже проверено по SSH

Проверялся хост:

- `root@81.200.148.35`

Что найдено:

- там поднят runtime `tradelink-hub`, а не `TradeFrame`
- рабочий путь: `/opt/tradelink/hub`
- `DATABASE_URL` на этом хосте: `postgresql://tradelink:tradelink@localhost:5433/tradelink`
- контейнер БД: `tradelink-hub-db-1`

Readonly-проверка схемы показала:

- `users` существует
- `tank_calibration_settings` не существует
- `roles` не существует
- `schema_migrations` не существует

Вывод:

- это не целевая БД `TradeFrame`
- миграцию из этого репозитория на этот target применять нельзя

## Что нужно сделать другому агенту

Найти правильную production или test БД именно для `TradeFrame`, а не для `tradelink-hub`.

Нужно получить хотя бы одно из:

- правильный SSH-хост для `TradeFrame`
- путь до deployed backend `TradeFrame`
- `DATABASE_URL` нужной среды
- имя docker-контейнера с нужной БД

## Безопасный порядок действий

1. Подключиться к правильному хосту или контейнеру только в readonly-режиме.
2. Проверить, что это именно БД `TradeFrame`.
3. Проверить наличие таблиц:
   - `tank_calibration_settings`
   - `users`
   - `roles`
   - `schema_migrations`
4. Проверить, не применена ли уже миграция `100_tank_calibration_tables.sql`.
5. Сделать backup метаданных перед изменением:
   - дамп схемы
   - дамп только таблицы `schema_migrations`
6. Применить только одну миграцию:
   - `100_tank_calibration_tables.sql`
7. После применения проверить:
   - таблица `tank_calibration_tables` существует
   - индекс `idx_tank_calibration_tables_active_unique` существует
   - триггер `trg_tank_calibration_tables_set_updated_at` существует
   - в `schema_migrations` есть запись про `100_tank_calibration_tables.sql`
8. Ничего не деплоить и не перезапускать без отдельного подтверждения.

## Команды-шаблоны для правильной среды

Readonly-проверка:

```bash
psql "$DATABASE_URL" -c "
select current_database(), current_user;
select
  to_regclass('public.tank_calibration_settings') as tank_calibration_settings,
  to_regclass('public.users') as users,
  to_regclass('public.roles') as roles,
  to_regclass('public.schema_migrations') as schema_migrations,
  to_regclass('public.tank_calibration_tables') as tank_calibration_tables;
"
```

Проверка статуса миграции:

```bash
psql "$DATABASE_URL" -c "
select filename, applied_at
from schema_migrations
where filename = '100_tank_calibration_tables.sql';
"
```

Backup метаданных:

```bash
pg_dump "$DATABASE_URL" --schema-only > tradeframe_schema_before_tank_calibration_tables.sql
psql "$DATABASE_URL" -c "
copy (
  select filename, checksum, applied_at
  from schema_migrations
  order by filename
) to stdout with csv header
" > schema_migrations_before_tank_calibration_tables.csv
```

Применение миграции:

```bash
psql "$DATABASE_URL" -f server/db/migrations/100_tank_calibration_tables.sql
```

Проверка после применения:

```bash
psql "$DATABASE_URL" -c "
select to_regclass('public.tank_calibration_tables') as table_name;
select indexname from pg_indexes where tablename = 'tank_calibration_tables';
select trigger_name from information_schema.triggers where event_object_table = 'tank_calibration_tables';
select filename, applied_at
from schema_migrations
where filename = '100_tank_calibration_tables.sql';
"
```

## Что важно не забыть

- не применять миграцию на `tradelink-hub`
- не выкладывать код ради одной SQL-миграции
- не запускать массовые миграции без проверки статуса
- сначала доказать, что целевая БД совпадает со схемой этого репозитория

## Локальный источник истины

- миграция: [server/db/migrations/100_tank_calibration_tables.sql](/D:/Users/magsp/ELSYPLUS/TradeFrame/server/db/migrations/100_tank_calibration_tables.sql)
- backend route: [server/routes/tankCalibration.js](/D:/Users/magsp/ELSYPLUS/TradeFrame/server/routes/tankCalibration.js)
- backend PG source: [server/services/tankCalibration/tankCalibrationTablePgSource.js](/D:/Users/magsp/ELSYPLUS/TradeFrame/server/services/tankCalibration/tankCalibrationTablePgSource.js)
