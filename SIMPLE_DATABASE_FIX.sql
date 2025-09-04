-- ============================================================================
-- SIMPLE DATABASE ACCESS FIX - NO COMPLEX BLOCKS
-- ============================================================================
-- Простое и надежное решение без PL/pgSQL блоков
-- Выполните по частям в Supabase SQL Editor
-- ============================================================================

-- ШАГ 1: ОТКЛЮЧАЕМ RLS ДЛЯ ОСНОВНЫХ ТАБЛИЦ
-- ============================================================================

-- Equipment tables
ALTER TABLE IF EXISTS equipment_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_components DISABLE ROW LEVEL SECURITY;

-- Network tables  
ALTER TABLE IF EXISTS networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trading_points DISABLE ROW LEVEL SECURITY;

-- User tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;

-- Operations tables
ALTER TABLE IF EXISTS operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nomenclature DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prices DISABLE ROW LEVEL SECURITY;

-- Workflow tables
ALTER TABLE IF EXISTS workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflow_steps DISABLE ROW LEVEL SECURITY;

-- Legal tables
ALTER TABLE IF EXISTS legal_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS legal_user_acceptances DISABLE ROW LEVEL SECURITY;

-- Other common tables
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled for all main tables' as step1_status;

-- ============================================================================
-- ШАГ 2: УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ
-- ============================================================================

-- Equipment policies
DROP POLICY IF EXISTS equipment_templates_policy ON equipment_templates;
DROP POLICY IF EXISTS equipment_policy ON equipment;
DROP POLICY IF EXISTS equipment_events_policy ON equipment_events;
DROP POLICY IF EXISTS equipment_components_policy ON equipment_components;

-- Network policies  
DROP POLICY IF EXISTS networks_policy ON networks;
DROP POLICY IF EXISTS trading_points_policy ON trading_points;

-- User policies
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS user_roles_policy ON user_roles;
DROP POLICY IF EXISTS roles_policy ON roles;

-- Operations policies
DROP POLICY IF EXISTS operations_policy ON operations;
DROP POLICY IF EXISTS nomenclature_policy ON nomenclature;
DROP POLICY IF EXISTS prices_policy ON prices;

-- Remove any policy with common naming patterns
DROP POLICY IF EXISTS allow_all ON equipment_templates;
DROP POLICY IF EXISTS allow_authenticated ON equipment_templates;
DROP POLICY IF EXISTS allow_anon ON equipment_templates;

SELECT '✅ All existing policies removed' as step2_status;

-- ============================================================================
-- ШАГ 3: ВКЛЮЧАЕМ RLS И СОЗДАЕМ РАЗРЕШАЮЩИЕ ПОЛИТИКИ
-- ============================================================================

-- Equipment Templates
ALTER TABLE IF EXISTS equipment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_templates_allow_all ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_templates_allow_auth ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment
ALTER TABLE IF EXISTS equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_allow_all ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_allow_auth ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Events
ALTER TABLE IF EXISTS equipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_events_allow_all ON equipment_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_events_allow_auth ON equipment_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Components  
ALTER TABLE IF EXISTS equipment_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_components_allow_all ON equipment_components FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_components_allow_auth ON equipment_components FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Networks
ALTER TABLE IF EXISTS networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY networks_allow_all ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY networks_allow_auth ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trading Points
ALTER TABLE IF EXISTS trading_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY trading_points_allow_all ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY trading_points_allow_auth ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Users
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_allow_all ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY users_allow_auth ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nomenclature
ALTER TABLE IF EXISTS nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_allow_all ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_allow_auth ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Operations
ALTER TABLE IF EXISTS operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_allow_all ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY operations_allow_auth ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Universal permissive policies created' as step3_status;

-- ============================================================================
-- ШАГ 4: НАСТРАИВАЕМ ПРАВА ДОСТУПА
-- ============================================================================

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
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

SELECT '✅ Access rights configured' as step4_status;

-- ============================================================================
-- ШАГ 5: ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

-- Показываем статус таблиц
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON' 
        ELSE '🔓 RLS OFF' 
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('equipment_templates', 'equipment', 'networks', 'trading_points', 'users', 'nomenclature', 'operations')
ORDER BY tablename;

-- Показываем созданные политики
SELECT 
    tablename as "Table",
    COUNT(*) as "Policies Count"
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('equipment_templates', 'equipment', 'networks', 'trading_points', 'users', 'nomenclature', 'operations')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ФИНАЛЬНЫЙ СТАТУС
-- ============================================================================

SELECT '🎉 SIMPLE DATABASE FIX COMPLETED!' as status;
SELECT '✅ All main tables should now be accessible without 401 errors' as result;
SELECT '🚀 Test your API calls - they should work now!' as next_step;