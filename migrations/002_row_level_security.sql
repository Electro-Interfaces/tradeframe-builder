-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 002_row_level_security.sql
-- Multi-tenant data isolation by network_id
-- ===============================================

-- ===============================================
-- ENABLE RLS ON ALL TABLES
-- ===============================================

ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_measurement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- HELPER FUNCTIONS FOR RLS
-- ===============================================

-- Get current user's network_id from JWT
CREATE OR REPLACE FUNCTION current_user_network_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'network_id', '')::UUID;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role from JWT
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'role', '');
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's ID from JWT
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'userId', '')::UUID;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() = 'system_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is network admin or higher
CREATE OR REPLACE FUNCTION is_network_admin_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() IN ('network_admin', 'system_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- NETWORKS TABLE POLICIES
-- ===============================================

-- System admins can see all networks, others can only see their own
CREATE POLICY "networks_select_policy" ON networks
    FOR SELECT USING (
        is_system_admin() OR 
        id = current_user_network_id()
    );

-- Only system admins can create networks
CREATE POLICY "networks_insert_policy" ON networks
    FOR INSERT WITH CHECK (is_system_admin());

-- System admins can update all, network admins can update their own
CREATE POLICY "networks_update_policy" ON networks
    FOR UPDATE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND id = current_user_network_id())
    );

-- Only system admins can delete networks
CREATE POLICY "networks_delete_policy" ON networks
    FOR DELETE USING (is_system_admin());

-- ===============================================
-- TRADING POINTS TABLE POLICIES
-- ===============================================

-- Users can only see trading points in their network
CREATE POLICY "trading_points_select_policy" ON trading_points
    FOR SELECT USING (
        is_system_admin() OR 
        network_id = current_user_network_id()
    );

-- Network admins and above can create trading points in their network
CREATE POLICY "trading_points_insert_policy" ON trading_points
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id())
    );

-- Network admins and above can update trading points in their network
CREATE POLICY "trading_points_update_policy" ON trading_points
    FOR UPDATE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id())
    );

-- Network admins and above can delete trading points in their network
CREATE POLICY "trading_points_delete_policy" ON trading_points
    FOR DELETE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id())
    );

-- ===============================================
-- USERS TABLE POLICIES
-- ===============================================

-- Users can see users in their network, system admins see all
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        is_system_admin() OR 
        network_id = current_user_network_id() OR
        id = current_user_id() -- Users can always see themselves
    );

-- Network admins can create users in their network
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id())
    );

-- Network admins can update users in their network, users can update themselves
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id()) OR
        id = current_user_id()
    );

-- Only system admins can delete users
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE USING (is_system_admin());

-- ===============================================
-- ROLES TABLE POLICIES
-- ===============================================

-- Users can see system roles and roles in their network
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (
        is_system_admin() OR 
        is_system = true OR 
        network_id = current_user_network_id()
    );

-- Network admins can create roles in their network
CREATE POLICY "roles_insert_policy" ON roles
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id() AND is_system = false)
    );

-- Network admins can update non-system roles in their network
CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND network_id = current_user_network_id() AND is_system = false)
    );

-- Only system admins can delete roles (and only non-system ones)
CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (is_system_admin() AND is_system = false);

-- ===============================================
-- USER_ROLES TABLE POLICIES
-- ===============================================

-- Users can see role assignments in their network
CREATE POLICY "user_roles_select_policy" ON user_roles
    FOR SELECT USING (
        is_system_admin() OR 
        user_id IN (
            SELECT id FROM users WHERE network_id = current_user_network_id()
        )
    );

-- Network admins can assign roles to users in their network
CREATE POLICY "user_roles_insert_policy" ON user_roles
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND user_id IN (
            SELECT id FROM users WHERE network_id = current_user_network_id()
        ))
    );

-- Network admins can remove role assignments from users in their network
CREATE POLICY "user_roles_delete_policy" ON user_roles
    FOR DELETE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND user_id IN (
            SELECT id FROM users WHERE network_id = current_user_network_id()
        ))
    );

-- ===============================================
-- FUEL TYPES TABLE POLICIES
-- ===============================================

-- Fuel types are global - all authenticated users can see them
CREATE POLICY "fuel_types_select_policy" ON fuel_types
    FOR SELECT TO authenticated USING (true);

-- Only system admins can manage fuel types
CREATE POLICY "fuel_types_insert_policy" ON fuel_types
    FOR INSERT WITH CHECK (is_system_admin());

CREATE POLICY "fuel_types_update_policy" ON fuel_types
    FOR UPDATE USING (is_system_admin());

CREATE POLICY "fuel_types_delete_policy" ON fuel_types
    FOR DELETE USING (is_system_admin());

-- ===============================================
-- EQUIPMENT TEMPLATES TABLE POLICIES
-- ===============================================

-- Equipment templates are global - all authenticated users can see them
CREATE POLICY "equipment_templates_select_policy" ON equipment_templates
    FOR SELECT TO authenticated USING (true);

-- Only system admins can manage equipment templates
CREATE POLICY "equipment_templates_insert_policy" ON equipment_templates
    FOR INSERT WITH CHECK (is_system_admin());

CREATE POLICY "equipment_templates_update_policy" ON equipment_templates
    FOR UPDATE USING (is_system_admin());

