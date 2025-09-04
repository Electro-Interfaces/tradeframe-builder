-- ===============================================
-- FUEL STOCK SNAPSHOTS FOR HISTORICAL DATA
-- ===============================================

-- Fuel Stock Snapshots - исторические снимки остатков топлива каждые 4 часа
CREATE TABLE fuel_stock_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    fuel_stock_id UUID REFERENCES fuel_stocks(id) ON DELETE SET NULL,
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    
    -- Основные метрики уровня топлива
    snapshot_time TIMESTAMPTZ NOT NULL,
    current_level_liters DECIMAL(12,3) NOT NULL,
    capacity_liters DECIMAL(12,3) NOT NULL,
    level_percent DECIMAL(5,2) GENERATED ALWAYS AS ((current_level_liters / capacity_liters) * 100) STORED,
    
    -- Физические параметры
    temperature DECIMAL(5,2), -- Температура топлива в градусах Цельсия
    water_level_mm DECIMAL(6,2), -- Уровень воды в миллиметрах
    density DECIMAL(8,3), -- Плотность топлива кг/м³
    
    -- Статус резервуара
    tank_status VARCHAR(20) CHECK (tank_status IN ('active', 'maintenance', 'offline')),
    
    -- Режимы работы и скорости
    operation_mode VARCHAR(20) CHECK (operation_mode IN ('normal', 'filling', 'draining', 'maintenance')),
    consumption_rate DECIMAL(8,2) DEFAULT 0, -- Скорость расхода л/час
    fill_rate DECIMAL(8,2) DEFAULT 0, -- Скорость заправки л/час
    
    -- Дополнительные метаданные
    checksum VARCHAR(64), -- SHA256 checksum для валидации данных
    data_source VARCHAR(20) DEFAULT 'generated' CHECK (data_source IN ('sensor', 'manual', 'generated')),
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для эффективных запросов
CREATE INDEX idx_fuel_stock_snapshots_tank ON fuel_stock_snapshots(tank_id);
CREATE INDEX idx_fuel_stock_snapshots_trading_point ON fuel_stock_snapshots(trading_point_id);
CREATE INDEX idx_fuel_stock_snapshots_fuel_type ON fuel_stock_snapshots(fuel_type_id);
CREATE INDEX idx_fuel_stock_snapshots_time ON fuel_stock_snapshots(snapshot_time);
CREATE INDEX idx_fuel_stock_snapshots_tank_time ON fuel_stock_snapshots(tank_id, snapshot_time DESC);
CREATE INDEX idx_fuel_stock_snapshots_level ON fuel_stock_snapshots(level_percent);
CREATE INDEX idx_fuel_stock_snapshots_status ON fuel_stock_snapshots(tank_status);

-- Составной индекс для быстрого поиска по торговой точке и времени
CREATE INDEX idx_fuel_stock_snapshots_tp_time ON fuel_stock_snapshots(trading_point_id, snapshot_time DESC);

-- Индекс для поиска последних снимков по каждому резервуару
CREATE INDEX idx_fuel_stock_snapshots_latest ON fuel_stock_snapshots(tank_id, snapshot_time DESC) 
    WHERE tank_status = 'active';

-- Партиционирование по времени (опционально для больших объемов данных)
-- Закомментировано для начальной версии
-- ALTER TABLE fuel_stock_snapshots PARTITION BY RANGE (snapshot_time);

-- Комментарии к таблице
COMMENT ON TABLE fuel_stock_snapshots IS 'Исторические снимки уровней топлива в резервуарах';
COMMENT ON COLUMN fuel_stock_snapshots.tank_id IS 'Резервуар для которого сделан снимок';
COMMENT ON COLUMN fuel_stock_snapshots.snapshot_time IS 'Время создания снимка';
COMMENT ON COLUMN fuel_stock_snapshots.current_level_liters IS 'Текущий уровень топлива в литрах';
COMMENT ON COLUMN fuel_stock_snapshots.level_percent IS 'Процент заполнения резервуара (вычисляемый)';
COMMENT ON COLUMN fuel_stock_snapshots.temperature IS 'Температура топлива в градусах Цельсия';
COMMENT ON COLUMN fuel_stock_snapshots.water_level_mm IS 'Уровень воды в резервуаре в миллиметрах';
COMMENT ON COLUMN fuel_stock_snapshots.consumption_rate IS 'Скорость расхода топлива в л/час';
COMMENT ON COLUMN fuel_stock_snapshots.fill_rate IS 'Скорость заправки топлива в л/час';
COMMENT ON COLUMN fuel_stock_snapshots.checksum IS 'SHA256 checksum для валидации целостности данных';

-- Триггер для обновления updated_at (если понадобится в будущем)
-- CREATE TRIGGER update_fuel_stock_snapshots_updated_at 
--     BEFORE UPDATE ON fuel_stock_snapshots 
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();