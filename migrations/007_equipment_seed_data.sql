-- Equipment seed data
-- Creating default equipment templates and sample equipment

-- ================================================
-- EQUIPMENT TEMPLATES SEED DATA
-- ================================================

-- Insert default equipment templates
INSERT INTO equipment_templates (
  id,
  name,
  display_name, 
  technical_code,
  system_type,
  category,
  status,
  is_system,
  description,
  default_params,
  required_params,
  allow_component_template_ids,
  available_command_ids
) VALUES 
-- Fuel Tank Template
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар',
  'Топливный резервуар',
  'EQP_FUEL_TANK',
  'fuel_tank',
  'storage',
  true,
  true,
  'Топливный резервуар для хранения нефтепродуктов',
  '{
    "id": 1,
    "name": "",
    "fuelType": "",
    "currentLevelLiters": 0,
    "capacityLiters": 50000,
    "minLevelPercent": 20,
    "criticalLevelPercent": 10,
    "temperature": 15.0,
    "waterLevelMm": 0.0,
    "density": 0.725,
    "status": "active",
    "location": "Зона не указана",
    "installationDate": null,
    "lastCalibration": null,
    "supplier": null,
    "material": "steel",
    "thresholds": {
      "criticalTemp": {
        "min": -10,
        "max": 40
      },
      "maxWaterLevel": 15,
      "notifications": {
        "critical": true,
        "minimum": true,
        "temperature": true,
        "water": true
      }
    },
    "sensors": [
      {"name": "Уровень", "status": "ok"},
      {"name": "Температура", "status": "ok"}
    ],
    "linkedPumps": [],
    "notifications": {
      "enabled": true,
      "drainAlerts": true,
      "levelAlerts": true
    }
  }'::jsonb,
  ARRAY['fuelType', 'capacityLiters'],
  ARRAY['comp_sensor_level_1'],
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login']
),

-- Dispenser Template  
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Топливораздаточная колонка',
  'ТРК (Топливораздаточная колонка)',
  'EQP_FUEL_DISPENSER',
  'fuel_dispenser',
  'fuel_dispensing',
  true,
  true,
  'Топливораздаточная колонка для выдачи топлива',
  '{
    "nozzleCount": 2,
    "maxFlowRate": 50,
    "fuelTypes": ["АИ-92", "АИ-95"],
    "paymentMethods": ["card", "cash"],
    "printerEnabled": true,
    "displayType": "LCD"
  }'::jsonb,
  ARRAY['nozzleCount', 'fuelTypes'],
  ARRAY['comp_printer_1', 'comp_display_1'],
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices']
),

-- Control System Template
(
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Система управления',
  'Система управления АЗС',
  'EQP_CONTROL_SYSTEM', 
  'control_system',
  'control',
  true,
  true,
  'Центральная система управления АЗС',
  '{
    "serverType": "industrial",
    "redundancy": true,
    "networkPorts": 8,
    "storageCapacity": "1TB",
    "operatingSystem": "Linux",
    "backupEnabled": true
  }'::jsonb,
  ARRAY['serverType'],
  ARRAY['comp_server_1', 'comp_ups_1'],
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices', 'autooplata_set_prices', 'autooplata_get_services']
),

-- Self Service Terminal
(
  '00000000-0000-0000-0000-000000000004'::uuid,
  'Терминал самообслуживания', 
  'Терминал самообслуживания (ТСО)',
  'EQP_SELF_SERVICE_TERMINAL',
  'self_service_terminal',
  'customer_service',
  true,
  true,
  'Автоматизированный терминал самообслуживания на АЗС',
  '{
    "touchScreen": true,
    "paymentMethods": ["card", "cash", "contactless"],
    "receiptPrinter": true,
    "screenSize": "15 inch",
    "operatingSystem": "Windows",
    "languages": ["ru", "en"]
  }'::jsonb,
  ARRAY['touchScreen', 'paymentMethods'],
  ARRAY['comp_printer_1', 'comp_pinpad_1'],
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status']
),

-- Price Display Board
(
  '00000000-0000-0000-0000-000000000005'::uuid,
  'Табло цен',
  'Электронное табло цен',
  'EQP_PRICE_DISPLAY',
  'price_display', 
  'information',
  true,
  true,
  'Электронное табло для отображения цен на топливо',
  '{
    "displayType": "LED",
    "brightness": 5000,
    "weatherResistance": "IP65",
    "remoteControl": true,
    "fuelLinesCount": 4,
    "digitHeight": "200mm"
  }'::jsonb,
  ARRAY['displayType', 'fuelLinesCount'],
  ARRAY['comp_led_1'],
  ARRAY['autooplata_get_prices', 'autooplata_set_prices']
),

