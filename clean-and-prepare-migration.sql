-- Очистка и подготовка к чистой миграции торговых точек
-- Выполнить в Supabase SQL Editor

-- 1. Проверяем текущее состояние
SELECT 'Проверяем текущие данные...' as step;

-- Показываем торговые сети
SELECT 
    'NETWORKS:' as type,
    id,
    name,
    external_id,
    status
FROM public.networks 
ORDER BY external_id;

-- Показываем торговые точки (если есть)
SELECT 
    'TRADING_POINTS:' as type,
    id,
    name,
    network_id,
    external_id,
    address,
    latitude,
    longitude
FROM public.trading_points 
ORDER BY name
LIMIT 10;

-- 2. Проверяем структуру колонок
SELECT 
    'COLUMN_STRUCTURE:' as type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trading_points' 
  AND table_schema = 'public'
  AND column_name IN ('address', 'latitude', 'longitude', 'geolocation')
ORDER BY column_name;

-- 3. Убираем NOT NULL ограничения если они еще есть
ALTER TABLE public.trading_points ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.trading_points ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.trading_points ALTER COLUMN longitude DROP NOT NULL;

-- 4. Очищаем старые данные торговых точек для чистой миграции
DELETE FROM public.trading_points WHERE TRUE;

-- 5. Проверяем что таблица пуста
SELECT COUNT(*) as trading_points_count FROM public.trading_points;

-- 6. Готово к миграции
SELECT 'Таблица trading_points очищена и готова к миграции!' as result;