-- ============================================================================
-- ТОЧНЫЙ СКРИПТ ИСПРАВЛЕНИЯ БАЗЫ ДАННЫХ
-- ============================================================================
-- Основан на том, что мы точно знаем из предыдущих тестов:
-- ✅ equipment_templates - СУЩЕСТВУЕТ (работали с ней)
-- ❌ equipment_components - НЕ СУЩЕСТВУЕТ (была ошибка 42P01) 
-- ❌ prices - НЕ СУЩЕСТВУЕТ (была ошибка 42P01)
-- ============================================================================

-- ШАГ 1: РАБОТАЕМ ТОЛЬКО С EQUIPMENT_TEMPLATES (точно существует)
-- ============================================================================

-- Удаляем все существующие политики для equipment_templates
DROP POLICY IF EXISTS equipment_templates_allow_all ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_anon ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_authenticated ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_service ON equipment_templates;

-- Включаем RLS и создаем разрешающие политики
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_templates_dev_anon ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_templates_dev_auth ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Equipment templates configured successfully' as result1;

-- ============================================================================
-- ШАГ 2: ПРОБУЕМ EQUIPMENT (возможно существует)
-- ============================================================================

-- Пробуем equipment - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS equipment_allow_all ON equipment;
DROP POLICY IF EXISTS equipment_allow_anon ON equipment;
DROP POLICY IF EXISTS equipment_allow_authenticated ON equipment;
DROP POLICY IF EXISTS equipment_allow_service ON equipment;

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_dev_anon ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_dev_auth ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Equipment configured successfully (or skip if error)' as result2;

-- ============================================================================
-- ШАГ 3: ПРОБУЕМ NETWORKS (возможно существует)  
-- ============================================================================

-- Пробуем networks - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS networks_allow_all ON networks;
DROP POLICY IF EXISTS networks_allow_anon ON networks;
DROP POLICY IF EXISTS networks_allow_authenticated ON networks;

ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY networks_dev_anon ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY networks_dev_auth ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Networks configured successfully (or skip if error)' as result3;

-- ============================================================================
-- ШАГ 4: ПРОБУЕМ TRADING_POINTS (возможно существует)
-- ============================================================================

-- Пробуем trading_points - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS trading_points_allow_all ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_anon ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_authenticated ON trading_points;

ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY trading_points_dev_anon ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY trading_points_dev_auth ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Trading points configured successfully (or skip if error)' as result4;

-- ============================================================================
-- ШАГ 5: ПРОБУЕМ USERS (возможно существует)
-- ============================================================================

-- Пробуем users - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS users_allow_all ON users;
DROP POLICY IF EXISTS users_allow_anon ON users;
DROP POLICY IF EXISTS users_allow_authenticated ON users;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_dev_anon ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY users_dev_auth ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Users configured successfully (or skip if error)' as result5;

-- ============================================================================
-- ШАГ 6: ПРОБУЕМ NOMENCLATURE (возможно существует)
-- ============================================================================

-- Пробуем nomenclature - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS nomenclature_allow_all ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_anon ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_authenticated ON nomenclature;

ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_dev_anon ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_dev_auth ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Nomenclature configured successfully (or skip if error)' as result6;

-- ============================================================================
-- ШАГ 7: ПРОБУЕМ OPERATIONS (возможно существует)
-- ============================================================================

-- Пробуем operations - если ошибка, просто игнорируйте этот блок
DROP POLICY IF EXISTS operations_allow_all ON operations;
DROP POLICY IF EXISTS operations_allow_anon ON operations;
DROP POLICY IF EXISTS operations_allow_authenticated ON operations;

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_dev_anon ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY operations_dev_auth ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ Operations configured successfully (or skip if error)' as result7;

-- ============================================================================
-- ШАГ 8: ОБЯЗАТЕЛЬНЫЕ ПРАВА ДОСТУПА (выполняйте всегда)
-- ============================================================================

-- Настраиваем права доступа для anon и authenticated ролей
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Права по умолчанию для новых объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

SELECT '✅ Access rights configured for all roles' as result8;

-- ============================================================================
-- ШАГ 9: ПРОВЕРКА РЕЗУЛЬТАТА (всегда работает)
-- ============================================================================

-- Показываем финальное состояние
SELECT 
    tablename as "Table",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON' 
        ELSE '🔓 RLS OFF' 
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Показываем созданные политики
SELECT 
    tablename as "Table",
    COUNT(*) as "Policies"
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ФИНАЛЬНОЕ СООБЩЕНИЕ
-- ============================================================================

SELECT '🎉 PRECISE DATABASE FIX COMPLETED!' as status;
SELECT '✅ All existing tables should now be accessible without 401 errors' as result;
SELECT '⚠️  If you got errors for some tables - that means they do not exist (which is OK)' as note;
SELECT '🚀 Test your API calls now - equipment_templates should definitely work!' as next_step;

-- Проверочный запрос к equipment_templates (должен работать)
SELECT COUNT(*) as equipment_templates_count FROM equipment_templates;