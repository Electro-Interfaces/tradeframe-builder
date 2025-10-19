# Миграции базы данных Supabase

## Как применить миграцию

### Способ 1: Через Supabase Dashboard (рекомендуется)

1. Откройте Supabase Dashboard: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor** (слева в меню)
4. Нажмите **New query**
5. Скопируйте содержимое файла `001_notifications_tables.sql`
6. Вставьте в редактор
7. Нажмите **Run** или `Ctrl+Enter`
8. Дождитесь выполнения (должно показать "Success")

### Способ 2: Через Supabase CLI

```bash
# Если у вас установлен Supabase CLI
supabase db push

# Или напрямую через psql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < supabase-migrations/001_notifications_tables.sql
```

### Способ 3: Используя SQL Direct Tool

```bash
# Используя наш инструмент
node tools/sql-direct.js execute "$(cat supabase-migrations/001_notifications_tables.sql)"
```

## Проверка применения миграции

После выполнения проверьте, что таблицы созданы:

```sql
-- Проверить список таблиц
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'notification%'
ORDER BY table_name;

-- Должны появиться:
-- notification_delivery_log
-- notification_rules
-- notifications
-- role_notification_subscriptions
-- user_notification_settings
-- user_notification_subscriptions
```

Или через SQL Direct Tool:

```bash
node tools/sql-direct.js tables
```

## Откат миграции (при необходимости)

Создан файл для отката:

```sql
-- См. файл 001_notifications_tables_rollback.sql
DROP TABLE IF EXISTS notification_delivery_log CASCADE;
DROP TABLE IF EXISTS user_notification_subscriptions CASCADE;
DROP TABLE IF EXISTS role_notification_subscriptions CASCADE;
DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;
```

## Тестовые данные

После применения миграции можно создать тестовые данные:

```sql
-- См. файл 001_notifications_test_data.sql
```

## Версии миграций

| Версия | Файл | Описание | Дата |
|--------|------|----------|------|
| 001 | `001_notifications_tables.sql` | Создание таблиц системы уведомлений | 2025-10-18 |

## Troubleshooting

### Ошибка: "relation already exists"

Если таблицы уже существуют, нужно либо:
1. Удалить существующие таблицы вручную
2. Использовать `DROP TABLE IF EXISTS` перед созданием
3. Изменить миграцию на `CREATE TABLE IF NOT EXISTS`

### Ошибка: "permission denied"

Убедитесь что вы используете Service Role Key с правами `postgres` роли.

### Ошибка: "foreign key constraint"

Проверьте что таблицы `users`, `roles`, `tenants` уже существуют в базе.
