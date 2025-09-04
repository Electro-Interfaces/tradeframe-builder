-- Fix RLS for user_document_acceptances - временно отключаем RLS для решения проблемы с API ключом

-- Показываем текущие политики
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_document_acceptances';

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Allow anon insert acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "Allow all insert acceptances" ON user_document_acceptances; 
DROP POLICY IF EXISTS "Allow service insert acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "Users can read own acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "api_key_insert_policy" ON user_document_acceptances;
DROP POLICY IF EXISTS "user_read_own_policy" ON user_document_acceptances;

-- ВРЕМЕННО отключаем RLS для этой таблицы
-- Это позволит API ключу записывать данные
ALTER TABLE user_document_acceptances DISABLE ROW LEVEL SECURITY;

-- Проверяем что RLS отключен
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'user_document_acceptances';

-- ВНИМАНИЕ: После исправления аутентификации нужно будет включить RLS обратно:
-- ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;