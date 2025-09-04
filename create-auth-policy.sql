-- Создание политики RLS для аутентификации пользователей
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- 1. Создаем политику, которая разрешает анонимному пользователю 
--    читать данные из таблицы users только для аутентификации
CREATE POLICY "Enable read access for authentication" ON users
FOR SELECT TO anon 
USING (
  -- Разрешаем читать только активных пользователей без deleted_at
  is_active = true AND deleted_at IS NULL
);

-- 2. Альтернативный вариант - более ограничительная политика
-- CREATE POLICY "Enable read access for specific emails" ON users
-- FOR SELECT TO anon 
-- USING (
--   email IN (
--     'admin@tradeframe.com',
--     'network.admin@demo-azs.ru',
--     'manager@demo-azs.ru',
--     'operator@demo-azs.ru'
--   ) AND is_active = true AND deleted_at IS NULL
-- );

-- 3. Проверяем, что политика создалась
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- 4. Тестовый запрос для проверки
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'admin@tradeframe.com' 
  AND is_active = true 
  AND deleted_at IS NULL
LIMIT 1;