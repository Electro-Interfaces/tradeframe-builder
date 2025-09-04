-- ============================================================================
-- ТОЧНЫЙ СКРИПТ ДЛЯ ВСЕХ ТАБЛИЦ ИЗ SUPABASE TABLE EDITOR
-- ============================================================================
-- Основан на скриншоте - все эти таблицы существуют и помечены "Unrestricted"
-- Создаем разрешающие RLS политики для ВСЕХ видимых таблиц
-- ============================================================================

-- ШАГ 1: УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ
-- ============================================================================

-- Components
DROP POLICY IF EXISTS components_allow_all ON components;
DROP POLICY IF EXISTS components_allow_anon ON components;
DROP POLICY IF EXISTS components_allow_authenticated ON components;

-- Document Types
DROP POLICY IF EXISTS document_types_allow_all ON document_types;
DROP POLICY IF EXISTS document_types_allow_anon ON document_types;
DROP POLICY IF EXISTS document_types_allow_authenticated ON document_types;

-- Document Versions
DROP POLICY IF EXISTS document_versions_allow_all ON document_versions;
DROP POLICY IF EXISTS document_versions_allow_anon ON document_versions;
DROP POLICY IF EXISTS document_versions_allow_authenticated ON document_versions;

-- Equipment
DROP POLICY IF EXISTS equipment_allow_all ON equipment;
DROP POLICY IF EXISTS equipment_allow_anon ON equipment;
DROP POLICY IF EXISTS equipment_allow_authenticated ON equipment;

-- Equipment Events
DROP POLICY IF EXISTS equipment_events_allow_all ON equipment_events;
DROP POLICY IF EXISTS equipment_events_allow_anon ON equipment_events;
DROP POLICY IF EXISTS equipment_events_allow_authenticated ON equipment_events;

-- Equipment Log
DROP POLICY IF EXISTS equipment_log_allow_all ON equipment_log;
DROP POLICY IF EXISTS equipment_log_allow_anon ON equipment_log;
DROP POLICY IF EXISTS equipment_log_allow_authenticated ON equipment_log;

-- Equipment Templates
DROP POLICY IF EXISTS equipment_templates_allow_all ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_anon ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_allow_authenticated ON equipment_templates;

-- Fuel Measurement History
DROP POLICY IF EXISTS fuel_measurement_history_allow_all ON fuel_measurement_history;
DROP POLICY IF EXISTS fuel_measurement_history_allow_anon ON fuel_measurement_history;
DROP POLICY IF EXISTS fuel_measurement_history_allow_authenticated ON fuel_measurement_history;

-- Fuel Stocks
DROP POLICY IF EXISTS fuel_stocks_allow_all ON fuel_stocks;
DROP POLICY IF EXISTS fuel_stocks_allow_anon ON fuel_stocks;
DROP POLICY IF EXISTS fuel_stocks_allow_authenticated ON fuel_stocks;

-- Fuel Types
DROP POLICY IF EXISTS fuel_types_allow_all ON fuel_types;
DROP POLICY IF EXISTS fuel_types_allow_anon ON fuel_types;
DROP POLICY IF EXISTS fuel_types_allow_authenticated ON fuel_types;

-- Legal Audit Log
DROP POLICY IF EXISTS legal_audit_log_allow_all ON legal_audit_log;
DROP POLICY IF EXISTS legal_audit_log_allow_anon ON legal_audit_log;
DROP POLICY IF EXISTS legal_audit_log_allow_authenticated ON legal_audit_log;

-- Networks
DROP POLICY IF EXISTS networks_allow_all ON networks;
DROP POLICY IF EXISTS networks_allow_anon ON networks;
DROP POLICY IF EXISTS networks_allow_authenticated ON networks;

-- Nomenclature
DROP POLICY IF EXISTS nomenclature_allow_all ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_anon ON nomenclature;
DROP POLICY IF EXISTS nomenclature_allow_authenticated ON nomenclature;

