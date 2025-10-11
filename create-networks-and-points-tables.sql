-- =====================================================
-- Создание таблиц networks и trading_points
-- Упрощенная версия для быстрого старта
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Networks (Торговые сети)
-- =====================================================
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    external_id VARCHAR(50), -- ID из внешней системы (для синхронизации)
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Trading Points (Торговые точки)
-- =====================================================
CREATE TABLE IF NOT EXISTS trading_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    external_id VARCHAR(50), -- ID из внешней системы
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    geolocation JSONB, -- {latitude, longitude, region, city, address}
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    schedule JSONB, -- График работы
    services JSONB, -- Доступные услуги
    external_codes JSONB DEFAULT '[]', -- Массив внешних кодов
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network_id, code)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_networks_status ON networks(status);
CREATE INDEX IF NOT EXISTS idx_networks_code ON networks(code);
CREATE INDEX IF NOT EXISTS idx_networks_external_id ON networks(external_id);

CREATE INDEX IF NOT EXISTS idx_trading_points_network ON trading_points(network_id);
CREATE INDEX IF NOT EXISTS idx_trading_points_code ON trading_points(network_id, code);
CREATE INDEX IF NOT EXISTS idx_trading_points_external_id ON trading_points(external_id);
CREATE INDEX IF NOT EXISTS idx_trading_points_is_blocked ON trading_points(is_blocked);

-- =====================================================
-- TRIGGERS
-- =====================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_points_updated_at BEFORE UPDATE ON trading_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
-- Отключаем RLS для упрощения (используем Service Role Key)
ALTER TABLE networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE trading_points DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE networks IS 'Торговые сети - верхний уровень организации';
COMMENT ON TABLE trading_points IS 'Торговые точки (АЗС, терминалы и т.д.)';
COMMENT ON COLUMN networks.external_id IS 'ID из внешней системы для синхронизации';
COMMENT ON COLUMN trading_points.external_id IS 'ID из внешней системы для синхронизации';
COMMENT ON COLUMN trading_points.geolocation IS 'JSON: {latitude, longitude, region, city, address}';
COMMENT ON COLUMN trading_points.schedule IS 'JSON: График работы по дням недели';
COMMENT ON COLUMN trading_points.services IS 'JSON: Доступные услуги (мойка, кафе и т.д.)';

-- =====================================================
-- INITIAL DATA (БТО сеть и АЗС 4)
-- =====================================================
-- Вставляем сеть БТО
INSERT INTO networks (id, name, code, description, external_id, status)
VALUES (
    gen_random_uuid(),
    'БТО',
    'bto',
    'БТО - сеть АЗС',
    '15',
    'active'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    external_id = EXCLUDED.external_id;

-- Получаем ID сети БТО для вставки торговой точки
DO $$
DECLARE
    bto_network_id UUID;
BEGIN
    SELECT id INTO bto_network_id FROM networks WHERE code = 'bto';

    -- Вставляем АЗС 4
    INSERT INTO trading_points (
        id,
        network_id,
        name,
        code,
        description,
        external_id,
        address,
        phone,
        email,
        geolocation,
        is_blocked,
        schedule,
        services,
        external_codes
    )
    VALUES (
        gen_random_uuid(),
        bto_network_id,
        'АЗС 4',
        '4',
        'АЗС 4 - БТО',
        '4',
        'г. Уфа, ул. Победы, 100',
        '+7 (347) 264-75-00',
        'azs4@bto.ru',
        jsonb_build_object(
            'latitude', 54.7500,
            'longitude', 55.9800,
            'region', 'Республика Башкортостан',
            'city', 'Уфа',
            'address', 'г. Уфа, ул. Победы, 100'
        ),
        false,
        jsonb_build_object(
            'monday', '00:00-23:59',
            'tuesday', '00:00-23:59',
            'wednesday', '00:00-23:59',
            'thursday', '00:00-23:59',
            'friday', '00:00-23:59',
            'saturday', '00:00-23:59',
            'sunday', '00:00-23:59',
            'isAlwaysOpen', true
        ),
        jsonb_build_object(
            'selfServiceTerminal', true,
            'airPump', true,
            'carWash', true,
            'shop', true,
            'cafe', false,
            'lubricants', true,
            'waterService', false,
            'gasBottleExchange', false,
            'electricCharging', false,
            'truckParking', true
        ),
        '["4", "BTO-004"]'::jsonb
    )
    ON CONFLICT (network_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        external_id = EXCLUDED.external_id,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        geolocation = EXCLUDED.geolocation,
        schedule = EXCLUDED.schedule,
        services = EXCLUDED.services,
        external_codes = EXCLUDED.external_codes;
END $$;

-- Проверка созданных данных
SELECT 'Networks created:' as message, COUNT(*) as count FROM networks;
SELECT 'Trading points created:' as message, COUNT(*) as count FROM trading_points;