CREATE POLICY "equipment_templates_delete_policy" ON equipment_templates
    FOR DELETE USING (is_system_admin());

-- ===============================================
-- EQUIPMENT TABLE POLICIES
-- ===============================================

-- Users can see equipment at trading points in their network
CREATE POLICY "equipment_select_policy" ON equipment
    FOR SELECT USING (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- Managers and above can create equipment in their network
CREATE POLICY "equipment_insert_policy" ON equipment
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        (current_user_role() IN ('manager', 'network_admin') AND trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        ))
    );

-- Managers and above can update equipment in their network
CREATE POLICY "equipment_update_policy" ON equipment
    FOR UPDATE USING (
        is_system_admin() OR 
        (current_user_role() IN ('manager', 'network_admin') AND trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        ))
    );

-- Network admins and above can delete equipment in their network
CREATE POLICY "equipment_delete_policy" ON equipment
    FOR DELETE USING (
        is_system_admin() OR 
        (is_network_admin_or_higher() AND trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        ))
    );

-- ===============================================
-- OPERATIONS TABLE POLICIES
-- ===============================================

-- Users can see operations at trading points in their network
CREATE POLICY "operations_select_policy" ON operations
    FOR SELECT USING (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- All authenticated users can create operations (operators, managers, etc.)
CREATE POLICY "operations_insert_policy" ON operations
    FOR INSERT WITH CHECK (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- Managers and above can update operations in their network
CREATE POLICY "operations_update_policy" ON operations
    FOR UPDATE USING (
        is_system_admin() OR 
        (current_user_role() IN ('manager', 'network_admin') AND trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        ))
    );

-- Managers and above can delete operations in their network
CREATE POLICY "operations_delete_policy" ON operations
    FOR DELETE USING (
        is_system_admin() OR 
        (current_user_role() IN ('manager', 'network_admin') AND trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        ))
    );

-- ===============================================
-- GENERIC POLICIES FOR RELATED TABLES
-- ===============================================

-- Apply network-based policies to all tables that have trading_point_id
-- (equipment_events, components, equipment_log, tanks, tank_events, fuel_stocks, fuel_measurement_history, price_history)

-- Equipment Events
CREATE POLICY "equipment_events_all_policy" ON equipment_events
    FOR ALL USING (
        is_system_admin() OR 
        equipment_id IN (
            SELECT id FROM equipment WHERE trading_point_id IN (
                SELECT id FROM trading_points WHERE network_id = current_user_network_id()
            )
        )
    );

-- Components
CREATE POLICY "components_all_policy" ON components
    FOR ALL USING (
        is_system_admin() OR 
        equipment_id IN (
            SELECT id FROM equipment WHERE trading_point_id IN (
                SELECT id FROM trading_points WHERE network_id = current_user_network_id()
            )
        )
    );

-- Equipment Log
CREATE POLICY "equipment_log_all_policy" ON equipment_log
    FOR ALL USING (
        is_system_admin() OR 
        equipment_id IN (
            SELECT id FROM equipment WHERE trading_point_id IN (
                SELECT id FROM trading_points WHERE network_id = current_user_network_id()
            )
        )
    );

-- Tanks
CREATE POLICY "tanks_all_policy" ON tanks
    FOR ALL USING (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- Tank Events
CREATE POLICY "tank_events_all_policy" ON tank_events
    FOR ALL USING (
        is_system_admin() OR 
        tank_id IN (
            SELECT id FROM tanks WHERE trading_point_id IN (
                SELECT id FROM trading_points WHERE network_id = current_user_network_id()
            )
        )
    );

-- Fuel Stocks
CREATE POLICY "fuel_stocks_all_policy" ON fuel_stocks
    FOR ALL USING (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- Fuel Measurement History
CREATE POLICY "fuel_measurement_history_all_policy" ON fuel_measurement_history
    FOR ALL USING (
        is_system_admin() OR 
        fuel_stock_id IN (
            SELECT id FROM fuel_stocks WHERE trading_point_id IN (
                SELECT id FROM trading_points WHERE network_id = current_user_network_id()
            )
        )
    );

-- Price History
CREATE POLICY "price_history_all_policy" ON price_history
    FOR ALL USING (
        is_system_admin() OR 
        trading_point_id IN (
            SELECT id FROM trading_points WHERE network_id = current_user_network_id()
        )
    );

-- ===============================================
-- GRANT PERMISSIONS TO authenticated ROLE
-- ===============================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for the helper functions
GRANT EXECUTE ON FUNCTION current_user_network_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_admin_or_higher() TO authenticated;

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON FUNCTION current_user_network_id() IS 'Get current user network_id from JWT claims';
COMMENT ON FUNCTION current_user_role() IS 'Get current user role from JWT claims';
COMMENT ON FUNCTION current_user_id() IS 'Get current user ID from JWT claims';
COMMENT ON FUNCTION is_system_admin() IS 'Check if current user is system admin';
COMMENT ON FUNCTION is_network_admin_or_higher() IS 'Check if current user is network admin or higher';

-- Log RLS setup completion
DO $$
BEGIN
    RAISE NOTICE 'Row Level Security policies have been successfully applied to all tables';
    RAISE NOTICE 'Multi-tenant isolation by network_id is now active';
    RAISE NOTICE 'System admins have global access, other users are restricted to their network';
END
$$;