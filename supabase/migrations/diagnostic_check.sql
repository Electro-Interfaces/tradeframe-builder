-- ============================================================================
-- ДИАГНОСТИКА ТЕКУЩЕГО СОСТОЯНИЯ БД - СИСТЕМА УВЕДОМЛЕНИЙ
-- ============================================================================
-- Запустите этот скрипт чтобы понять что уже есть в базе данных

-- 1. Проверка существующих таблиц
SELECT 'EXISTING TABLES:' as check_type;
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%notification%'
ORDER BY tablename;

-- 2. Проверка существующих индексов
SELECT '' as separator;
SELECT 'EXISTING INDEXES:' as check_type;
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE '%notification%' OR indexname LIKE '%notification%')
ORDER BY tablename, indexname;

-- 3. Структура user_notification_settings (если существует)
SELECT '' as separator;
SELECT 'COLUMNS IN user_notification_settings:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_notification_settings'
ORDER BY ordinal_position;

-- 4. Структура user_notification_subscriptions (если существует)
SELECT '' as separator;
SELECT 'COLUMNS IN user_notification_subscriptions:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_notification_subscriptions'
ORDER BY ordinal_position;

-- 5. Структура notification_rules (если существует)
SELECT '' as separator;
SELECT 'COLUMNS IN notification_rules:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notification_rules'
ORDER BY ordinal_position;

-- 6. Структура notifications (если существует)
SELECT '' as separator;
SELECT 'COLUMNS IN notifications:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 7. Проверка существующих RLS политик
SELECT '' as separator;
SELECT 'EXISTING RLS POLICIES:' as check_type;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%notification%'
ORDER BY tablename, policyname;

-- 8. Проверка существующих триггеров
SELECT '' as separator;
SELECT 'EXISTING TRIGGERS:' as check_type;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table LIKE '%notification%'
ORDER BY event_object_table, trigger_name;
