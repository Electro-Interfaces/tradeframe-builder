-- Equipment section migration
-- Creating equipment and equipment_templates tables with full functionality

-- ================================================
-- EQUIPMENT TEMPLATES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS equipment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  technical_code TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Status and configuration
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

-- Create indexes for equipment_templates
CREATE INDEX IF NOT EXISTS idx_equipment_templates_system_type ON equipment_templates(system_type);
CREATE INDEX IF NOT EXISTS idx_equipment_templates_status ON equipment_templates(status);
CREATE INDEX IF NOT EXISTS idx_equipment_templates_technical_code ON equipment_templates(technical_code);

-- ================================================
-- EQUIPMENT TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
  template_id UUID REFERENCES equipment_templates(id) ON DELETE SET NULL,
  
  -- Basic information (copied from template)
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  
  -- Instance-specific data
  serial_number TEXT,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'disabled', 'archived', 'maintenance')),
  installation_date TIMESTAMP WITH TIME ZONE,
  
  -- Configuration and bindings
  params JSONB NOT NULL DEFAULT '{}',
  bindings JSONB,
  
  -- Available commands for this equipment instance
  available_command_ids TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_from_template UUID REFERENCES equipment_templates(id),
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for equipment
CREATE INDEX IF NOT EXISTS idx_equipment_trading_point ON equipment(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_equipment_template ON equipment(template_id);
CREATE INDEX IF NOT EXISTS idx_equipment_system_type ON equipment(system_type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_external_id ON equipment(external_id);
CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at ON equipment(deleted_at);

-- ================================================
-- EQUIPMENT EVENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS equipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Event data
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed', 'command_executed', 'deleted')),
  user_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for equipment_events
CREATE INDEX IF NOT EXISTS idx_equipment_events_equipment_id ON equipment_events(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_events_user_id ON equipment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_events_event_type ON equipment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_equipment_events_timestamp ON equipment_events(timestamp DESC);

-- ================================================
-- EQUIPMENT COMPONENTS TABLE (for future use)
-- ================================================
CREATE TABLE IF NOT EXISTS equipment_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  template_id UUID REFERENCES component_templates(id) ON DELETE SET NULL,
  
  -- Component data
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  serial_number TEXT,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'disabled', 'archived', 'maintenance')),
  
  -- Configuration
  params JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for equipment_components
CREATE INDEX IF NOT EXISTS idx_equipment_components_equipment_id ON equipment_components(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_components_template_id ON equipment_components(template_id);
CREATE INDEX IF NOT EXISTS idx_equipment_components_status ON equipment_components(status);

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_equipment_templates_updated_at 
  BEFORE UPDATE ON equipment_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON equipment 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_components_updated_at 
  BEFORE UPDATE ON equipment_components 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log equipment events
CREATE OR REPLACE FUNCTION log_equipment_event()
RETURNS TRIGGER AS $$
DECLARE
    event_type_val TEXT;
    user_name_val TEXT;
    details_val JSONB;
BEGIN
    -- Determine event type
    IF TG_OP = 'INSERT' THEN
        event_type_val = 'created';
        details_val = jsonb_build_object('initial_status', NEW.status);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            event_type_val = 'status_changed';
            details_val = jsonb_build_object('from', OLD.status, 'to', NEW.status);
        ELSE
            event_type_val = 'updated';
            details_val = jsonb_build_object('fields_changed', 
                CASE 
                    WHEN OLD.display_name != NEW.display_name THEN jsonb_build_array('display_name')
                    ELSE jsonb_build_array()
                END
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        event_type_val = 'deleted';
        details_val = jsonb_build_object('final_status', OLD.status);
    END IF;
    
    -- Get user name (fallback to 'System' if no user)
    SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'System') 
    INTO user_name_val
    FROM auth.users 
    WHERE id = COALESCE(NEW.updated_by, OLD.updated_by);
    
    -- Insert event
    INSERT INTO equipment_events (
        equipment_id, 
        user_id, 
        event_type, 
        user_name, 
        details
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.updated_by, OLD.updated_by),
        event_type_val,
        COALESCE(user_name_val, 'System'),
        details_val
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for equipment event logging
CREATE TRIGGER log_equipment_changes 
  AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION log_equipment_event();

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_components ENABLE ROW LEVEL SECURITY;

-- Equipment Templates policies (readable by all authenticated users, modifiable by admins)
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

-- Equipment policies (network-based access)
CREATE POLICY equipment_select_policy ON equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_points tp
      JOIN user_networks un ON tp.network_id = un.network_id
      WHERE tp.id = equipment.trading_point_id
      AND un.user_id = auth.uid()
    )
  );