-- Nomenclature External Codes
DROP POLICY IF EXISTS nomenclature_external_codes_allow_all ON nomenclature_external_codes;
DROP POLICY IF EXISTS nomenclature_external_codes_allow_anon ON nomenclature_external_codes;
DROP POLICY IF EXISTS nomenclature_external_codes_allow_authenticated ON nomenclature_external_codes;

-- Operations
DROP POLICY IF EXISTS operations_allow_all ON operations;
DROP POLICY IF EXISTS operations_allow_anon ON operations;
DROP POLICY IF EXISTS operations_allow_authenticated ON operations;

-- Price History
DROP POLICY IF EXISTS price_history_allow_all ON price_history;
DROP POLICY IF EXISTS price_history_allow_anon ON price_history;
DROP POLICY IF EXISTS price_history_allow_authenticated ON price_history;

-- Roles
DROP POLICY IF EXISTS roles_allow_all ON roles;
DROP POLICY IF EXISTS roles_allow_anon ON roles;
DROP POLICY IF EXISTS roles_allow_authenticated ON roles;

-- Tank Events
DROP POLICY IF EXISTS tank_events_allow_all ON tank_events;
DROP POLICY IF EXISTS tank_events_allow_anon ON tank_events;
DROP POLICY IF EXISTS tank_events_allow_authenticated ON tank_events;

-- Tanks
DROP POLICY IF EXISTS tanks_allow_all ON tanks;
DROP POLICY IF EXISTS tanks_allow_anon ON tanks;
DROP POLICY IF EXISTS tanks_allow_authenticated ON tanks;

-- Trading Points
DROP POLICY IF EXISTS trading_points_allow_all ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_anon ON trading_points;
DROP POLICY IF EXISTS trading_points_allow_authenticated ON trading_points;

-- User Document Acceptances
DROP POLICY IF EXISTS user_document_acceptances_allow_all ON user_document_acceptances;
DROP POLICY IF EXISTS user_document_acceptances_allow_anon ON user_document_acceptances;
DROP POLICY IF EXISTS user_document_acceptances_allow_authenticated ON user_document_acceptances;

-- User Legal Statuses
DROP POLICY IF EXISTS user_legal_statuses_allow_all ON user_legal_statuses;
DROP POLICY IF EXISTS user_legal_statuses_allow_anon ON user_legal_statuses;
DROP POLICY IF EXISTS user_legal_statuses_allow_authenticated ON user_legal_statuses;

-- User Roles
DROP POLICY IF EXISTS user_roles_allow_all ON user_roles;
DROP POLICY IF EXISTS user_roles_allow_anon ON user_roles;
DROP POLICY IF EXISTS user_roles_allow_authenticated ON user_roles;

-- Users
DROP POLICY IF EXISTS users_allow_all ON users;
DROP POLICY IF EXISTS users_allow_anon ON users;
DROP POLICY IF EXISTS users_allow_authenticated ON users;

SELECT '🗑️ All existing policies removed' as step1_completed;

-- ============================================================================
-- ШАГ 2: ВКЛЮЧАЕМ RLS И СОЗДАЕМ РАЗРЕШАЮЩИЕ ПОЛИТИКИ ДЛЯ ВСЕХ ТАБЛИЦ
-- ============================================================================

