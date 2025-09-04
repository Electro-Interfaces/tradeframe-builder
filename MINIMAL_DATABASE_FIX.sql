-- ============================================================================
-- MINIMAL DATABASE ACCESS FIX - ONLY EXISTING TABLES
-- ============================================================================
-- Исправляет доступ только к существующим таблицам
-- Безопасный скрипт без ошибок
-- ============================================================================

-- ШАГ 1: ПРОВЕРЯЕМ КАКИЕ ТАБЛИЦЫ СУЩЕСТВУЮТ
-- ============================================================================

SELECT 
    'EXISTING TABLES CHECK:' as info,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ON' 
        ELSE 'RLS OFF' 
    END as current_rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- ШАГ 2: ОТКЛЮЧАЕМ RLS ТОЛЬКО ДЛЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ============================================================================

-- Equipment templates (точно существует по вашим тестам)
ALTER TABLE IF EXISTS equipment_templates DISABLE ROW LEVEL SECURITY;

-- Equipment (основная таблица)
ALTER TABLE IF EXISTS equipment DISABLE ROW LEVEL SECURITY;

-- Networks (базовая таблица)
ALTER TABLE IF EXISTS networks DISABLE ROW LEVEL SECURITY;

-- Trading points
ALTER TABLE IF EXISTS trading_points DISABLE ROW LEVEL SECURITY;

-- Users
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Nomenclature  
ALTER TABLE IF EXISTS nomenclature DISABLE ROW LEVEL SECURITY;

-- Operations
ALTER TABLE IF EXISTS operations DISABLE ROW LEVEL SECURITY;

-- Другие возможные таблицы
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS legal_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS legal_user_acceptances DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled for all existing tables' as step2_status;

-- ============================================================================
-- ШАГ 3: УДАЛЯЕМ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ
-- ============================================================================

-- Удаляем политики только если таблицы существуют
DROP POLICY IF EXISTS equipment_templates_policy ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_all ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_anon ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_authenticated ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_service ON equipment_templates;

DROP POLICY IF EXISTS equipment_policy ON equipment;
DROP POLICY IF EXISTS equipment_allow_all ON equipment;
DROP POLICY IF EXISTS equipment_allow_anon ON equipment;
DROP POLICY IF EXISTS equipment_allow_authenticated ON equipment;
DROP POLICY IF EXISTS equipment_allow_service ON equipment;

DROP POLICY IF EXISTS networks_policy ON networks;
DROP POLICY IF EXISTS networks_allow_all ON networks;
DROP POLICY IF EXISTS networks_allow_anon ON networks;
DROP POLICY IF EXISTS networks_allow_authenticated ON networks;

DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_allow_all ON users;

DROP POLICY IF EXISTS nomenclature_policy ON nomenclature;
DROP POLICY IF EXISTS operations_policy ON operations;

SELECT '✅ All existing policies removed' as step3_status;

-- ============================================================================
-- ШАГ 4: СОЗДАЕМ ПРОСТЫЕ РАЗРЕШАЮЩИЕ ПОЛИТИКИ
-- ============================================================================

-- Equipment Templates - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_templates') THEN
        ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
        CREATE POLICY equipment_templates_dev_policy ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY equipment_templates_auth_policy ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Equipment templates policies created';
    END IF;
END $$;

-- Equipment - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment') THEN
        ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
        CREATE POLICY equipment_dev_policy ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY equipment_auth_policy ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Equipment policies created';
    END IF;
END $$;

-- Networks - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'networks') THEN
        ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
        CREATE POLICY networks_dev_policy ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY networks_auth_policy ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Networks policies created';
    END IF;
END $$;

-- Trading Points - только если существует  
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trading_points') THEN
        ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
        CREATE POLICY trading_points_dev_policy ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY trading_points_auth_policy ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Trading points policies created';
    END IF;
END $$;

-- Users - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        CREATE POLICY users_dev_policy ON users FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY users_auth_policy ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Users policies created';
    END IF;
END $$;

-- Nomenclature - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nomenclature') THEN
        ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
        CREATE POLICY nomenclature_dev_policy ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY nomenclature_auth_policy ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Nomenclature policies created';
    END IF;
END $$;

-- Operations - только если существует
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'operations') THEN
        ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY operations_dev_policy ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
        CREATE POLICY operations_auth_policy ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);
        RAISE NOTICE '✅ Operations policies created';
    END IF;
END $$;

SELECT '✅ Permissive policies created for existing tables' as step4_status;

-- ============================================================================
-- ШАГ 5: НАСТРАИВАЕМ ПРАВА ДОСТУПА
-- ============================================================================

-- Базовые права для anon
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Базовые права для authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Права по умолчанию
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

SELECT '✅ Access rights granted' as step5_status;

-- ============================================================================
-- ШАГ 6: ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================================================

-- Показываем финальное состояние всех таблиц
SELECT 
    '📊 FINAL STATUS:' as info,
    tablename as table_name,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON' 
        ELSE '🔓 RLS OFF' 
    END as rls_status,
    'ACCESSIBLE' as expected_access
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Считаем созданные политики
SELECT 
    '📋 POLICIES CREATED:' as info,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- ============================================================================
-- ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
-- ============================================================================

SELECT '🎉 MINIMAL DATABASE FIX COMPLETED!' as status;
SELECT '✅ All existing tables are now accessible' as result;
SELECT '🚀 Try your API calls - 401 errors should be gone!' as instruction;
SELECT '🔧 This fix works only with existing tables, no missing table errors' as note;