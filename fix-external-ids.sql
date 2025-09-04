-- Исправление external_id для торговых сетей и торговых точек
-- Выполнить в Supabase SQL Editor

-- 1. Проверяем текущие external_id в торговых сетях
SELECT 
    'NETWORKS - текущие external_id:' as type,
    id,
    name,
    external_id,
    CASE 
        WHEN external_id IS NULL THEN 'NULL ❌'
        WHEN external_id = '' THEN 'ПУСТАЯ СТРОКА ❌'
        ELSE 'OK ✅'
    END as status
FROM public.networks 
ORDER BY name;

-- 2. Проверяем текущие external_id в торговых точках
SELECT 
    'TRADING_POINTS - текущие external_id:' as type,
    id,
    name,
    external_id,
    CASE 
        WHEN external_id IS NULL THEN 'NULL ❌'
        WHEN external_id = '' THEN 'ПУСТАЯ СТРОКА ❌'
        ELSE 'OK ✅'
    END as status
FROM public.trading_points 
ORDER BY name;

-- 3. Исправляем external_id для торговых сетей, если они NULL или пустые
-- Для демо сети устанавливаем external_id = '1'
UPDATE public.networks 
SET external_id = '1' 
WHERE name LIKE '%Демо сеть%' 
  AND (external_id IS NULL OR external_id = '');

-- Для сети Норд Лайн устанавливаем external_id = '15'
UPDATE public.networks 
SET external_id = '15' 
WHERE name LIKE '%Норд%' 
  AND (external_id IS NULL OR external_id = '');

-- 4. Проверяем результат исправления сетей
SELECT 
    'NETWORKS - после исправления:' as type,
    id,
    name,
    external_id,
    CASE 
        WHEN external_id IS NULL THEN 'NULL ❌'
        WHEN external_id = '' THEN 'ПУСТАЯ СТРОКА ❌'
        ELSE 'OK ✅'
    END as status
FROM public.networks 
ORDER BY name;

-- 5. Исправляем external_id для торговых точек, если они NULL или пустые
-- Присваиваем последовательные external_id на основе имени
UPDATE public.trading_points 
SET external_id = 
    CASE 
        WHEN name LIKE '%001%' THEN 'point1'
        WHEN name LIKE '%002%' THEN 'point2'
        WHEN name LIKE '%003%' THEN 'point3'
        WHEN name LIKE '%004%' THEN 'point4'
        WHEN name LIKE '%005%' THEN 'point5'
        WHEN name LIKE '%006%' THEN 'point6'
        ELSE 'point_' || SUBSTRING(id::text, 1, 8)
    END
WHERE external_id IS NULL OR external_id = '';

-- 6. Проверяем результат исправления торговых точек
SELECT 
    'TRADING_POINTS - после исправления:' as type,
    id,
    name,
    external_id,
    CASE 
        WHEN external_id IS NULL THEN 'NULL ❌'
        WHEN external_id = '' THEN 'ПУСТАЯ СТРОКА ❌'
        ELSE 'OK ✅'
    END as status
FROM public.trading_points 
ORDER BY name;

-- 7. Итоговая проверка связей
SELECT 
    'СВЯЗИ - сети и их точки:' as type,
    n.name as network_name,
    n.external_id as network_external_id,
    COUNT(tp.id) as points_count
FROM public.networks n
LEFT JOIN public.trading_points tp ON tp.network_id = n.id
GROUP BY n.id, n.name, n.external_id
ORDER BY n.name;

-- 8. Финальное сообщение
SELECT 'external_id исправлены для всех торговых сетей и точек!' as result;