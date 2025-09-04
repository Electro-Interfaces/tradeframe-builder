// Простое создание таблицы prices через существующий SQL инструмент
const fs = require('fs');

// Создаем простой SQL файл с таблицей prices
const simplePricesSQL = `
-- Простая таблица цен для демонстрации
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

-- Простые политики доступа
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices_public_policy" ON prices FOR ALL USING (true);

-- Добавляем несколько демо-цен
INSERT INTO prices (trading_point_id, fuel_type_id, price_net, vat_rate, price_gross, reason) 
SELECT 
    tp.id as trading_point_id,
    ft.id as fuel_type_id,
    CASE 
        WHEN ft.code = 'AI95' THEN 5300
        WHEN ft.code = 'AI92' THEN 5000  
        WHEN ft.code = 'DT_SUMMER' THEN 5200
        ELSE 5100
    END as price_net,
    20.00 as vat_rate,
    CASE 
        WHEN ft.code = 'AI95' THEN 6360
        WHEN ft.code = 'AI92' THEN 6000
        WHEN ft.code = 'DT_SUMMER' THEN 6240
        ELSE 6120
    END as price_gross,
    'Демо-цена на ' || ft.name as reason
FROM 
    (SELECT id, name FROM trading_points LIMIT 2) tp
CROSS JOIN 
    (SELECT id, name, code FROM fuel_types WHERE is_active = true LIMIT 3) ft
ON CONFLICT DO NOTHING;
`;

// Записываем в файл
fs.writeFileSync('database/create-prices-simple.sql', simplePricesSQL.trim());

console.log('✅ Создан файл database/create-prices-simple.sql');
console.log('📝 Для создания таблицы выполните:');
console.log('   node tools/execute-sql.js database/create-prices-simple.sql');