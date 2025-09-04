-- Вставка резервуаров для демо сети АЗС
-- Торговая сеть: Демо сеть АЗС (f5f5961a-4ae0-409f-b4ba-1f630a329434)
-- Торговые точки:
-- point1: 9baf5375-9929-4774-8366-c0609b9f2a51 (АЗС №001 - Центральная)
-- point2: 9be94f90-84d1-4557-b746-460e13485b65 (АЗС №002 - Северная)  
-- point3: f2566905-c748-4240-ac31-47b626ab625d (АЗС №003 - Южная)
-- point5: f7963207-2732-4fae-988e-c73eef7645ca (АЗС №005 - Промзона)

INSERT INTO tanks (
  name, fuel_type, current_level_liters, capacity_liters, min_level_percent, critical_level_percent,
  temperature, water_level_mm, density, is_active, location, installation_date, last_calibration,
  supplier, sensors, linked_pumps, notifications, thresholds, trading_point_id
) VALUES 
-- АЗС №001 - Центральная
('Резервуар №1 (АИ-95)', 'АИ-95', 18500, 25000, 15, 10, 18.5, 2, 0.755, true, 
 'Основная площадка', '2021-03-15', '2024-08-15', 'ТехНефть', 
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 1, "name": "Колонка №1"}, {"id": 2, "name": "Колонка №2"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 '9baf5375-9929-4774-8366-c0609b9f2a51'),

('Резервуар №2 (АИ-92)', 'АИ-92', 15200, 20000, 15, 10, 17.8, 1, 0.745, true,
 'Основная площадка', '2021-03-15', '2024-08-15', 'ТехНефть',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 3, "name": "Колонка №3"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 '9baf5375-9929-4774-8366-c0609b9f2a51'),

('Резервуар №3 (ДТ)', 'ДТ', 12800, 15000, 20, 15, 16.2, 3, 0.840, true,
 'Основная площадка', '2021-05-20', '2024-07-10', 'НефтеГазСервис',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 4, "name": "Дизельная колонка №1"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 '9baf5375-9929-4774-8366-c0609b9f2a51'),

-- АЗС №002 - Северная  
('Резервуар №4 (АИ-95)', 'АИ-95', 22000, 30000, 15, 10, 19.1, 1, 0.758, true,
 'Северный участок', '2020-11-10', '2024-06-20', 'Роснефть',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 5, "name": "Колонка №5"}, {"id": 6, "name": "Колонка №6"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 '9be94f90-84d1-4557-b746-460e13485b65'),

('Резервуар №5 (ДТ)', 'ДТ', 8500, 12000, 20, 15, 15.8, 4, 0.835, true,
 'Северный участок', '2020-11-10', '2024-06-20', 'Роснефть',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 7, "name": "Дизельная колонка №2"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 '9be94f90-84d1-4557-b746-460e13485b65'),

-- АЗС №003 - Южная
('Резервуар №6 (АИ-92)', 'АИ-92', 14500, 18000, 15, 10, 20.3, 2, 0.742, true,
 'Южная площадка', '2022-01-25', '2024-09-01', 'Газпром нефть',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}]',
 '[{"id": 8, "name": "Колонка №7"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 'f2566905-c748-4240-ac31-47b626ab625d'),

-- АЗС №005 - Промзона
('Резервуар №7 (ДТ)', 'ДТ', 35000, 50000, 20, 15, 14.7, 5, 0.845, true,
 'Промышленная зона', '2019-08-12', '2024-05-15', 'ЛУКОЙЛ',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}, {"name": "Давление", "status": "ok"}]',
 '[{"id": 9, "name": "Промышленная колонка №1"}, {"id": 10, "name": "Промышленная колонка №2"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 'f7963207-2732-4fae-988e-c73eef7645ca'),

('Резервуар №8 (АИ-95)', 'АИ-95', 28000, 35000, 15, 10, 16.9, 3, 0.750, true,
 'Промышленная зона', '2019-08-12', '2024-05-15', 'ЛУКОЙЛ',
 '[{"name": "Уровень", "status": "ok"}, {"name": "Температура", "status": "ok"}, {"name": "Давление", "status": "ok"}]',
 '[{"id": 11, "name": "Промышленная колонка №3"}]',
 '{"enabled": true, "drainAlerts": true, "levelAlerts": true}',
 '{"criticalTemp": {"min": -10, "max": 40}, "maxWaterLevel": 15, "notifications": {"critical": true, "minimum": true, "temperature": true, "water": true}}',
 'f7963207-2732-4fae-988e-c73eef7645ca');