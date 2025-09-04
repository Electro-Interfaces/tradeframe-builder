-- Создание таблицы tanks для резервуаров
CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  fuel_type VARCHAR(50),
  current_level_liters DECIMAL(10,3) DEFAULT 0.000,
  capacity_liters DECIMAL(10,3) DEFAULT 0.000,
  min_level_percent INTEGER DEFAULT 15,
  critical_level_percent INTEGER DEFAULT 10,
  temperature DECIMAL(5,2) DEFAULT 0.00,
  water_level_mm DECIMAL(5,2) DEFAULT 0.00,
  density DECIMAL(5,3) DEFAULT 0.000,
  is_active BOOLEAN DEFAULT true,
  location VARCHAR(255),
  installation_date DATE,
  last_calibration DATE,
  supplier VARCHAR(255),
  sensors JSONB DEFAULT '[]',
  linked_pumps JSONB DEFAULT '[]',
  notifications JSONB DEFAULT '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
  thresholds JSONB DEFAULT '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
  trading_point_id UUID NOT NULL REFERENCES public.trading_points(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_tanks_trading_point_id ON public.tanks(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_tanks_fuel_type ON public.tanks(fuel_type);
CREATE INDEX IF NOT EXISTS idx_tanks_is_active ON public.tanks(is_active);

-- Включение Row Level Security
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

-- Политики доступа (базовые)
DROP POLICY IF EXISTS "tanks_select_policy" ON public.tanks;
CREATE POLICY "tanks_select_policy" ON public.tanks FOR SELECT USING (true);

DROP POLICY IF EXISTS "tanks_insert_policy" ON public.tanks;
CREATE POLICY "tanks_insert_policy" ON public.tanks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tanks_update_policy" ON public.tanks;
CREATE POLICY "tanks_update_policy" ON public.tanks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "tanks_delete_policy" ON public.tanks;
CREATE POLICY "tanks_delete_policy" ON public.tanks FOR DELETE USING (true);