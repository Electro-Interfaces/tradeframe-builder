-- ===============================================
-- FIX OPERATIONS TABLE SCHEMA
-- Исправление структуры таблицы operations для API
-- ===============================================

-- Удаляем и пересоздаем таблицу operations с правильной структурой
DROP TABLE IF EXISTS operations CASCADE;

-- Создаем таблицу operations с правильными колонками
CREATE TABLE operations (
    id VARCHAR(255) PRIMARY KEY,
    
    -- Основные поля операции
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('sale', 'refund', 'correction', 'maintenance', 'tank_loading', 'diagnostics', 'sensor_calibration')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'in_progress', 'failed', 'pending', 'cancelled')),
    
    -- Временные поля
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTEGER, -- в секундах
    
    -- Локация и устройство
    trading_point_id VARCHAR(255),
    trading_point_name VARCHAR(255),
    device_id VARCHAR(255),
    transaction_id VARCHAR(255),
    
    -- Топливо и финансы
    fuel_type VARCHAR(100),
    quantity DECIMAL(10,2),
    price DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_card', 'fuel_card', 'bank_transfer', 'mobile_payment')),
    
    -- Детали операции
    details TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Участники
    operator_name VARCHAR(255),
    customer_id VARCHAR(255),
    vehicle_number VARCHAR(50),
    
    -- Метаданные
    metadata JSONB DEFAULT '{}',
    
    -- Системные поля
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX operations_start_time_idx ON operations (start_time);
CREATE INDEX operations_status_idx ON operations (status);
CREATE INDEX operations_operation_type_idx ON operations (operation_type);
CREATE INDEX operations_trading_point_id_idx ON operations (trading_point_id);
CREATE INDEX operations_created_at_idx ON operations (created_at);

-- Добавляем тригер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_operations_updated_at 
    BEFORE UPDATE ON operations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS (Row Level Security)
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- Создаем политику RLS (временно разрешаем все)
CREATE POLICY "Enable all operations for authenticated users" ON operations
    FOR ALL USING (true) WITH CHECK (true);

-- Создаем политику для анонимных пользователей (для разработки)
CREATE POLICY "Enable read access for anon" ON operations
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for anon" ON operations
    FOR INSERT WITH CHECK (true);

-- Комментарии к таблице
COMMENT ON TABLE operations IS 'Операции на торговых точках (продажи, возвраты, ТО, загрузки)';
COMMENT ON COLUMN operations.id IS 'Уникальный идентификатор операции';
COMMENT ON COLUMN operations.operation_type IS 'Тип операции (sale, refund, maintenance, etc.)';
COMMENT ON COLUMN operations.status IS 'Статус операции (completed, in_progress, failed, etc.)';
COMMENT ON COLUMN operations.start_time IS 'Время начала операции';
COMMENT ON COLUMN operations.end_time IS 'Время завершения операции';
COMMENT ON COLUMN operations.duration IS 'Длительность операции в секундах';
COMMENT ON COLUMN operations.trading_point_id IS 'ID торговой точки';
COMMENT ON COLUMN operations.device_id IS 'ID устройства (колонка, резервуар)';
COMMENT ON COLUMN operations.fuel_type IS 'Тип топлива';
COMMENT ON COLUMN operations.quantity IS 'Количество топлива (литры)';
COMMENT ON COLUMN operations.price IS 'Цена за литр';
COMMENT ON COLUMN operations.total_cost IS 'Общая стоимость';
COMMENT ON COLUMN operations.payment_method IS 'Способ оплаты';
COMMENT ON COLUMN operations.progress IS 'Прогресс выполнения операции (0-100%)';
COMMENT ON COLUMN operations.operator_name IS 'Имя оператора';
COMMENT ON COLUMN operations.metadata IS 'Дополнительные данные в JSON формате';

-- Показать созданную структуру
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'operations' 
AND table_schema = 'public'
ORDER BY ordinal_position;