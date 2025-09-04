-- ===============================================
-- TRADEFRAME PLATFORM - INITIAL SCHEMA
-- Migration: 001_initial_schema.sql
-- ===============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- ===============================================
-- CORE TABLES
-- ===============================================

-- Networks (Trading Networks)
CREATE TABLE networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Points
CREATE TABLE trading_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    schedule JSONB DEFAULT '{}',
    services JSONB DEFAULT '{}',
    external_codes JSONB DEFAULT '[]',
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    position VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'manager', 'network_admin', 'system_admin')),
    network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
    trading_point_ids JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    scope VARCHAR(50) NOT NULL DEFAULT 'network' CHECK (scope IN ('global', 'network', 'trading_point')),
    scope_values JSONB DEFAULT '[]',
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(code, network_id)
);

-- User Roles Junction Table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Fuel Types
CREATE TABLE fuel_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100),
    density DECIMAL(8,4),
    octane_rating INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- EQUIPMENT TABLES
-- ===============================================

-- Equipment Templates
CREATE TABLE equipment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    system_type VARCHAR(100) NOT NULL,
    technical_code VARCHAR(100),
    default_params JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES equipment_templates(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    system_type VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255),
    external_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'disabled', 'archived', 'maintenance')),
    installation_date TIMESTAMPTZ NOT NULL,
    params JSONB DEFAULT '{}',
    bindings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Equipment Events
CREATE TABLE equipment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'
);

-- Components
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('ok', 'warning', 'error', 'unknown')),
    last_check TIMESTAMPTZ,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Equipment Log
CREATE TABLE equipment_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- FUEL & STORAGE TABLES
-- ===============================================

-- Tanks
CREATE TABLE tanks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL,
    capacity DECIMAL(12,3) NOT NULL,
    current_volume DECIMAL(12,3) DEFAULT 0,
    min_volume DECIMAL(12,3) DEFAULT 0,
    max_volume DECIMAL(12,3),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
    last_calibration TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tank Events
CREATE TABLE tank_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'
);

-- Fuel Stocks
CREATE TABLE fuel_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    tank_id UUID REFERENCES tanks(id) ON DELETE SET NULL,
    current_volume DECIMAL(12,3) NOT NULL DEFAULT 0,
    reserved_volume DECIMAL(12,3) DEFAULT 0,
    available_volume DECIMAL(12,3) GENERATED ALWAYS AS (current_volume - COALESCE(reserved_volume, 0)) STORED,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    alerts JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel Measurement History
CREATE TABLE fuel_measurement_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_stock_id UUID NOT NULL REFERENCES fuel_stocks(id) ON DELETE CASCADE,
    measured_volume DECIMAL(12,3) NOT NULL,
    measurement_type VARCHAR(50) DEFAULT 'manual' CHECK (measurement_type IN ('manual', 'automatic', 'calibration')),
    measured_by UUID REFERENCES users(id) ON DELETE SET NULL,
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ===============================================
-- OPERATIONS TABLES
-- ===============================================

-- Operations
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sale', 'purchase', 'transfer', 'inventory', 'adjustment', 'maintenance')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL,
    volume DECIMAL(12,3),
    price_per_liter DECIMAL(10,4),
    total_amount DECIMAL(15,2),
    payment_method VARCHAR(50),
    operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_info JSONB DEFAULT '{}',
    equipment_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price History
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    price DECIMAL(10,4) NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    set_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Networks
CREATE INDEX idx_networks_status ON networks(status);
CREATE INDEX idx_networks_code ON networks(code);

