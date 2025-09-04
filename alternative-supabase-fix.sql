-- АЛЬТЕРНАТИВНОЕ решение: Временно отключить RLS для вставки согласий
-- Это позволит API ключу вставлять записи до тех пор, пока не настроим правильную JWT аутентификацию

-- Создаем новую политику которая позволяет вставку с API ключом
DROP POLICY IF EXISTS "api_key_insert_temporary" ON user_document_acceptances;

CREATE POLICY "api_key_insert_temporary" ON user_document_acceptances
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Также разрешаем чтение всем аутентифицированным пользователям (временно)
DROP POLICY IF EXISTS "users_read_own_data" ON user_document_acceptances;

CREATE POLICY "users_read_all_temporary" ON user_document_acceptances
  FOR SELECT 
  TO anon, authenticated, service_role
  USING (true);

-- Проверяем политики
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_document_acceptances'
ORDER BY policyname;