-- ============================================================
-- Убираем NOT NULL constraints с колонок equipment_templates
-- ============================================================

-- Убираем NOT NULL с system_type (основная проблема)
ALTER TABLE equipment_templates 
ALTER COLUMN system_type DROP NOT NULL;

-- На всякий случай убираем NOT NULL с других необязательных колонок
ALTER TABLE equipment_templates 
ALTER COLUMN technical_code DROP NOT NULL;

ALTER TABLE equipment_templates 
ALTER COLUMN description DROP NOT NULL;

ALTER TABLE equipment_templates 
ALTER COLUMN default_params DROP NOT NULL;

-- Проверяем что name остается NOT NULL (это должна быть обязательная колонка)
-- Если нужно, можно временно убрать и с неё:
-- ALTER TABLE equipment_templates ALTER COLUMN name DROP NOT NULL;

-- Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'equipment_templates'
ORDER BY ordinal_position;

-- Тестируем вставку
INSERT INTO equipment_templates (name) 
VALUES ('Тестовый тип оборудования') 
RETURNING *;
