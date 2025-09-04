-- Fix Equipment RLS and Access Issues
-- Execute this in Supabase SQL Editor to fix access problems

-- First, let's check what we have
SELECT 'Current equipment_templates data:' as info;
SELECT id, name, system_type, status, created_at 
FROM equipment_templates 
LIMIT 10;

-- Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policies_count
FROM pg_tables t
WHERE tablename LIKE '%equipment%'
ORDER BY tablename;

-- Check existing policies
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd as command,
  permissive,
  roles
FROM pg_policies 
WHERE tablename LIKE '%equipment%'
ORDER BY tablename, policyname;

-- ==================================================
-- FIX 1: TEMPORARILY DISABLE RLS FOR TESTING
-- ==================================================

-- Disable RLS on equipment tables for testing
ALTER TABLE equipment_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_components DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled for testing - you should be able to access data now' as status;

-- ==================================================
-- FIX 2: CREATE PERMISSIVE POLICIES (if needed later)
-- ==================================================

-- When you want to re-enable RLS, use these permissive policies:

/*
-- Re-enable RLS
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_components ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY equipment_templates_allow_all ON equipment_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY equipment_allow_all ON equipment
  FOR ALL TO authenticated  
  USING (true)
  WITH CHECK (true);

CREATE POLICY equipment_events_allow_all ON equipment_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY equipment_components_allow_all ON equipment_components
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
*/

-- ==================================================
-- FIX 3: ENSURE DATA EXISTS
-- ==================================================

-- Check if we have equipment templates
SELECT count(*) as templates_count FROM equipment_templates;

-- If no templates, create basic ones
INSERT INTO equipment_templates (
  id, name, technical_code, system_type, status, description, default_params
) 
SELECT * FROM (VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Резервуар', 'EQP_FUEL_TANK', 'fuel_tank', true, 'Топливный резервуар', '{"capacityLiters": 50000}'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'ТРК', 'EQP_FUEL_DISPENSER', 'fuel_dispenser', true, 'Топливораздаточная колонка', '{"nozzleCount": 2}'::jsonb),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Система управления', 'EQP_CONTROL_SYSTEM', 'control_system', true, 'Система управления АЗС', '{"serverType": "industrial"}'::jsonb)
) AS new_templates(id, name, technical_code, system_type, status, description, default_params)
WHERE NOT EXISTS (SELECT 1 FROM equipment_templates WHERE technical_code = new_templates.technical_code);

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Final check
SELECT 'Final verification:' as info;

SELECT 
  'equipment_templates' as table_name,
  count(*) as row_count,
  bool_and(status) as all_active
FROM equipment_templates
UNION ALL
SELECT 
  'equipment' as table_name,
  count(*) as row_count,
  null as all_active  
FROM equipment
UNION ALL
SELECT
  'equipment_events' as table_name,
  count(*) as row_count,
  null as all_active
FROM equipment_events  
UNION ALL
SELECT
  'equipment_components' as table_name,
  count(*) as row_count,
  null as all_active
FROM equipment_components;

-- Show sample data
SELECT 'Sample equipment_templates:' as info;
SELECT id, name, system_type, status, created_at
FROM equipment_templates 
ORDER BY name
LIMIT 5;

SELECT '✅ Equipment tables should now be accessible via API!' as result;