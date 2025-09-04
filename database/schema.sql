-- =====================================================
-- TRADEFRAME DATABASE SCHEMA v1.0
-- PostgreSQL/Supabase Production Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Networks (Торговые сети)
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Points (Торговые точки)
CREATE TABLE IF NOT EXISTS trading_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    location JSONB, -- {lat, lng, region, city}
    type VARCHAR(50) CHECK (type IN ('station', 'terminal', 'depot', 'warehouse')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'closed')),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network_id, code)
);

-- Users (Пользователи)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt/argon2
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles (Роли)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES roles(id),
    scope VARCHAR(50) CHECK (scope IN ('global', 'network', 'trading_point')),
    permissions JSONB DEFAULT '[]', -- Array of permission codes
    is_system BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles (Связь пользователей и ролей)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE, -- NULL for global roles
    trading_point_id UUID REFERENCES trading_points(id) ON DELETE CASCADE, -- NULL for network/global roles
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id, network_id, trading_point_id)
);

-- =====================================================
-- FUEL & NOMENCLATURE
-- =====================================================

-- Fuel Types (Типы топлива)
CREATE TABLE IF NOT EXISTS fuel_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(50) CHECK (category IN ('gasoline', 'diesel', 'gas', 'other')),
    octane_number INTEGER,
    density DECIMAL(10,4), -- kg/m³
    unit VARCHAR(10) DEFAULT 'L' CHECK (unit IN ('L', 'KG', 'M3')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EQUIPMENT & TANKS
-- =====================================================

-- Equipment Types (Типы оборудования)
CREATE TABLE IF NOT EXISTS equipment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment (Оборудование)
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error', 'offline')),
    installation_date DATE,
    last_maintenance DATE,
    next_maintenance DATE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tanks (Резервуары)
CREATE TABLE IF NOT EXISTS tanks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    fuel_type_id UUID REFERENCES fuel_types(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    capacity DECIMAL(15,2) NOT NULL, -- Liters
    current_volume DECIMAL(15,2) DEFAULT 0,
    min_volume DECIMAL(15,2) DEFAULT 0,
    max_volume DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'empty', 'filling')),
    last_calibration DATE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trading_point_id, code)
);

-- =====================================================
-- PRICES
-- =====================================================

-- Price Packages (Пакеты цен)
CREATE TABLE IF NOT EXISTS price_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'archived')),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network_id, code)
);

-- Prices (Цены)
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES price_packages(id) ON DELETE CASCADE,
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id),
    price_net DECIMAL(15,2) NOT NULL, -- Цена без НДС в копейках
    vat_rate DECIMAL(5,2) DEFAULT 20, -- Процент НДС
    price_gross DECIMAL(15,2) NOT NULL, -- Цена с НДС в копейках
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api', 'package')),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OPERATIONS & TRANSACTIONS
-- =====================================================

-- Operations (Операции)
CREATE TABLE IF NOT EXISTS operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
        'sale', 'refund', 'correction', 'maintenance', 
        'tank_loading', 'diagnostics', 'sensor_calibration'
    )),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    )),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration INTEGER, -- minutes
    device_id VARCHAR(100),
    operator_id UUID REFERENCES users(id),
    details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Транзакции)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    fuel_type_id UUID REFERENCES fuel_types(id),
    tank_id UUID REFERENCES tanks(id),
    quantity DECIMAL(15,3) NOT NULL, -- Liters or KG
    price_per_unit DECIMAL(15,2) NOT NULL, -- Price per liter/kg
    total_amount DECIMAL(15,2) NOT NULL, -- Total cost
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'cash', 'bank_card', 'corporate_card', 'fuel_card', 'online_order'
    )),
    customer_id UUID REFERENCES users(id),
    vehicle_number VARCHAR(50),
    receipt_number VARCHAR(100),
    fiscal_data JSONB, -- Fiscal printer data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDIT & LOGGING
-- =====================================================

-- Audit Log (Аудит)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc
    entity_type VARCHAR(100) NOT NULL, -- Table name
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Networks
CREATE INDEX idx_networks_status ON networks(status);
CREATE INDEX idx_networks_code ON networks(code);

-- Trading Points
CREATE INDEX idx_trading_points_network ON trading_points(network_id);
CREATE INDEX idx_trading_points_status ON trading_points(status);
CREATE INDEX idx_trading_points_code ON trading_points(network_id, code);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- User Roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_network ON user_roles(network_id);
CREATE INDEX idx_user_roles_trading_point ON user_roles(trading_point_id);

-- Equipment
CREATE INDEX idx_equipment_trading_point ON equipment(trading_point_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type_id);
CREATE INDEX idx_equipment_status ON equipment(status);

