-- SQL скрипт для обновления паролей в базе данных Supabase
-- Новый хэш для пароля 'admin123': $2b$12$NELoPXsqLtAtYdRogHhKweQpcnT2aqY32urETzSSNEDAqf8F/eLB6

UPDATE users 
SET password_hash = '$2b$12$NELoPXsqLtAtYdRogHhKweQpcnT2aqY32urETzSSNEDAqf8F/eLB6'
WHERE email IN (
  'admin@tradeframe.com',
  'network.admin@demo-azs.ru', 
  'manager@demo-azs.ru',
  'operator@demo-azs.ru'
);

-- Проверка обновления
SELECT id, email, name, role FROM users
WHERE email IN (
  'admin@tradeframe.com',
  'network.admin@demo-azs.ru',
  'manager@demo-azs.ru', 
  'operator@demo-azs.ru'
);