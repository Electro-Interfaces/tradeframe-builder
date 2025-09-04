-- Исправление структуры таблицы trading_points
-- Выполнить в Supabase SQL Editor

-- Добавляем недостающие колонки если их нет
DO $$
BEGIN
    -- Добавляем external_id если его нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'external_id') THEN
        ALTER TABLE public.trading_points ADD COLUMN external_id TEXT;
        RAISE NOTICE 'Добавлена колонка external_id';
    ELSE
        RAISE NOTICE 'Колонка external_id уже существует';
    END IF;
    
    -- Добавляем block_reason если его нет  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'block_reason') THEN
        ALTER TABLE public.trading_points ADD COLUMN block_reason TEXT;
        RAISE NOTICE 'Добавлена колонка block_reason';
    ELSE
        RAISE NOTICE 'Колонка block_reason уже существует';
    END IF;
    
    -- Добавляем website если его нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'website') THEN
        ALTER TABLE public.trading_points ADD COLUMN website TEXT;
        RAISE NOTICE 'Добавлена колонка website';
    ELSE
        RAISE NOTICE 'Колонка website уже существует';
    END IF;
    
    -- Проверяем что is_blocked существует, если нет - добавляем
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'is_blocked') THEN
        ALTER TABLE public.trading_points ADD COLUMN is_blocked BOOLEAN DEFAULT false;
        RAISE NOTICE 'Добавлена колонка is_blocked';
    ELSE
        RAISE NOTICE 'Колонка is_blocked уже существует';
    END IF;
    
    -- Проверяем что external_codes существует как JSONB
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'external_codes') THEN
        ALTER TABLE public.trading_points ADD COLUMN external_codes JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Добавлена колонка external_codes';
    ELSE
        RAISE NOTICE 'Колонка external_codes уже существует';
    END IF;
    
    -- Проверяем что settings существует как JSONB
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_points' AND column_name = 'settings') THEN
        ALTER TABLE public.trading_points ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Добавлена колонка settings';
    ELSE
        RAISE NOTICE 'Колонка settings уже существует';
    END IF;
    
END $$;

-- Создаем индексы для производительности если их нет
CREATE INDEX IF NOT EXISTS idx_trading_points_external_id ON public.trading_points(external_id);
CREATE INDEX IF NOT EXISTS idx_trading_points_is_blocked ON public.trading_points(is_blocked);

-- Обновляем комментарии
COMMENT ON COLUMN public.trading_points.external_id IS 'Внешний ID для синхронизации с торговым API';
COMMENT ON COLUMN public.trading_points.block_reason IS 'Причина блокировки торговой точки';
COMMENT ON COLUMN public.trading_points.website IS 'Веб-сайт торговой точки';
COMMENT ON COLUMN public.trading_points.external_codes IS 'Внешние коды систем: [{id, system, code, description}]';
COMMENT ON COLUMN public.trading_points.settings IS 'Дополнительные настройки торговой точки';

-- Проверяем финальную структуру таблицы
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trading_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Выводим итоговое сообщение
SELECT 'Структура таблицы trading_points успешно исправлена!' as result;