-- Создание таблицы trading_points для торговых точек (АЗС)
CREATE TABLE IF NOT EXISTS trading_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  address TEXT,
  region VARCHAR(100),
  city VARCHAR(100),
  coordinates JSONB, -- {"lat": 55.7558, "lng": 37.6176}
  phone VARCHAR(30),
  email VARCHAR(100),
  manager_name VARCHAR(200),
  network_id uuid, -- ссылка на сеть АЗС
  network_name VARCHAR(200),
  station_type VARCHAR(50) DEFAULT 'fuel_station', -- 'fuel_station', 'truck_stop', 'mini_market'
  fuel_types TEXT[] DEFAULT ARRAY['АИ-92', 'АИ-95', 'АИ-98', 'ДТ'], -- доступные виды топлива
  services TEXT[] DEFAULT ARRAY['fuel', 'shop'], -- доступные услуги
  working_hours JSONB DEFAULT '{"open": "06:00", "close": "23:00", "24h": false}',
  payment_methods TEXT[] DEFAULT ARRAY['cash', 'card', 'fuel_card'],
  equipment_count INTEGER DEFAULT 0, -- количество топливных колонок
  tanks_count INTEGER DEFAULT 0, -- количество резервуаров
  daily_volume DECIMAL(12,3), -- дневной объем продаж в литрах
  monthly_volume DECIMAL(12,3), -- месячный объем продаж
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance', 'closed'
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- дополнительные данные
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_trading_points_name ON trading_points(name);
CREATE INDEX IF NOT EXISTS idx_trading_points_code ON trading_points(code);
CREATE INDEX IF NOT EXISTS idx_trading_points_network_id ON trading_points(network_id);
CREATE INDEX IF NOT EXISTS idx_trading_points_city ON trading_points(city);
CREATE INDEX IF NOT EXISTS idx_trading_points_status ON trading_points(status);
CREATE INDEX IF NOT EXISTS idx_trading_points_is_active ON trading_points(is_active);

-- Триггер для updated_at
CREATE TRIGGER update_trading_points_updated_at 
    BEFORE UPDATE ON trading_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Демо-данные для торговых точек
INSERT INTO trading_points (
    name, code, address, region, city, coordinates,
    phone, email, manager_name, network_name,
    fuel_types, services, equipment_count, tanks_count,
    daily_volume, monthly_volume, status
) VALUES 
    ('АЗС Центральная', 'AZS-001', 'ул. Ленина, 15', 'Московская область', 'Москва', 
     '{"lat": 55.7558, "lng": 37.6176}', '+7 495 123-45-67', 'central@azs.ru', 'Петров И.С.',
     'Сеть Топливо+', ARRAY['АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'Газ'], ARRAY['fuel', 'shop', 'cafe'],
     6, 4, 5000.0, 150000.0, 'active'),
     
    ('АЗС Северная', 'AZS-002', 'Северное шоссе, 42', 'Московская область', 'Мытищи',
     '{"lat": 55.9116, "lng": 37.7307}', '+7 495 234-56-78', 'north@azs.ru', 'Сидоров А.В.',
     'Сеть Топливо+', ARRAY['АИ-92', 'АИ-95', 'ДТ'], ARRAY['fuel', 'shop'],
     4, 3, 3500.0, 105000.0, 'active'),
     
    ('АЗС Южная', 'AZS-003', 'Южная ул., 78', 'Московская область', 'Подольск',
     '{"lat": 55.4314, "lng": 37.5446}', '+7 495 345-67-89', 'south@azs.ru', 'Иванова М.П.',
     'Сеть Топливо+', ARRAY['АИ-92', 'АИ-95', 'АИ-98', 'ДТ'], ARRAY['fuel', 'shop', 'car_wash'],
     8, 5, 7200.0, 216000.0, 'active'),
     
    ('АЗС Восточная', 'AZS-004', 'Восточный проезд, 12', 'Московская область', 'Балашиха',
     '{"lat": 55.7964, "lng": 37.9381}', '+7 495 456-78-90', 'east@azs.ru', 'Козлов Д.А.',
     'Сеть Топливо+', ARRAY['АИ-92', 'АИ-95', 'ДТ'], ARRAY['fuel', 'shop'],
     5, 3, 4100.0, 123000.0, 'maintenance'),
     
    ('АЗС Западная', 'AZS-005', 'Западный бульвар, 25', 'Московская область', 'Одинцово',
     '{"lat": 55.6736, "lng": 37.2606}', '+7 495 567-89-01', 'west@azs.ru', 'Морозов П.К.',
     'Сеть Топливо+', ARRAY['АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'Газ'], ARRAY['fuel', 'shop', 'cafe', 'car_wash'],
     10, 6, 8500.0, 255000.0, 'active');

-- Информация о созданной таблице
SELECT 
    'trading_points' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record
FROM trading_points;