-- Components
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
CREATE POLICY components_dev_anon ON components FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY components_dev_auth ON components FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Types
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_types_dev_anon ON document_types FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY document_types_dev_auth ON document_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_versions_dev_anon ON document_versions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY document_versions_dev_auth ON document_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_dev_anon ON equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_dev_auth ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Events
ALTER TABLE equipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_events_dev_anon ON equipment_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_events_dev_auth ON equipment_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Log
ALTER TABLE equipment_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_log_dev_anon ON equipment_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_log_dev_auth ON equipment_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Templates
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_templates_dev_anon ON equipment_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY equipment_templates_dev_auth ON equipment_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fuel Measurement History
ALTER TABLE fuel_measurement_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY fuel_measurement_history_dev_anon ON fuel_measurement_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY fuel_measurement_history_dev_auth ON fuel_measurement_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fuel Stocks
ALTER TABLE fuel_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY fuel_stocks_dev_anon ON fuel_stocks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY fuel_stocks_dev_auth ON fuel_stocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fuel Types
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY fuel_types_dev_anon ON fuel_types FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY fuel_types_dev_auth ON fuel_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Legal Audit Log
ALTER TABLE legal_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_audit_log_dev_anon ON legal_audit_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY legal_audit_log_dev_auth ON legal_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Networks
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY networks_dev_anon ON networks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY networks_dev_auth ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nomenclature
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_dev_anon ON nomenclature FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_dev_auth ON nomenclature FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nomenclature External Codes
ALTER TABLE nomenclature_external_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY nomenclature_external_codes_dev_anon ON nomenclature_external_codes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY nomenclature_external_codes_dev_auth ON nomenclature_external_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Operations
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_dev_anon ON operations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY operations_dev_auth ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Price History
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_history_dev_anon ON price_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY price_history_dev_auth ON price_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_dev_anon ON roles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY roles_dev_auth ON roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tank Events
ALTER TABLE tank_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tank_events_dev_anon ON tank_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY tank_events_dev_auth ON tank_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tanks
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tanks_dev_anon ON tanks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY tanks_dev_auth ON tanks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trading Points
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY trading_points_dev_anon ON trading_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY trading_points_dev_auth ON trading_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Document Acceptances
ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_document_acceptances_dev_anon ON user_document_acceptances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY user_document_acceptances_dev_auth ON user_document_acceptances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Legal Statuses
ALTER TABLE user_legal_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_legal_statuses_dev_anon ON user_legal_statuses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY user_legal_statuses_dev_auth ON user_legal_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_dev_anon ON user_roles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY user_roles_dev_auth ON user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_dev_anon ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY users_dev_auth ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '🔐 All RLS policies created successfully' as step2_completed;

-- ============================================================================
-- ШАГ 3: НАСТРОЙКА ОБЩИХ ПРАВ ДОСТУПА
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

SELECT '✅ Access rights configured for all roles' as step3_completed;

-- ============================================================================
-- ШАГ 4: ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

-- Показываем финальное состояние всех таблиц
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON' 
        ELSE '🔓 RLS OFF' 
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Показываем количество созданных политик
SELECT 
    tablename as "Table",
    COUNT(*) as "Policies Count"
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ШАГ 5: ТЕСТОВЫЕ ЗАПРОСЫ
-- ============================================================================

-- Тестируем основные таблицы
SELECT 'Testing equipment_templates...' as test;
SELECT COUNT(*) as equipment_templates_count FROM equipment_templates;

SELECT 'Testing networks...' as test;
SELECT COUNT(*) as networks_count FROM networks;

SELECT 'Testing trading_points...' as test;
SELECT COUNT(*) as trading_points_count FROM trading_points;

SELECT 'Testing nomenclature...' as test;
SELECT COUNT(*) as nomenclature_count FROM nomenclature;

SELECT 'Testing operations...' as test;
SELECT COUNT(*) as operations_count FROM operations;

-- ============================================================================
-- ФИНАЛЬНОЕ СООБЩЕНИЕ
-- ============================================================================

SELECT '🎉 EXACT DATABASE FIX COMPLETED FOR ALL TABLES!' as status;
SELECT '✅ All 25+ tables now have permissive RLS policies' as result;
SELECT '🔓 Full access granted to anon and authenticated roles' as access_level;
SELECT '🚀 ALL API calls should now work without 401 errors!' as next_step;
SELECT '📊 Check the test queries above to confirm data access' as verification;