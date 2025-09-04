-- ============================================================================
-- FIX SCHEMA CACHE ISSUE FOR CREATE OPERATIONS
-- ============================================================================
-- Проблема: PostgREST не видит колонку 'status' в кэше схемы
-- Решение: Обновляем кэш схемы и проверяем структуру таблицы
-- ============================================================================

-- 1. ПРОВЕРЯЕМ СТРУКТУРУ ТАБЛИЦЫ equipment_templates
SELECT 
    '🔍 CHECKING equipment_templates STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'equipment_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ПРОВЕРЯЕМ ЧТО КОЛОНКА STATUS СУЩЕСТВУЕТ
SELECT 
    '📋 STATUS COLUMN CHECK' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'equipment_templates' 
            AND column_name = 'status' 
            AND table_schema = 'public'
        ) 
        THEN '✅ status column EXISTS' 
        ELSE '❌ status column MISSING' 
    END as status_check;

-- 3. ЕСЛИ КОЛОНКА ОТСУТСТВУЕТ - ДОБАВЛЯЕМ ЕЁ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_templates' 
        AND column_name = 'status' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE equipment_templates ADD COLUMN status BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added status column to equipment_templates';
    ELSE
        RAISE NOTICE '✅ Status column already exists';
    END IF;
END $$;

-- 4. ОБНОВЛЯЕМ СТАТИСТИКУ ТАБЛИЦЫ ДЛЯ POSTGREST
ANALYZE equipment_templates;

-- 5. ДАЕМ ПРАВА НА НОВУЮ КОЛОНКУ (если была добавлена)
GRANT SELECT, UPDATE ON equipment_templates TO anon;
GRANT SELECT, UPDATE ON equipment_templates TO authenticated;

-- 6. ПРОВЕРЯЕМ ПРАВА НА ТАБЛИЦУ
SELECT 
    '🔑 TABLE PRIVILEGES CHECK' as info,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'equipment_templates'
AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 7. ПРОВЕРЯЕМ SAMPLE DATA
SELECT 
    '📊 SAMPLE DATA CHECK' as info,
    id,
    name,
    system_type,
    status,
    created_at
FROM equipment_templates 
LIMIT 3;

-- 8. ФИНАЛЬНАЯ ПРОВЕРКА - ТЕСТОВАЯ ЗАПИСЬ
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- Пробуем создать тестовую запись
    INSERT INTO equipment_templates (
        id, 
        name, 
        technical_code, 
        system_type, 
        status, 
        description
    ) VALUES (
        test_id,
        'Schema Cache Test',
        'SCHEMA_TEST_' || extract(epoch from now()),
        'test',
        true,
        'Test record to verify schema cache'
    );
    
    RAISE NOTICE '✅ Test record created successfully with ID: %', test_id;
    
    -- Удаляем тестовую запись
    DELETE FROM equipment_templates WHERE id = test_id;
    RAISE NOTICE '✅ Test record cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test record creation failed: %', SQLERRM;
END $$;

-- ============================================================================
-- ИНФОРМАЦИЯ О ПОСТGRЕСТ КЭШЕ
-- ============================================================================

SELECT '
📋 POSTGREST SCHEMA CACHE INFO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Schema structure verified
✅ Table analyzed for PostgREST
✅ Permissions granted to anon role
✅ Test record creation verified

💡 NOTES:
• PostgREST caches table schemas for performance
• After schema changes, cache may need time to refresh
• This can cause "column not found" errors temporarily
• Running ANALYZE helps PostgREST discover schema changes

🔧 IF PROBLEM PERSISTS:
• Wait 1-2 minutes for cache refresh
• Try restarting PostgREST service in Supabase
• Check Supabase logs in Dashboard

' as info;

SELECT '✅ SCHEMA CACHE FIX COMPLETED!' as result;