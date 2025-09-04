-- ============================================================================
-- ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ - ТОЛЬКО ДИАГНОСТИКА
-- ============================================================================
-- Этот скрипт только показывает что у вас есть в базе
-- НИКАКИХ ИЗМЕНЕНИЙ НЕ ДЕЛАЕТ - только смотрит
-- ============================================================================

-- 1. ПОКАЗАТЬ ВСЕ ТАБЛИЦЫ В БАЗЕ
SELECT 
    '🔍 ALL TABLES IN YOUR DATABASE:' as section,
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ON' 
        ELSE '🔓 RLS OFF' 
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. СПЕЦИАЛЬНАЯ ПРОВЕРКА КОНКРЕТНЫХ ТАБЛИЦ  
SELECT '📋 SPECIFIC TABLES CHECK:' as section;

SELECT 
    'equipment_templates' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_templates') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'equipment' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'networks' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'networks') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'trading_points' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trading_points') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'users' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'nomenclature' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nomenclature') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

SELECT 
    'operations' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'operations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- 3. ПОКАЗАТЬ СУЩЕСТВУЮЩИЕ RLS ПОЛИТИКИ
SELECT '🛡️  EXISTING RLS POLICIES:' as section;

SELECT 
    tablename as "Table",
    policyname as "Policy Name", 
    cmd as "Command",
    CASE 
        WHEN roles = '{anon}' THEN '👤 anon'
        WHEN roles = '{authenticated}' THEN '🔐 authenticated'  
        WHEN roles = '{service_role}' THEN '⚙️  service_role'
        ELSE array_to_string(roles, ', ')
    END as "For Role"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. ПОКАЗАТЬ КОЛИЧЕСТВО ЗАПИСЕЙ В ТАБЛИЦАХ (только для существующих)
SELECT '📊 DATA SUMMARY:' as section;

-- equipment_templates
SELECT 
    'equipment_templates' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_templates')
        THEN (SELECT COUNT(*)::text FROM equipment_templates)
        ELSE 'Table does not exist'
    END as record_count;

-- equipment  
SELECT 
    'equipment' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment')
        THEN (SELECT COUNT(*)::text FROM equipment)
        ELSE 'Table does not exist'
    END as record_count;

-- networks
SELECT 
    'networks' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'networks')
        THEN (SELECT COUNT(*)::text FROM networks)
        ELSE 'Table does not exist'
    END as record_count;

-- ============================================================================
-- РЕКОМЕНДАЦИИ НА ОСНОВЕ НАЙДЕННЫХ ТАБЛИЦ
-- ============================================================================

SELECT '💡 RECOMMENDATIONS BASED ON YOUR DATABASE:' as section;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('equipment_templates', 'equipment')) >= 1
        THEN '✅ Equipment tables found - можно настраивать equipment раздел'
        ELSE '❌ Equipment tables missing - нужна миграция equipment раздела'
    END as equipment_status;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('networks', 'trading_points')) >= 1
        THEN '✅ Network tables found - можно настраивать network раздел'
        ELSE '❌ Network tables missing - нужна миграция network раздела'
    END as network_status;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') >= 1
        THEN '✅ Users table found - можно настраивать auth раздел'
        ELSE '❌ Users table missing - нужна миграция users раздела'
    END as users_status;

-- ============================================================================
-- ГОТОВО - ТОЛЬКО ДИАГНОСТИКА
-- ============================================================================

SELECT '🔍 DIAGNOSTIC COMPLETED - NO CHANGES MADE' as result;
SELECT 'Based on the results above, you can see exactly which tables exist' as instruction;
SELECT 'Use this info to create a targeted fix script for your specific tables' as next_step;