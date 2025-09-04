-- MINIMAL Equipment Setup - Execute this in Supabase SQL Editor
-- This creates only the essential equipment_templates table with correct structure

-- Step 1: Create equipment_templates table (CORRECTED VERSION)
CREATE TABLE IF NOT EXISTS equipment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  technical_code TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,  -- This column was missing!
  description TEXT,
  default_params JSONB NOT NULL DEFAULT '{}',
  allow_component_template_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Insert basic templates
INSERT INTO equipment_templates (id, name, technical_code, system_type, status, description, default_params) VALUES 
('00000000-0000-0000-0000-000000000001'::uuid, 'Резервуар', 'EQP_FUEL_TANK', 'fuel_tank', true, 'Топливный резервуар', '{"capacityLiters": 50000, "fuelType": "АИ-95"}'),
('00000000-0000-0000-0000-000000000002'::uuid, 'ТРК', 'EQP_FUEL_DISPENSER', 'fuel_dispenser', true, 'Топливораздаточная колонка', '{"nozzleCount": 2}'),
('00000000-0000-0000-0000-000000000003'::uuid, 'Система управления', 'EQP_CONTROL_SYSTEM', 'control_system', true, 'Система управления АЗС', '{"serverType": "industrial"}');

-- Step 3: Enable RLS and create basic policy
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_templates_read_policy ON equipment_templates
  FOR SELECT TO authenticated
  USING (true);

-- Step 4: Verify setup
SELECT 
  'Setup complete! ✅' as status,
  count(*) as templates_created
FROM equipment_templates;

-- Show created templates
SELECT id, name, system_type, status FROM equipment_templates ORDER BY name;