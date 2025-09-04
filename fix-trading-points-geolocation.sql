-- Добавление колонки geolocation в таблицу trading_points
-- Выполнить в Supabase SQL Editor

-- Добавляем колонку geolocation как JSONB если её нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'geolocation') THEN
        ALTER TABLE public.trading_points ADD COLUMN geolocation JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Добавлена колонка geolocation';
    ELSE
        RAISE NOTICE 'Колонка geolocation уже существует';
    END IF;
END $$;

-- Создаем индекс для поиска по геолокации
CREATE INDEX IF NOT EXISTS idx_trading_points_geolocation ON public.trading_points USING GIN(geolocation);

-- Добавляем комментарий
COMMENT ON COLUMN public.trading_points.geolocation IS 'Геолокация: {latitude, longitude, region, city, address}';

-- Проверяем результат
SELECT 'Колонка geolocation добавлена успешно!' as result;