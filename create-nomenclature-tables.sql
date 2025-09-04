-- Создание полной структуры таблиц nomenclature
-- Создание основной таблицы номенклатуры топлива

CREATE TABLE IF NOT EXISTS nomenclature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    internal_code VARCHAR(50) NOT NULL,
    network_api_code VARCHAR(100),
    network_api_settings JSONB,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    external_id VARCHAR(50), -- Оригинальный ID из localStorage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Уникальность internal_code в рамках сети
    UNIQUE(network_id, internal_code)
);

-- Создание таблицы для внешних кодов номенклатуры
CREATE TABLE IF NOT EXISTS nomenclature_external_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomenclature_id UUID NOT NULL REFERENCES nomenclature(id) ON DELETE CASCADE,
    system_type VARCHAR(20) NOT NULL CHECK (system_type IN ('CRM', '1C', 'PROCESSING', 'OTHER')),
    external_code VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Уникальность комбинации номенклатура + система + код
    UNIQUE(nomenclature_id, system_type, external_code)
);

-- Индексы для производительности таблицы nomenclature
CREATE INDEX IF NOT EXISTS idx_nomenclature_network_id 
    ON nomenclature(network_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_internal_code 
    ON nomenclature(internal_code);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_id 
    ON nomenclature(external_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_status 
    ON nomenclature(status);

CREATE INDEX IF NOT EXISTS idx_nomenclature_name 
    ON nomenclature(name);

-- Индексы для таблицы внешних кодов
CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_nomenclature_id 
    ON nomenclature_external_codes(nomenclature_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_system_type 
    ON nomenclature_external_codes(system_type);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_external_code 
    ON nomenclature_external_codes(external_code);

-- Комментарии к таблице nomenclature
COMMENT ON TABLE nomenclature IS 'Номенклатура топлива для торговых сетей';
COMMENT ON COLUMN nomenclature.network_id IS 'ID торговой сети';
COMMENT ON COLUMN nomenclature.name IS 'Наименование топлива (АИ-92, АИ-95, ДТ и т.д.)';
COMMENT ON COLUMN nomenclature.internal_code IS 'Внутренний код топлива';
COMMENT ON COLUMN nomenclature.network_api_code IS 'Код топлива в API торговой сети';
COMMENT ON COLUMN nomenclature.network_api_settings IS 'Настройки синхронизации с API торговой сети (JSON)';
COMMENT ON COLUMN nomenclature.description IS 'Описание топлива';
COMMENT ON COLUMN nomenclature.status IS 'Статус (active, archived)';
COMMENT ON COLUMN nomenclature.external_id IS 'Оригинальный ID из localStorage для обратной совместимости';
COMMENT ON COLUMN nomenclature.created_by IS 'Пользователь, создавший запись';
COMMENT ON COLUMN nomenclature.updated_by IS 'Пользователь, последний изменивший запись';

-- Комментарии к таблице внешних кодов
COMMENT ON TABLE nomenclature_external_codes IS 'Внешние коды номенклатуры для интеграции с различными системами (1C, CRM, процессинг)';
COMMENT ON COLUMN nomenclature_external_codes.nomenclature_id IS 'ID номенклатуры';
COMMENT ON COLUMN nomenclature_external_codes.system_type IS 'Тип внешней системы (CRM, 1C, PROCESSING, OTHER)';
COMMENT ON COLUMN nomenclature_external_codes.external_code IS 'Внешний код в соответствующей системе';
COMMENT ON COLUMN nomenclature_external_codes.description IS 'Описание внешнего кода';

-- Включение Row Level Security (RLS)
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomenclature_external_codes ENABLE ROW LEVEL SECURITY;

-- Базовые политики RLS (можно настроить позже)
CREATE POLICY "Enable read access for all users" ON nomenclature
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON nomenclature
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON nomenclature
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON nomenclature
    FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON nomenclature_external_codes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON nomenclature_external_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON nomenclature_external_codes
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON nomenclature_external_codes
    FOR DELETE USING (true);

-- Завершено: структура таблиц nomenclature создана успешно!