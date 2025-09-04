-- Исправление структуры таблицы nomenclature
-- Добавление недостающих колонок для миграции

-- Добавление колонок к таблице nomenclature (если они не существуют)
DO $$ 
BEGIN

-- network_api_code - код для API торговой сети
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'nomenclature' AND column_name = 'network_api_code') THEN
    ALTER TABLE nomenclature ADD COLUMN network_api_code VARCHAR(100);
    RAISE NOTICE 'Добавлена колонка network_api_code';
END IF;

-- network_api_settings - настройки API (JSON)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'nomenclature' AND column_name = 'network_api_settings') THEN
    ALTER TABLE nomenclature ADD COLUMN network_api_settings JSONB;
    RAISE NOTICE 'Добавлена колонка network_api_settings';
END IF;

-- external_id - оригинальный ID из localStorage
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'nomenclature' AND column_name = 'external_id') THEN
    ALTER TABLE nomenclature ADD COLUMN external_id VARCHAR(50);
    RAISE NOTICE 'Добавлена колонка external_id';
END IF;

-- created_by - кто создал запись
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'nomenclature' AND column_name = 'created_by') THEN
    ALTER TABLE nomenclature ADD COLUMN created_by VARCHAR(100);
    RAISE NOTICE 'Добавлена колонка created_by';
END IF;

-- updated_by - кто обновил запись
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'nomenclature' AND column_name = 'updated_by') THEN
    ALTER TABLE nomenclature ADD COLUMN updated_by VARCHAR(100);
    RAISE NOTICE 'Добавлена колонка updated_by';
END IF;

END $$;

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_nomenclature_network_id 
    ON nomenclature(network_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_internal_code 
    ON nomenclature(internal_code);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_id 
    ON nomenclature(external_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_status 
    ON nomenclature(status);

-- Комментарии к новым колонкам
COMMENT ON COLUMN nomenclature.network_api_code IS 'Код топлива в API торговой сети';
COMMENT ON COLUMN nomenclature.network_api_settings IS 'Настройки синхронизации с API торговой сети';
COMMENT ON COLUMN nomenclature.external_id IS 'Оригинальный ID из localStorage для обратной совместимости';
COMMENT ON COLUMN nomenclature.created_by IS 'Пользователь, создавший запись';
COMMENT ON COLUMN nomenclature.updated_by IS 'Пользователь, последний изменивший запись';

-- Создание таблицы для внешних кодов номенклатуры (если не существует)
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

-- Индексы для таблицы внешних кодов
CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_nomenclature_id 
    ON nomenclature_external_codes(nomenclature_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_system_type 
    ON nomenclature_external_codes(system_type);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_external_code 
    ON nomenclature_external_codes(external_code);

-- Комментарии к таблице внешних кодов
COMMENT ON TABLE nomenclature_external_codes IS 'Внешние коды номенклатуры для интеграции с различными системами (1C, CRM, процессинг)';
COMMENT ON COLUMN nomenclature_external_codes.system_type IS 'Тип внешней системы (CRM, 1C, PROCESSING, OTHER)';
COMMENT ON COLUMN nomenclature_external_codes.external_code IS 'Внешний код в соответствующей системе';

-- Завершено: структура таблиц nomenclature обновлена успешно!