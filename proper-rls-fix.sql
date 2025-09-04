-- ПРАВИЛЬНОЕ исправление RLS для user_document_acceptances
-- Теперь система использует JWT токены через setUserSession

-- Включаем RLS если он был отключен
ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Allow anon insert acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "Allow all insert acceptances" ON user_document_acceptances; 
DROP POLICY IF EXISTS "Allow service insert acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "Users can read own acceptances" ON user_document_acceptances;
DROP POLICY IF EXISTS "api_key_insert_policy" ON user_document_acceptances;
DROP POLICY IF EXISTS "user_read_own_policy" ON user_document_acceptances;
DROP POLICY IF EXISTS "authenticated_users_can_insert" ON user_document_acceptances;
DROP POLICY IF EXISTS "users_read_own_data" ON user_document_acceptances;
DROP POLICY IF EXISTS "service_role_can_update" ON user_document_acceptances;

-- Политика для вставки: разрешаем authenticated пользователям
CREATE POLICY "authenticated_users_can_insert" ON user_document_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.jwt()->>'email');

-- Политика для чтения: пользователи видят только свои данные
CREATE POLICY "users_read_own_data" ON user_document_acceptances
  FOR SELECT
  TO authenticated
  USING (user_email = auth.jwt()->>'email');

-- Политика для service_role (полный доступ для администрирования)
CREATE POLICY "service_role_full_access" ON user_document_acceptances
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Проверяем созданные политики
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_document_acceptances';