-- CCTV System
(
  '00000000-0000-0000-0000-000000000006'::uuid,
  'Видеонаблюдение',
  'Система видеонаблюдения',
  'EQP_CCTV_SYSTEM',
  'surveillance',
  'security',
  true,
  true,
  'Система видеонаблюдения для безопасности АЗС', 
  '{
    "cameraCount": 8,
    "resolution": "4K",
    "nightVision": true,
    "storageDays": 30,
    "motionDetection": true,
    "remoteAccess": true,
    "recordingFormat": "H.265"
  }'::jsonb,
  ARRAY['cameraCount', 'resolution'],
  ARRAY['comp_camera_1', 'comp_dvr_1'],
  ARRAY['autooplata_equipment_status']
),

-- Audio System  
(
  '00000000-0000-0000-0000-000000000007'::uuid,
  'Звуковое сопровождение',
  'Система звукового сопровождения',
  'EQP_AUDIO_SYSTEM',
  'audio_system',
  'customer_service',
  true,
  true,
  'Система звукового сопровождения и оповещения',
  '{
    "speakerCount": 6,
    "volumeMax": 80,
    "zones": 3,
    "backgroundMusic": true,
    "emergencyAnnouncements": true,
    "weatherResistance": "IP54"
  }'::jsonb,
  ARRAY['speakerCount', 'zones'],
  ARRAY['comp_speaker_1', 'comp_amplifier_1'],
  ARRAY['autooplata_equipment_status']
);

-- ================================================
-- SAMPLE EQUIPMENT DATA
-- ================================================

-- Get the demo network trading point IDs for reference
-- We'll use the existing trading point IDs from the previous migrations

-- Sample equipment for point1 (АЗС №001 - Центральная)
INSERT INTO equipment (
  id,
  trading_point_id,
  template_id, 
  name,
  display_name,
  system_type,
  serial_number,
  external_id,
  status,
  installation_date,
  params,
  available_command_ids,
  created_from_template
) VALUES 

-- Fuel Tanks for point1
(
  'demo_tank_1'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар',
  'Резервуар №1 (АИ-95) - Демо',
  'fuel_tank',
  'DEMO-TANK-001',
  'DEMO_TANK_001',
  'online',
  '2024-01-15T00:00:00Z',
  '{
    "id": 1,
    "name": "Резервуар №1 (АИ-95) - Демо",
    "fuelType": "АИ-95",
    "currentLevelLiters": 42000,
    "capacityLiters": 50000,
    "minLevelPercent": 20,
    "criticalLevelPercent": 10,
    "temperature": 15.2,
    "waterLevelMm": 2,
    "density": 0.725,
    "material": "steel",
    "status": "active",
    "location": "Зона А",
    "thresholds": {
      "criticalTemp": {
        "min": -10,
        "max": 40
      },
      "maxWaterLevel": 15
    }
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login'],
  '00000000-0000-0000-0000-000000000001'::uuid
),

(
  'demo_tank_2'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар',
  'Резервуар №2 (АИ-92) - Демо', 
  'fuel_tank',
  'DEMO-TANK-002',
  'DEMO_TANK_002',
  'online',
  '2024-02-20T00:00:00Z',
  '{
    "id": 2,
    "name": "Резервуар №2 (АИ-92) - Демо",
    "fuelType": "АИ-92", 
    "currentLevelLiters": 35000,
    "capacityLiters": 50000,
    "minLevelPercent": 20,
    "criticalLevelPercent": 10,
    "temperature": 14.8,
    "waterLevelMm": 1,
    "density": 0.725,
    "material": "steel",
    "status": "active",
    "location": "Зона А",
    "thresholds": {
      "criticalTemp": {
        "min": -10,
        "max": 40
      },
      "maxWaterLevel": 15
    }
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login'],
  '00000000-0000-0000-0000-000000000001'::uuid
),

(
  'demo_tank_3'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар',
  'Резервуар №3 (ДТ) - Демо',
  'fuel_tank', 
  'DEMO-TANK-003',
  'DEMO_TANK_003',
  'online',
  '2024-03-10T00:00:00Z',
  '{
    "id": 3,
    "name": "Резервуар №3 (ДТ) - Демо",
    "fuelType": "ДТ",
    "currentLevelLiters": 28000,
    "capacityLiters": 45000,
    "minLevelPercent": 15,
    "criticalLevelPercent": 8,
    "temperature": 12.8,
    "waterLevelMm": 1,
    "density": 0.832,
    "material": "steel", 
    "status": "active",
    "location": "Зона Б",
    "thresholds": {
      "criticalTemp": {
        "min": -10,
        "max": 40
      },
      "maxWaterLevel": 15
    }
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login'],
  '00000000-0000-0000-0000-000000000001'::uuid
),

