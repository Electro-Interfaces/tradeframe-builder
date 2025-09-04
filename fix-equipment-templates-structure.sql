-- ============================================================
-- Восстановление полной структуры таблицы equipment_templates
-- ============================================================

-- 1. Сначала проверим текущую структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'equipment_templates'
ORDER BY ordinal_position;

-- 2. Добавляем все недостающие колонки
-- Каждая колонка добавляется отдельно с IF NOT EXISTS для безопасности

-- Основные поля
ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS technical_code VARCHAR(100) UNIQUE;

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS system_type VARCHAR(100);

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS default_params JSONB DEFAULT '{}';

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS allow_component_template_ids UUID[] DEFAULT NULL;

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Если таблица совсем пустая или сломана, можно пересоздать её
-- ВНИМАНИЕ: Это удалит все данные! Раскомментируйте только если уверены.
/*
DROP TABLE IF EXISTS equipment_templates CASCADE;

CREATE TABLE equipment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    technical_code VARCHAR(100) UNIQUE,
    system_type VARCHAR(100),
    description TEXT,
    default_params JSONB DEFAULT '{}',
    allow_component_template_ids UUID[] DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем индексы
CREATE INDEX idx_equipment_templates_technical_code ON equipment_templates(technical_code);
CREATE INDEX idx_equipment_templates_system_type ON equipment_templates(system_type);

-- Добавляем комментарии
COMMENT ON TABLE equipment_templates IS 'Шаблоны типов оборудования';
COMMENT ON COLUMN equipment_templates.id IS 'Уникальный идентификатор';
COMMENT ON COLUMN equipment_templates.name IS 'Название типа оборудования';
COMMENT ON COLUMN equipment_templates.technical_code IS 'Технический код для системы';
COMMENT ON COLUMN equipment_templates.system_type IS 'Системный тип оборудования';
COMMENT ON COLUMN equipment_templates.description IS 'Описание типа оборудования';
COMMENT ON COLUMN equipment_templates.default_params IS 'Параметры по умолчанию в формате JSON';
COMMENT ON COLUMN equipment_templates.allow_component_template_ids IS 'Массив UUID разрешённых шаблонов компонентов';
*/

-- 4. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'equipment_templates'
ORDER BY ordinal_position;

-- 5. Проверяем, что таблица готова к работе
SELECT COUNT(*) as total_records FROM equipment_templates;