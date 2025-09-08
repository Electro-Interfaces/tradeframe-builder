-- Полное обновление шаблона резервуара с ВСЕМИ доступными полями
-- Синхронизация с Tank interface из tanksService.ts

UPDATE equipment_templates 
SET default_params = jsonb_build_object(
    -- Обязательные поля резервуара (синхронизировано с Tank interface)
    'id', 1,
    'name', '',
    'fuelType', '',
    'currentLevelLiters', 0,
    'bookBalance', 0,
    
    -- Параметры емкости
    'capacityLiters', 50000,
    'minLevelPercent', 20,
    'criticalLevelPercent', 10,
    
    -- Физические параметры
    'temperature', 15.0,
    'waterLevelMm', 0.0,
    'density', 0.725,
    
    -- Статус и операционные данные
    'status', 'active',
    'location', 'Зона не указана',
    'installationDate', to_char(NOW(), 'YYYY-MM-DD'),
    'lastCalibration', null,
    'supplier', null,
    
    -- Датчики (полная синхронизация с Tank interface)
    'sensors', jsonb_build_array(
        jsonb_build_object('name', 'Уровень', 'status', 'ok'),
        jsonb_build_object('name', 'Температура', 'status', 'ok')
    ),
    'linkedPumps', jsonb_build_array(),
    
    -- Уведомления (полная синхронизация)
    'notifications', jsonb_build_object(
        'enabled', true,
        'drainAlerts', true,
        'levelAlerts', true
    ),
    
    -- Пороговые значения (полная синхронизация с Tank interface)
    'thresholds', jsonb_build_object(
        'criticalTemp', jsonb_build_object(
            'min', -10,
            'max', 40
        ),
        'maxWaterLevel', 15,
        'notifications', jsonb_build_object(
            'critical', true,
            'minimum', true,
            'temperature', true,
            'water', true
        )
    ),
    
    -- Системные поля (добавлены для полной синхронизации с Tank interface)
    'trading_point_id', '',
    'created_at', NOW()::text,
    'updated_at', NOW()::text
)
WHERE system_type = 'fuel_tank' AND name = 'Резервуар';

-- Проверим результат обновления
SELECT 
    name, 
    system_type, 
    jsonb_pretty(default_params) as formatted_default_params 
FROM equipment_templates 
WHERE system_type = 'fuel_tank'
ORDER BY name;

-- Дополнительная проверка - покажем все ключи в default_params
SELECT 
    name,
    jsonb_object_keys(default_params) as param_keys
FROM equipment_templates 
WHERE system_type = 'fuel_tank' 
ORDER BY name, param_keys;