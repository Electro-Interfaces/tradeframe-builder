-- Отключение Row Level Security для таблиц nomenclature
-- Это позволит анонимным пользователям читать и записывать данные

-- Отключаем RLS для основной таблицы nomenclature
ALTER TABLE nomenclature DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для таблицы внешних кодов
ALTER TABLE nomenclature_external_codes DISABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если они есть)
DROP POLICY IF EXISTS "Enable read access for all users" ON nomenclature;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON nomenclature;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON nomenclature;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON nomenclature;

DROP POLICY IF EXISTS "Enable read access for all users" ON nomenclature_external_codes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON nomenclature_external_codes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON nomenclature_external_codes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON nomenclature_external_codes;

-- Проверяем статус RLS для таблиц
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('nomenclature', 'nomenclature_external_codes')
    AND schemaname = 'public';

-- Завершено: RLS отключен для таблиц nomenclature