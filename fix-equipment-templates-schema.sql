-- Fix Equipment Templates Schema Issues
-- This script fixes column name mismatches and ensures proper structure

-- First, let's check what columns exist in equipment_templates
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'equipment_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the table doesn't exist or has wrong structure, drop and recreate it
DROP TABLE IF EXISTS equipment_templates CASCADE;

-- Create equipment_templates table with correct column names
CREATE TABLE equipment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  technical_code TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Status field (this was missing!)
  status BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  
  -- Parameters and schema
  default_params JSONB NOT NULL DEFAULT '{}',
  required_params TEXT[] NOT NULL DEFAULT '{}',
  param_schema JSONB,
  
  -- Relations
  allow_component_template_ids TEXT[] DEFAULT '{}',
  available_command_ids TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_templates_system_type ON equipment_templates(system_type);
CREATE INDEX IF NOT EXISTS idx_equipment_templates_status ON equipment_templates(status);
CREATE INDEX IF NOT EXISTS idx_equipment_templates_technical_code ON equipment_templates(technical_code);

-- Insert the default equipment templates with proper structure
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
  true,  -- status column!
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
  true,  -- status column!
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
  true,  -- status column!
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
  true,  -- status column!
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
  true,  -- status column!
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
  true,  -- status column!
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
  true,  -- status column!
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

-- Enable RLS if not already enabled
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS equipment_templates_select_policy ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_insert_policy ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_update_policy ON equipment_templates;
DROP POLICY IF EXISTS equipment_templates_delete_policy ON equipment_templates;

-- Create RLS policies
CREATE POLICY equipment_templates_select_policy ON equipment_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY equipment_templates_insert_policy ON equipment_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('system_admin', 'network_admin')
    )
  );

CREATE POLICY equipment_templates_update_policy ON equipment_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('system_admin', 'network_admin')
    )
  );

CREATE POLICY equipment_templates_delete_policy ON equipment_templates
  FOR DELETE TO authenticated
  USING (
    NOT is_system AND
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'system_admin'
    )
  );

-- Verify the table structure
SELECT 
  'Equipment templates table created successfully!' as result,
  count(*) as template_count
FROM equipment_templates;

-- Show all templates
SELECT 
  name,
  system_type,
  status,
  is_system,
  description
FROM equipment_templates 
ORDER BY name;