(
  'demo_tank_4'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар',
  'Резервуар №4 (АИ-98) - Демо',
  'fuel_tank',
  'DEMO-TANK-004',
  'DEMO_TANK_004', 
  'online',
  '2024-04-05T00:00:00Z',
  '{
    "id": 4,
    "name": "Резервуар №4 (АИ-98) - Демо",
    "fuelType": "АИ-98",
    "currentLevelLiters": 8500,
    "capacityLiters": 25000,
    "minLevelPercent": 18,
    "criticalLevelPercent": 9,
    "temperature": 16.1,
    "waterLevelMm": 0.5,
    "density": 0.720,
    "material": "steel",
    "status": "active",
    "location": "Зона В", 
    "thresholds": {
      "criticalTemp": {
        "min": -10,
        "max": 40
      },
      "maxWaterLevel": 15
    }
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login'],
  '00000000-0000-0000-0000-000000000001'::uuid
),

-- Control System for point1
(
  'eq_control_1'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Система управления',
  'Система управления АЗС - Центральная',
  'control_system',
  'SRV-001-CENTRAL',
  'CTRL_001',
  'online',
  '2024-01-05T00:00:00Z',
  '{
    "serverType": "industrial",
    "redundancy": true,
    "networkPorts": 8,
    "storageCapacity": "2TB",
    "operatingSystem": "Linux Ubuntu 22.04",
    "backupEnabled": true,
    "lastBackup": "2024-12-07T23:00:00Z",
    "cpuUsage": 35,
    "memoryUsage": 62,
    "diskUsage": 45
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices', 'autooplata_set_prices', 'autooplata_get_services'],
  '00000000-0000-0000-0000-000000000003'::uuid
),

-- Dispensers for point1  
(
  'eq_dispenser_1_1'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Топливораздаточная колонка',
  'ТРК №1 - Островок А',
  'fuel_dispenser',
  'TRK-001-A',
  'DISP_001_A',
  'online',
  '2024-01-10T00:00:00Z',
  '{
    "nozzleCount": 4,
    "maxFlowRate": 45,
    "fuelTypes": ["АИ-92", "АИ-95", "АИ-98", "ДТ"],
    "paymentMethods": ["card", "cash", "contactless"],
    "printerEnabled": true,
    "displayType": "TFT LCD",
    "location": "Островок А, позиция 1",
    "connectedTanks": ["demo_tank_1", "demo_tank_2", "demo_tank_3", "demo_tank_4"]
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices'],
  '00000000-0000-0000-0000-000000000002'::uuid
),

(
  'eq_dispenser_1_2'::uuid,
  'point1'::uuid, 
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Топливораздаточная колонка',
  'ТРК №2 - Островок А',
  'fuel_dispenser',
  'TRK-002-A',
  'DISP_002_A',
  'online',
  '2024-01-10T00:00:00Z',
  '{
    "nozzleCount": 4,
    "maxFlowRate": 45,
    "fuelTypes": ["АИ-92", "АИ-95", "АИ-98", "ДТ"],
    "paymentMethods": ["card", "cash", "contactless"],
    "printerEnabled": true,
    "displayType": "TFT LCD",
    "location": "Островок А, позиция 2",
    "connectedTanks": ["demo_tank_1", "demo_tank_2", "demo_tank_3", "demo_tank_4"]
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices'],
  '00000000-0000-0000-0000-000000000002'::uuid
),

-- Price Display for point1
(
  'eq_price_display_1'::uuid,
  'point1'::uuid,
  '00000000-0000-0000-0000-000000000005'::uuid,
  'Табло цен',
  'Табло цен - Главное',
  'price_display',
  'PRICE-001-MAIN',
  'PRICE_001',
  'online', 
  '2024-01-08T00:00:00Z',
  '{
    "displayType": "LED",
    "brightness": 6000,
    "weatherResistance": "IP65",
    "remoteControl": true,
    "fuelLinesCount": 4,
    "digitHeight": "250mm",
    "location": "Главный вход",
    "currentPrices": {
      "АИ-92": 52.90,
      "АИ-95": 55.90,
      "АИ-98": 59.90,
      "ДТ": 54.90
    }
  }'::jsonb,
  ARRAY['autooplata_get_prices', 'autooplata_set_prices'],
  '00000000-0000-0000-0000-000000000005'::uuid
);

