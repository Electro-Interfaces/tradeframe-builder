-- Создание таблицы торговых точек (trading_points)
-- Выполнить в Supabase SQL Editor

-- Удаляем таблицу если существует (для пересоздания)
DROP TABLE IF EXISTS public.trading_points CASCADE;

-- Создаем таблицу торговых точек
CREATE TABLE public.trading_points (
    -- Основные поля
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
    external_id TEXT, -- ID для синхронизации с торговым API
    name TEXT NOT NULL,
    description TEXT,
    
    -- Геолокация (JSON)
    geolocation JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Контактная информация
    phone TEXT,
    email TEXT,
    website TEXT,
    
    -- Статус
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    
    -- Расписание (JSON)
    schedule JSONB DEFAULT '{}'::jsonb,
    
    -- Услуги (JSON)
    services JSONB DEFAULT '{}'::jsonb,
    
    -- Внешние коды (JSON массив)
    external_codes JSONB DEFAULT '[]'::jsonb,
    
    -- Дополнительные настройки
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Временные метки
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX idx_trading_points_network_id ON public.trading_points(network_id);
CREATE INDEX idx_trading_points_external_id ON public.trading_points(external_id);
CREATE INDEX idx_trading_points_name ON public.trading_points(name);
CREATE INDEX idx_trading_points_is_blocked ON public.trading_points(is_blocked);
CREATE INDEX idx_trading_points_geolocation ON public.trading_points USING GIN(geolocation);

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trading_points_updated_at 
    BEFORE UPDATE ON public.trading_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Отключаем RLS для всех пользователей (временно, для разработки)
ALTER TABLE public.trading_points DISABLE ROW LEVEL SECURITY;

-- Даем права на таблицу
GRANT ALL ON public.trading_points TO anon;
GRANT ALL ON public.trading_points TO authenticated;
GRANT ALL ON public.trading_points TO service_role;

-- Комментарии для документации
COMMENT ON TABLE public.trading_points IS 'Торговые точки (АЗС)';
COMMENT ON COLUMN public.trading_points.network_id IS 'ID торговой сети';
COMMENT ON COLUMN public.trading_points.external_id IS 'Внешний ID для синхронизации с торговым API';
COMMENT ON COLUMN public.trading_points.geolocation IS 'Геолокация: {latitude, longitude, region, city, address}';
COMMENT ON COLUMN public.trading_points.schedule IS 'Расписание работы: {monday, tuesday, ..., isAlwaysOpen}';
COMMENT ON COLUMN public.trading_points.services IS 'Доступные услуги: {selfServiceTerminal, carWash, shop, etc.}';
COMMENT ON COLUMN public.trading_points.external_codes IS 'Внешние коды систем: [{id, system, code, description}]';

-- Проверяем результат
SELECT 'Таблица trading_points создана успешно!' as result;