-- Tanks
CREATE INDEX idx_tanks_trading_point ON tanks(trading_point_id);
CREATE INDEX idx_tanks_fuel_type ON tanks(fuel_type_id);
CREATE INDEX idx_tanks_equipment ON tanks(equipment_id);
CREATE INDEX idx_tanks_status ON tanks(status);

-- Prices
CREATE INDEX idx_prices_trading_point ON prices(trading_point_id);
CREATE INDEX idx_prices_fuel_type ON prices(fuel_type_id);
CREATE INDEX idx_prices_package ON prices(package_id);
CREATE INDEX idx_prices_valid_from ON prices(valid_from);
CREATE INDEX idx_prices_valid_to ON prices(valid_to);

-- Operations
CREATE INDEX idx_operations_trading_point ON operations(trading_point_id);
CREATE INDEX idx_operations_type ON operations(operation_type);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_start_time ON operations(start_time);
CREATE INDEX idx_operations_operator ON operations(operator_id);

-- Transactions
CREATE INDEX idx_transactions_operation ON transactions(operation_id);
CREATE INDEX idx_transactions_fuel_type ON transactions(fuel_type_id);
CREATE INDEX idx_transactions_tank ON transactions(tank_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);

-- Audit Log
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_points_updated_at BEFORE UPDATE ON trading_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_types_updated_at BEFORE UPDATE ON fuel_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_types_updated_at BEFORE UPDATE ON equipment_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tanks_updated_at BEFORE UPDATE ON tanks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_packages_updated_at BEFORE UPDATE ON price_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUDIT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Get user from session or application context
    audit_user_id := current_setting('app.current_user_id', TRUE)::UUID;
    
    IF (TG_OP = 'DELETE') THEN
        old_data := to_jsonb(OLD);
        INSERT INTO audit_log(
            user_id, action, entity_type, entity_id, old_values, created_at
        ) VALUES (
            audit_user_id, TG_OP, TG_TABLE_NAME, OLD.id, old_data, NOW()
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        INSERT INTO audit_log(
            user_id, action, entity_type, entity_id, old_values, new_values, created_at
        ) VALUES (
            audit_user_id, TG_OP, TG_TABLE_NAME, NEW.id, old_data, new_data, NOW()
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_data := to_jsonb(NEW);
        INSERT INTO audit_log(
            user_id, action, entity_type, entity_id, new_values, created_at
        ) VALUES (
            audit_user_id, TG_OP, TG_TABLE_NAME, NEW.id, new_data, NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_operations AFTER INSERT OR UPDATE OR DELETE ON operations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_prices AFTER INSERT OR UPDATE OR DELETE ON prices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert system roles
INSERT INTO roles (name, code, scope, permissions, is_system) VALUES
    ('System Administrator', 'system_admin', 'global', '["*"]', TRUE),
    ('Network Administrator', 'network_admin', 'network', '["network.*", "trading_point.*", "user.read", "user.write"]', TRUE),
    ('Point Manager', 'point_manager', 'trading_point', '["trading_point.*", "operation.*", "user.read"]', TRUE),
    ('Operator', 'operator', 'trading_point', '["operation.create", "operation.read", "tank.read"]', TRUE),
    ('Viewer', 'viewer', 'global', '["*.read"]', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Insert default fuel types
INSERT INTO fuel_types (name, code, category, octane_number, unit) VALUES
    ('АИ-92', 'AI92', 'gasoline', 92, 'L'),
    ('АИ-95', 'AI95', 'gasoline', 95, 'L'),
    ('АИ-98', 'AI98', 'gasoline', 98, 'L'),
    ('АИ-100', 'AI100', 'gasoline', 100, 'L'),
    ('ДТ', 'DT', 'diesel', NULL, 'L'),
    ('ДТ Арктика', 'DT_ARCTIC', 'diesel', NULL, 'L')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (for Supabase)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be expanded based on requirements)
-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::UUID = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::UUID = id);

-- Allow all authenticated users to read networks
CREATE POLICY "Authenticated users can read networks" ON networks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to read trading points
CREATE POLICY "Authenticated users can read trading points" ON trading_points
    FOR SELECT USING (auth.role() = 'authenticated');

-- More policies to be added based on business requirements...

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA public IS 'Tradeframe Trading Platform Database Schema v1.0';
COMMENT ON TABLE networks IS 'Trading networks - top level organizational unit';
COMMENT ON TABLE trading_points IS 'Individual trading points (gas stations, terminals, etc)';
COMMENT ON TABLE users IS 'System users with authentication credentials';
COMMENT ON TABLE roles IS 'Role definitions with hierarchical permissions';
COMMENT ON TABLE operations IS 'All business operations (sales, maintenance, etc)';
COMMENT ON TABLE transactions IS 'Financial transactions linked to operations';
COMMENT ON TABLE audit_log IS 'Complete audit trail for compliance';