-- ================================================
-- SAMPLE EQUIPMENT FOR OTHER TRADING POINTS 
-- ================================================

-- Equipment for point2 (АЗС №002 - Северная)
INSERT INTO equipment (
  id, trading_point_id, template_id, name, display_name, system_type,
  serial_number, external_id, status, installation_date, params, 
  available_command_ids, created_from_template
) VALUES
-- Main fuel tank for point2
(
  'eq_tank_p2_1'::uuid, 'point2'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
  'Резервуар', 'Резервуар №1 (АИ-92)', 'fuel_tank',
  'TANK-002-92', 'TANK_P2_92', 'online', '2024-02-01T00:00:00Z',
  '{
    "id": 5, "name": "Резервуар №1 (АИ-92)", "fuelType": "АИ-92",
    "currentLevelLiters": 32000, "capacityLiters": 50000,
    "minLevelPercent": 20, "criticalLevelPercent": 10,
    "temperature": 18.5, "waterLevelMm": 0, "material": "steel",
    "status": "active", "location": "Зона А"
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_login'],
  '00000000-0000-0000-0000-000000000001'::uuid
),
-- Control system for point2
(
  'eq_control_p2_1'::uuid, 'point2'::uuid, '00000000-0000-0000-0000-000000000003'::uuid,
  'Система управления', 'Система управления АЗС - Северная', 'control_system',
  'SRV-002-NORTH', 'CTRL_002', 'online', '2024-02-01T00:00:00Z',
  '{
    "serverType": "industrial", "redundancy": true, "networkPorts": 6,
    "storageCapacity": "1TB", "operatingSystem": "Linux Ubuntu 22.04", 
    "backupEnabled": true
  }'::jsonb,
  ARRAY['autooplata_restart_terminal', 'autooplata_equipment_status', 'autooplata_get_prices', 'autooplata_set_prices', 'autooplata_get_services'],
  '00000000-0000-0000-0000-000000000003'::uuid
);

-- Add equipment event logs for sample equipment
INSERT INTO equipment_events (
  equipment_id, event_type, user_name, details
) VALUES 
('demo_tank_1'::uuid, 'created', 'System', '{"initial_status": "offline", "created_from": "template"}'),
('demo_tank_2'::uuid, 'created', 'System', '{"initial_status": "offline", "created_from": "template"}'),
('demo_tank_3'::uuid, 'created', 'System', '{"initial_status": "offline", "created_from": "template"}'),
('demo_tank_4'::uuid, 'created', 'System', '{"initial_status": "offline", "created_from": "template"}'),
('eq_control_1'::uuid, 'created', 'System', '{"initial_status": "offline", "created_from": "template"}'),
('demo_tank_1'::uuid, 'status_changed', 'System', '{"from": "offline", "to": "online", "reason": "Initial setup"}'),
('demo_tank_2'::uuid, 'status_changed', 'System', '{"from": "offline", "to": "online", "reason": "Initial setup"}'),
('demo_tank_3'::uuid, 'status_changed', 'System', '{"from": "offline", "to": "online", "reason": "Initial setup"}'),
('demo_tank_4'::uuid, 'status_changed', 'System', '{"from": "offline", "to": "online", "reason": "Initial setup"}'),
('eq_control_1'::uuid, 'status_changed', 'System', '{"from": "offline", "to": "online", "reason": "Initial setup"}');

-- ================================================
-- USEFUL QUERIES FOR TESTING
-- ================================================

/*
-- Get all equipment templates
SELECT * FROM equipment_templates ORDER BY name;

-- Get all equipment for a trading point
SELECT e.*, et.display_name as template_name 
FROM equipment e 
LEFT JOIN equipment_templates et ON e.template_id = et.id
WHERE e.trading_point_id = 'point1'::uuid
ORDER BY e.display_name;

-- Get equipment with component counts
SELECT 
  e.id,
  e.display_name,
  e.system_type,
  e.status,
  COUNT(ec.id) as component_count
FROM equipment e
LEFT JOIN equipment_components ec ON e.id = ec.equipment_id
WHERE e.trading_point_id = 'point1'::uuid
GROUP BY e.id, e.display_name, e.system_type, e.status
ORDER BY e.display_name;

-- Get equipment events for specific equipment
SELECT * FROM equipment_events 
WHERE equipment_id = 'demo_tank_1'::uuid 
ORDER BY timestamp DESC;
*/