-- ===============================================
-- FIX OPERATIONS TABLE RLS POLICIES
-- Исправление политик доступа для таблицы operations
-- ===============================================

-- Отключаем RLS временно для разработки
ALTER TABLE operations DISABLE ROW LEVEL SECURITY;

-- Или создаем разрешающие политики
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON operations;
DROP POLICY IF EXISTS "Enable read access for anon" ON operations;
DROP POLICY IF EXISTS "Enable insert access for anon" ON operations;
DROP POLICY IF EXISTS "Enable update access for anon" ON operations;
DROP POLICY IF EXISTS "Enable delete access for anon" ON operations;

-- Создаем разрешающие политики для разработки
CREATE POLICY "Allow all for service role" ON operations
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON operations
    FOR ALL 
    TO authenticated
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON operations
    FOR ALL 
    TO anon
    USING (true) 
    WITH CHECK (true);

-- Предоставляем права доступа
GRANT ALL ON operations TO anon;
GRANT ALL ON operations TO authenticated;
GRANT ALL ON operations TO service_role;

-- Проверяем созданные политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'operations';

-- Показываем текущие права
SELECT table_name, privilege_type, grantee 
FROM information_schema.table_privileges 
WHERE table_name = 'operations';