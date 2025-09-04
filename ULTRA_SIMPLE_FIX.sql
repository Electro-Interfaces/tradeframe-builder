-- ============================================================================
-- ULTRA SIMPLE DATABASE FIX - NO BLOCKS, NO ERRORS
-- ============================================================================
-- Самое простое решение для устранения 401 ошибок
-- Выполните по частям, игнорируя ошибки о несуществующих таблицах
-- ============================================================================

-- ПОКАЗАТЬ ВСЕ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ОТКЛЮЧИТЬ RLS ДЛЯ ВСЕХ ВОЗМОЖНЫХ ТАБЛИЦ (игнорируйте ошибки)
ALTER TABLE equipment_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE networks DISABLE ROW LEVEL SECURITY;  
ALTER TABLE trading_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE nomenclature DISABLE ROW LEVEL SECURITY;
ALTER TABLE operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;

-- УДАЛИТЬ ВСЕ ПОЛИТИКИ (игнорируйте ошибки)
DROP POLICY IF EXISTS equipment_templates_allow_all ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_anon ON equipment_templates;  
DROP POLICY IF EXISTS equipment_templates_allow_authenticated ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_service ON equipment_templates;
DROP POLICY IF EXISTS equipment_allow_all ON equipment;
DROP POLICY IF EXISTS equipment_allow_anon ON equipment;
DROP POLICY IF EXISTS equipment_allow_authenticated ON equipment;
DROP POLICY IF EXISTS equipment_allow_service ON equipment;
DROP POLICY IF EXISTS networks_allow_all ON networks;
DROP POLICY IF EXISTS users_allow_all ON users;
DROP POLICY IF EXISTS nomenclature_allow_all ON nomenclature;

-- ВКЛЮЧИТЬ RLS И СОЗДАТЬ РАЗРЕШАЮЩИЕ ПОЛИТИКИ
-- Equipment Templates
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_templates_open ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_templates_open_auth ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment  
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_open ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_open_auth ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Networks
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY networks_open ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY networks_open_auth ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trading Points
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY trading_points_open ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY trading_points_open_auth ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_open ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY users_open_auth ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nomenclature
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_open ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_open_auth ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Operations
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_open ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY operations_open_auth ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- НАСТРОИТЬ ПРАВА ДОСТУПА
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ПРОВЕРИТЬ РЕЗУЛЬТАТ
SELECT 
    tablename as "Table",
    CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END as "Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ГОТОВО!
SELECT '🎉 ULTRA SIMPLE FIX COMPLETED!' as result;
SELECT '✅ Try your API calls now - they should work!' as next_step;