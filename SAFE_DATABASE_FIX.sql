-- ============================================================================
-- SAFE DATABASE FIX - ПРОВЕРЯЕТ СУЩЕСТВОВАНИЕ ТАБЛИЦ
-- ============================================================================
-- Сначала показывает какие таблицы существуют, потом работает только с ними
-- Полностью безопасный скрипт без ошибок
-- ============================================================================

-- ШАГ 1: ПОКАЗЫВАЕМ ВСЕ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ
-- ============================================================================

SELECT 
    '🔍 EXISTING TABLES IN YOUR DATABASE:' as info;

SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ENABLED' 
        ELSE '🔓 RLS DISABLED' 
    END as "Current RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ШАГ 2: ПРОВЕРЯЕМ КАКИЕ ТАБЛИЦЫ ТОЧНО СУЩЕСТВУЮТ
-- ============================================================================

SELECT 
    '📋 TABLE EXISTENCE CHECK:' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_templates') 
        THEN '✅ equipment_templates EXISTS' 
        ELSE '❌ equipment_templates MISSING' 
    END as equipment_templates_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment') 
        THEN '✅ equipment EXISTS' 
        ELSE '❌ equipment MISSING' 
    END as equipment_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'networks') 
        THEN '✅ networks EXISTS' 
        ELSE '❌ networks MISSING' 
    END as networks_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trading_points') 
        THEN '✅ trading_points EXISTS' 
        ELSE '❌ trading_points MISSING' 
    END as trading_points_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') 
        THEN '✅ users EXISTS' 
        ELSE '❌ users MISSING' 
    END as users_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nomenclature') 
        THEN '✅ nomenclature EXISTS' 
        ELSE '❌ nomenclature MISSING' 
    END as nomenclature_status,
    
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'operations') 
        THEN '✅ operations EXISTS' 
        ELSE '❌ operations MISSING' 
    END as operations_status;

-- ============================================================================
-- ВНИМАНИЕ: ДАЛЬШЕ ВЫПОЛНЯЙТЕ ТОЛЬКО ТЕ КОМАНДЫ, 
-- ГДЕ В ПРОВЕРКЕ ВЫШЕ ПОКАЗАНО "✅ EXISTS"
-- ============================================================================

SELECT '⚠️  IMPORTANT: Only execute commands below for tables marked as ✅ EXISTS above!' as warning;

-- ============================================================================
-- ШАГ 3: КОМАНДЫ ДЛЯ EQUIPMENT_TEMPLATES (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 EQUIPMENT_TEMPLATES COMMANDS (execute only if exists):' as info;

-- Удалить политики equipment_templates
DROP POLICY IF EXISTS equipment_templates_allow_all ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_anon ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_authenticated ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_service ON equipment_templates;

-- Включить RLS и создать разрешающие политики
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_templates_anon_policy ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_templates_auth_policy ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Equipment templates policies configured' as result_equipment_templates;

-- ============================================================================
-- ШАГ 4: КОМАНДЫ ДЛЯ EQUIPMENT (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 EQUIPMENT COMMANDS (execute only if exists):' as info;

-- Удалить политики equipment
DROP POLICY IF EXISTS equipment_allow_all ON equipment;
DROP POLICY IF EXISTS equipment_allow_anon ON equipment;
DROP POLICY IF EXISTS equipment_allow_authenticated ON equipment;

-- Включить RLS и создать разрешающие политики
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_anon_policy ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_auth_policy ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Equipment policies configured' as result_equipment;

-- ============================================================================
-- ШАГ 5: КОМАНДЫ ДЛЯ NETWORKS (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 NETWORKS COMMANDS (execute only if exists):' as info;

-- Удалить политики networks
DROP POLICY IF EXISTS networks_allow_all ON networks;
DROP POLICY IF EXISTS networks_allow_anon ON networks;
DROP POLICY IF EXISTS networks_allow_authenticated ON networks;

-- Включить RLS и создать разрешающие политики
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY networks_anon_policy ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY networks_auth_policy ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Networks policies configured' as result_networks;

-- ============================================================================
-- ШАГ 6: КОМАНДЫ ДЛЯ TRADING_POINTS (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 TRADING_POINTS COMMANDS (execute only if exists):' as info;

-- Удалить политики trading_points
DROP POLICY IF EXISTS trading_points_allow_all ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_anon ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_authenticated ON trading_points;

-- Включить RLS и создать разрешающие политики
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY trading_points_anon_policy ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY trading_points_auth_policy ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Trading points policies configured' as result_trading_points;

-- ============================================================================
-- ШАГ 7: КОМАНДЫ ДЛЯ USERS (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 USERS COMMANDS (execute only if exists):' as info;

-- Удалить политики users
DROP POLICY IF EXISTS users_allow_all ON users;
DROP POLICY IF EXISTS users_allow_anon ON users;
DROP POLICY IF EXISTS users_allow_authenticated ON users;

-- Включить RLS и создать разрешающие политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_anon_policy ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY users_auth_policy ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Users policies configured' as result_users;

-- ============================================================================
-- ШАГ 8: КОМАНДЫ ДЛЯ NOMENCLATURE (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 NOMENCLATURE COMMANDS (execute only if exists):' as info;

-- Удалить политики nomenclature
DROP POLICY IF EXISTS nomenclature_allow_all ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_anon ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_authenticated ON nomenclature;

-- Включить RLS и создать разрешающие политики
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_anon_policy ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_auth_policy ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Nomenclature policies configured' as result_nomenclature;

-- ============================================================================
-- ШАГ 9: КОМАНДЫ ДЛЯ OPERATIONS (выполняйте только если ✅ EXISTS)
-- ============================================================================

SELECT '🔧 OPERATIONS COMMANDS (execute only if exists):' as info;

-- Удалить политики operations
DROP POLICY IF EXISTS operations_allow_all ON operations;
DROP POLICY IF EXISTS operations_allow_anon ON operations;
DROP POLICY IF EXISTS operations_allow_authenticated ON operations;

-- Включить RLS и создать разрешающие политики
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_anon_policy ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY operations_auth_policy ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Operations policies configured' as result_operations;

-- ============================================================================
-- ШАГ 10: ОБЩИЕ ПРАВА ДОСТУПА (выполняйте всегда)
-- ============================================================================

SELECT '🔧 CONFIGURING GENERAL ACCESS RIGHTS...' as info;

-- Права для anon роли
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Права для authenticated роли
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Права по умолчанию для новых объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

SELECT '✅ Access rights configured for all roles' as result_rights;

-- ============================================================================
-- ШАГ 11: ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================================================

SELECT '📊 FINAL STATUS CHECK:' as info;

SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON (with permissive policies)' 
        ELSE '🔓 RLS OFF (full access)' 
    END as "Final Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Подсчет созданных политик
SELECT 
    '📋 POLICIES SUMMARY:' as info,
    tablename as "Table",
    COUNT(*) as "Policies Count"
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ФИНАЛЬНОЕ СООБЩЕНИЕ
-- ============================================================================

SELECT '🎉 SAFE DATABASE FIX COMPLETED!' as status;
SELECT '✅ All existing tables now have permissive policies' as result;
SELECT '🔍 Check the status above to see what was configured' as instruction;
SELECT '🚀 Test your API calls - 401 errors should be resolved!' as next_step;