-- Trading Points
CREATE INDEX idx_trading_points_network ON trading_points(network_id);
CREATE INDEX idx_trading_points_location ON trading_points(latitude, longitude);
CREATE INDEX idx_trading_points_blocked ON trading_points(is_blocked);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_network ON users(network_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_deleted ON users(deleted_at);

-- Roles
CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_network ON roles(network_id);
CREATE INDEX idx_roles_system ON roles(is_system);
CREATE INDEX idx_roles_active ON roles(is_active);

-- Equipment
CREATE INDEX idx_equipment_trading_point ON equipment(trading_point_id);
CREATE INDEX idx_equipment_template ON equipment(template_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_type ON equipment(system_type);
CREATE INDEX idx_equipment_deleted ON equipment(deleted_at);

-- Equipment Events
CREATE INDEX idx_equipment_events_equipment ON equipment_events(equipment_id);
CREATE INDEX idx_equipment_events_timestamp ON equipment_events(timestamp);
CREATE INDEX idx_equipment_events_type ON equipment_events(event_type);

-- Components
CREATE INDEX idx_components_equipment ON components(equipment_id);
CREATE INDEX idx_components_status ON components(status);
CREATE INDEX idx_components_deleted ON components(deleted_at);

-- Equipment Log
CREATE INDEX idx_equipment_log_equipment ON equipment_log(equipment_id);
CREATE INDEX idx_equipment_log_severity ON equipment_log(severity);
CREATE INDEX idx_equipment_log_created ON equipment_log(created_at);
CREATE INDEX idx_equipment_log_resolved ON equipment_log(is_resolved);

-- Tanks
CREATE INDEX idx_tanks_trading_point ON tanks(trading_point_id);
CREATE INDEX idx_tanks_fuel_type ON tanks(fuel_type_id);
CREATE INDEX idx_tanks_status ON tanks(status);

-- Fuel Stocks
CREATE INDEX idx_fuel_stocks_trading_point ON fuel_stocks(trading_point_id);
CREATE INDEX idx_fuel_stocks_fuel_type ON fuel_stocks(fuel_type_id);
CREATE INDEX idx_fuel_stocks_tank ON fuel_stocks(tank_id);

-- Operations
CREATE INDEX idx_operations_trading_point ON operations(trading_point_id);
CREATE INDEX idx_operations_type ON operations(type);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_fuel_type ON operations(fuel_type_id);
CREATE INDEX idx_operations_created ON operations(created_at);
CREATE INDEX idx_operations_operator ON operations(operator_id);

-- Price History
CREATE INDEX idx_price_history_trading_point ON price_history(trading_point_id);
CREATE INDEX idx_price_history_fuel_type ON price_history(fuel_type_id);
CREATE INDEX idx_price_history_effective ON price_history(effective_date);

-- ===============================================
-- TRIGGERS FOR UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON networks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_points_updated_at BEFORE UPDATE ON trading_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_types_updated_at BEFORE UPDATE ON fuel_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_templates_updated_at BEFORE UPDATE ON equipment_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tanks_updated_at BEFORE UPDATE ON tanks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_stocks_updated_at BEFORE UPDATE ON fuel_stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE networks IS 'Trading networks - top level organizational units';
COMMENT ON TABLE trading_points IS 'Individual gas stations or trading locations';
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE roles IS 'Custom roles with granular permissions';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE fuel_types IS 'Types of fuel available in the system';
COMMENT ON TABLE equipment_templates IS 'Templates for different equipment types';
COMMENT ON TABLE equipment IS 'Physical equipment at trading points';
COMMENT ON TABLE equipment_events IS 'Event log for equipment changes and actions';
COMMENT ON TABLE components IS 'Individual components within equipment';
COMMENT ON TABLE equipment_log IS 'Maintenance and issue log for equipment';
COMMENT ON TABLE tanks IS 'Fuel storage tanks at trading points';
COMMENT ON TABLE tank_events IS 'Event log for tank operations';
COMMENT ON TABLE fuel_stocks IS 'Current fuel inventory levels';
COMMENT ON TABLE fuel_measurement_history IS 'History of fuel level measurements';
COMMENT ON TABLE operations IS 'Business operations (sales, purchases, etc.)';
COMMENT ON TABLE price_history IS 'Historical fuel pricing data';