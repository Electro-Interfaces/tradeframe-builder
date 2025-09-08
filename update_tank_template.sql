-- Обновление шаблона резервуара с добавлением книжного остатка
UPDATE equipment_templates 
SET default_params = jsonb_set(
    default_params,
    '{bookBalance}',
    '0',
    true
)
WHERE system_type = 'fuel_tank' AND name = 'Резервуар';

-- Проверим результат
SELECT name, system_type, default_params 
FROM equipment_templates 
WHERE system_type = 'fuel_tank';