-- Создание таблицы цен для раздела цен
-- Выполнить в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_point_id UUID NOT NULL,
    fuel_type_id UUID NOT NULL,
    
    -- Цены в копейках
    price_net INTEGER NOT NULL CHECK (price_net >= 0),
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
    
    -- Метаданные
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    unit VARCHAR(10) NOT NULL DEFAULT 'L',
    
    -- Период действия
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Аудит
    created_by TEXT,
    reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Политики доступа
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prices_public_policy" ON prices;
CREATE POLICY "prices_public_policy" ON prices FOR ALL USING (true);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_prices_trading_point_id ON prices(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_prices_fuel_type_id ON prices(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_prices_active ON prices(is_active) WHERE is_active = true;