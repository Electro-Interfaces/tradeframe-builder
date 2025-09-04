-- Очистка конфликтующих RLS политик для user_document_acceptances

-- Удаляем старые политики которые могут конфликтовать
DROP POLICY IF EXISTS "user_acceptances_create_policy" ON user_document_acceptances;
DROP POLICY IF EXISTS "user_acceptances_own_policy" ON user_document_acceptances;  
DROP POLICY IF EXISTS "user_acceptances_admin_policy" ON user_document_acceptances;

-- Оставляем только наши новые политики:
-- 1. authenticated_users_can_insert - для вставки по email из JWT
-- 2. users_read_own_data - для чтения по email из JWT  
-- 3. service_role_full_access - полный доступ для service role

-- Проверяем что остались только нужные политики
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_document_acceptances'
ORDER BY policyname;