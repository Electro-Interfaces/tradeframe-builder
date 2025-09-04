-- Универсальный скрипт для отключения Row Level Security для ВСЕХ таблиц
-- Выполните этот код в SQL Editor в админке Supabase

-- Отключаем RLS для всех таблиц в схеме public
DO $$ 
DECLARE 
    table_record RECORD;
BEGIN
    -- Проходим по всем таблицам в схеме public
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Выполняем ALTER TABLE для каждой таблицы
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', 
                      table_record.schemaname, 
                      table_record.tablename);
        
        -- Выводим информацию о том, что RLS отключен для таблицы
        RAISE NOTICE 'RLS отключен для таблицы: %.%', 
                     table_record.schemaname, 
                     table_record.tablename;
    END LOOP;
END $$;

-- Проверяем результат - показываем все таблицы и статус RLS
SELECT 
    schemaname AS "Схема",
    tablename AS "Таблица",
    CASE 
        WHEN rowsecurity THEN 'Включен' 
        ELSE 'Отключен' 
    END AS "RLS Статус"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Дополнительная проверка количества таблиц
SELECT 
    COUNT(*) AS "Всего таблиц в public",
    COUNT(CASE WHEN rowsecurity THEN 1 END) AS "С включенным RLS",
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) AS "С отключенным RLS"
FROM pg_tables 
WHERE schemaname = 'public';