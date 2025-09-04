-- Скрипт для заполнения таблицы networks торговыми сетями
-- Выполните этот код в SQL Editor в админке Supabase

-- Сначала проверяем текущее содержимое
SELECT 'Текущие записи в таблице networks:' as info;
SELECT id, name, code, description, status, created_at FROM networks ORDER BY name;

-- Вставляем начальные данные торговых сетей
INSERT INTO networks (name, code, description, status) VALUES
('Демо сеть АЗС', 'demo_azs', 'Демонстрационная сеть заправочных станций', 'active'),
('Норд Лайн', 'nord_line', 'Сеть АЗС Норд Лайн', 'active')
ON CONFLICT (code) DO NOTHING;

-- Проверяем результат
SELECT 'Записи после вставки:' as info;
SELECT 
    id, 
    name, 
    code, 
    description, 
    status, 
    created_at,
    updated_at
FROM networks 
ORDER BY name;

-- Показываем общую статистику
SELECT 
    COUNT(*) as "Всего сетей",
    COUNT(CASE WHEN status = 'active' THEN 1 END) as "Активных",
    COUNT(CASE WHEN status != 'active' THEN 1 END) as "Неактивных"
FROM networks;