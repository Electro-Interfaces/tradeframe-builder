-- Добавление колонки allow_component_template_ids в таблицу equipment_templates
-- Эта колонка хранит массив UUID разрешённых шаблонов компонентов

ALTER TABLE equipment_templates 
ADD COLUMN IF NOT EXISTS allow_component_template_ids uuid[] DEFAULT NULL;

-- Добавим комментарий к колонке
COMMENT ON COLUMN equipment_templates.allow_component_template_ids IS 'Массив UUID разрешённых шаблонов компонентов для данного типа оборудования';

-- Проверим структуру таблицы после изменения
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'equipment_templates'
ORDER BY ordinal_position;