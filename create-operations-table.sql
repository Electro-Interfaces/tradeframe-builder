-- Создание таблицы operations для операций заправки и других операций
CREATE TABLE IF NOT EXISTS operations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,  -- 'fuel_purchase', 'maintenance', 'inspection', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- продолжительность в секундах
  trading_point_id uuid,
  trading_point_name VARCHAR(200),
  device_id VARCHAR(100),
  transaction_id VARCHAR(100),
  fuel_type VARCHAR(50), -- 'АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'Газ'
  quantity DECIMAL(10,3), -- количество в литрах
  price DECIMAL(10,2), -- цена за литр
  total_cost DECIMAL(12,2), -- общая стоимость
  payment_method VARCHAR(30), -- 'cash', 'card', 'fuel_card', 'corporate'
  details TEXT NOT NULL DEFAULT '', -- детали операции
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), -- прогресс 0-100%
  operator_name VARCHAR(200),
  customer_id VARCHAR(100),
  vehicle_number VARCHAR(20),
  metadata JSONB DEFAULT '{}', -- дополнительные данные
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_operations_operation_type ON operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_start_time ON operations(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_operations_trading_point_id ON operations(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_operations_fuel_type ON operations(fuel_type);
CREATE INDEX IF NOT EXISTS idx_operations_payment_method ON operations(payment_method);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operations_updated_at 
    BEFORE UPDATE ON operations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Демо-данные для операций
INSERT INTO operations (
    operation_type, status, start_time, end_time, duration,
    trading_point_name, device_id, fuel_type, quantity, price, total_cost,
    payment_method, details, progress, operator_name, customer_id, vehicle_number
) VALUES 
    ('fuel_purchase', 'completed', '2024-01-10 10:30:00+00', '2024-01-10 10:35:00+00', 300,
     'АЗС Центральная', 'PUMP-001', 'АИ-95', 45.5, 55.80, 2538.90,
     'card', 'Заправка легкового автомобиля', 100, 'Петров И.С.', 'CUST-001', 'А123БВ77'),
     
    ('fuel_purchase', 'completed', '2024-01-10 10:45:00+00', '2024-01-10 10:50:00+00', 300,
     'АЗС Центральная', 'PUMP-002', 'ДТ', 80.0, 52.30, 4184.00,
     'fuel_card', 'Заправка грузового транспорта', 100, 'Сидоров А.В.', 'CUST-002', 'В456ГД77'),
     
    ('fuel_purchase', 'in_progress', NOW() - INTERVAL '5 minutes', NULL, NULL,
     'АЗС Северная', 'PUMP-003', 'АИ-92', 30.0, 53.50, 1605.00,
     'cash', 'Заправка в процессе', 75, 'Иванова М.П.', 'CUST-003', 'Г789ЕЖ77'),
     
    ('maintenance', 'pending', NOW() + INTERVAL '2 hours', NULL, NULL,
     'АЗС Южная', 'PUMP-004', NULL, NULL, NULL, NULL,
     NULL, 'Плановое техническое обслуживание колонки', 0, 'Техник Смирнов', NULL, NULL),
     
    ('fuel_purchase', 'failed', '2024-01-10 09:15:00+00', '2024-01-10 09:18:00+00', 180,
     'АЗС Восточная', 'PUMP-005', 'АИ-98', 25.0, 61.20, 1530.00,
     'card', 'Ошибка при оплате картой', 0, 'Козлов Д.А.', 'CUST-004', 'Д012ЗИ77');

-- Информация о созданной таблице
SELECT 
    'operations' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record
FROM operations;