CREATE POLICY equipment_insert_policy ON equipment
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_points tp
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE tp.id = equipment.trading_point_id
      AND un.user_id = auth.uid()
      AND r.name IN ('manager', 'network_admin', 'system_admin')
    )
  );

CREATE POLICY equipment_update_policy ON equipment
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_points tp
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE tp.id = equipment.trading_point_id
      AND un.user_id = auth.uid()
      AND r.name IN ('operator', 'manager', 'network_admin', 'system_admin')
    )
  );

CREATE POLICY equipment_delete_policy ON equipment
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_points tp
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE tp.id = equipment.trading_point_id
      AND un.user_id = auth.uid()
      AND r.name IN ('system_admin')
    )
  );

-- Equipment Events policies (same as equipment)
CREATE POLICY equipment_events_select_policy ON equipment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN trading_points tp ON e.trading_point_id = tp.id
      JOIN user_networks un ON tp.network_id = un.network_id
      WHERE e.id = equipment_events.equipment_id
      AND un.user_id = auth.uid()
    )
  );

CREATE POLICY equipment_events_insert_policy ON equipment_events
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Events are created by triggers

-- Equipment Components policies (same as equipment)
CREATE POLICY equipment_components_select_policy ON equipment_components
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN trading_points tp ON e.trading_point_id = tp.id
      JOIN user_networks un ON tp.network_id = un.network_id
      WHERE e.id = equipment_components.equipment_id
      AND un.user_id = auth.uid()
    )
  );

CREATE POLICY equipment_components_insert_policy ON equipment_components
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN trading_points tp ON e.trading_point_id = tp.id
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE e.id = equipment_components.equipment_id
      AND un.user_id = auth.uid()
      AND r.name IN ('manager', 'network_admin', 'system_admin')
    )
  );

CREATE POLICY equipment_components_update_policy ON equipment_components
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN trading_points tp ON e.trading_point_id = tp.id
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE e.id = equipment_components.equipment_id
      AND un.user_id = auth.uid()
      AND r.name IN ('operator', 'manager', 'network_admin', 'system_admin')
    )
  );

CREATE POLICY equipment_components_delete_policy ON equipment_components
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN trading_points tp ON e.trading_point_id = tp.id
      JOIN user_networks un ON tp.network_id = un.network_id
      JOIN user_roles ur ON un.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE e.id = equipment_components.equipment_id
      AND un.user_id = auth.uid()
      AND r.name IN ('manager', 'network_admin', 'system_admin')
    )
  );

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE equipment_templates IS 'Equipment templates define types of equipment that can be created';
COMMENT ON TABLE equipment IS 'Equipment instances at trading points';
COMMENT ON TABLE equipment_events IS 'Audit log for equipment changes';
COMMENT ON TABLE equipment_components IS 'Components belonging to equipment instances';

COMMENT ON COLUMN equipment_templates.system_type IS 'System type: fuel_tank, dispenser, control_system, etc.';
COMMENT ON COLUMN equipment_templates.category IS 'Category: storage, fuel_dispensing, control, monitoring, etc.';
COMMENT ON COLUMN equipment_templates.is_system IS 'System templates cannot be deleted';
COMMENT ON COLUMN equipment_templates.default_params IS 'Default parameters for equipment created from this template';
COMMENT ON COLUMN equipment_templates.param_schema IS 'JSON Schema for parameter validation';

COMMENT ON COLUMN equipment.params IS 'Equipment instance parameters (merged from template defaults)';
COMMENT ON COLUMN equipment.bindings IS 'Bindings to other systems (tanks, controllers, etc.)';
COMMENT ON COLUMN equipment.created_from_template IS 'Template ID used to create this equipment (for history)';