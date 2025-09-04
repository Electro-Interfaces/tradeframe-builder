-- ===============================================
-- PRICES SCHEMA MIGRATION
-- Migration: 008_prices_schema.sql
-- Description: Creates tables for price management system
-- ===============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- UPDATE NOMENCLATURE TABLE
-- ===============================================

-- Add fuel_type_id column to nomenclature for proper linking
ALTER TABLE nomenclature 
ADD COLUMN IF NOT EXISTS fuel_type_id UUID REFERENCES fuel_types(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_nomenclature_fuel_type ON nomenclature(fuel_type_id);

-- Update existing nomenclature records to link with fuel_types based on internal_code
UPDATE nomenclature SET fuel_type_id = (
    SELECT ft.id 
    FROM fuel_types ft 
    WHERE ft.code = nomenclature.internal_code
) WHERE fuel_type_id IS NULL;

-- ===============================================
-- PRICE PACKAGES TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS price_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    trading_point_ids UUID[] NOT NULL DEFAULT '{}', -- Array of trading point IDs
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'archived', 'cancelled')),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network_id, code)
);

-- ===============================================
-- PRICES TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES price_packages(id) ON DELETE CASCADE,
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    nomenclature_id UUID REFERENCES nomenclature(id) ON DELETE SET NULL,
    
    -- Price information (in kopecks for precision)
    price_net INTEGER NOT NULL, -- Price without VAT in kopecks
    vat_rate DECIMAL(5,2) DEFAULT 20.00, -- VAT percentage
    price_gross INTEGER NOT NULL, -- Price with VAT in kopecks
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api', 'package', 'system')),
    currency VARCHAR(3) DEFAULT 'RUB',
    unit VARCHAR(10) DEFAULT 'L', -- Liter, Kg, etc.
    
    -- Validity period
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one active price per fuel type per trading point at any time
    CONSTRAINT prices_valid_period_check CHECK (valid_from <= COALESCE(valid_to, '2099-12-31'::timestamptz))
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Price Packages
CREATE INDEX IF NOT EXISTS idx_price_packages_network ON price_packages(network_id);
CREATE INDEX IF NOT EXISTS idx_price_packages_status ON price_packages(status);
CREATE INDEX IF NOT EXISTS idx_price_packages_valid_from ON price_packages(valid_from);
CREATE INDEX IF NOT EXISTS idx_price_packages_created_by ON price_packages(created_by);

-- Prices
CREATE INDEX IF NOT EXISTS idx_prices_trading_point ON prices(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_prices_fuel_type ON prices(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_prices_nomenclature ON prices(nomenclature_id);
CREATE INDEX IF NOT EXISTS idx_prices_package ON prices(package_id);
CREATE INDEX IF NOT EXISTS idx_prices_valid_from ON prices(valid_from);
CREATE INDEX IF NOT EXISTS idx_prices_valid_to ON prices(valid_to);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);
CREATE INDEX IF NOT EXISTS idx_prices_created_by ON prices(created_by);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prices_point_fuel_active ON prices(trading_point_id, fuel_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_prices_point_fuel_valid ON prices(trading_point_id, fuel_type_id, valid_from, valid_to);

-- ===============================================
-- TRIGGERS FOR UPDATED_AT
-- ===============================================

-- Price Packages trigger
CREATE TRIGGER IF NOT EXISTS update_price_packages_updated_at 
    BEFORE UPDATE ON price_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Prices trigger  
CREATE TRIGGER IF NOT EXISTS update_prices_updated_at 
    BEFORE UPDATE ON prices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- FUNCTIONS FOR PRICE MANAGEMENT
-- ===============================================

-- Function to get active price for a fuel type at trading point
CREATE OR REPLACE FUNCTION get_active_price(
    p_trading_point_id UUID,
    p_fuel_type_id UUID,
    p_effective_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    id UUID,
    price_net INTEGER,
    vat_rate DECIMAL,
    price_gross INTEGER,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.price_net,
        p.vat_rate,
        p.price_gross,
        p.valid_from,
        p.valid_to
    FROM prices p
    WHERE p.trading_point_id = p_trading_point_id
      AND p.fuel_type_id = p_fuel_type_id
      AND p.is_active = true
      AND p.valid_from <= p_effective_date
      AND (p.valid_to IS NULL OR p.valid_to >= p_effective_date)
    ORDER BY p.valid_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate gross price from net price
CREATE OR REPLACE FUNCTION calculate_gross_price(
    p_price_net INTEGER,
    p_vat_rate DECIMAL DEFAULT 20.00
)
RETURNS INTEGER AS $$
BEGIN
    RETURN ROUND(p_price_net * (1 + p_vat_rate / 100));
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on new tables
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Price Packages policies
CREATE POLICY "price_packages_network_isolation" ON price_packages
    USING (
        network_id IN (
            SELECT n.id FROM networks n 
            WHERE EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND (u.network_id = n.id OR u.role IN ('system_admin'))
            )
        )
    );

-- Prices policies
CREATE POLICY "prices_trading_point_access" ON prices
    USING (
        trading_point_id IN (
            SELECT tp.id FROM trading_points tp
            JOIN networks n ON n.id = tp.network_id
            WHERE EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND (
                    u.network_id = n.id 
                    OR u.role IN ('system_admin')
                    OR tp.id = ANY(
                        SELECT jsonb_array_elements_text(u.trading_point_ids)::uuid
                    )
                )
            )
        )
    );

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE price_packages IS 'Price packages for grouped price management';
COMMENT ON COLUMN price_packages.trading_point_ids IS 'Array of trading point IDs where this package applies';
COMMENT ON COLUMN price_packages.status IS 'Package status: draft, pending, approved, active, archived, cancelled';

COMMENT ON TABLE prices IS 'Individual fuel prices at trading points';
COMMENT ON COLUMN prices.price_net IS 'Price without VAT in kopecks (1 ruble = 100 kopecks)';
COMMENT ON COLUMN prices.price_gross IS 'Price with VAT in kopecks (1 ruble = 100 kopecks)';
COMMENT ON COLUMN prices.vat_rate IS 'VAT percentage (e.g., 20.00 for 20%)';
COMMENT ON COLUMN prices.source IS 'How this price was created: manual, import, api, package, system';

COMMENT ON FUNCTION get_active_price IS 'Returns the currently active price for a fuel type at a trading point';
COMMENT ON FUNCTION calculate_gross_price IS 'Calculates gross price from net price and VAT rate';

-- ===============================================
-- COMPLETION LOG
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 008_prices_schema.sql completed successfully';
    RAISE NOTICE 'Created tables: price_packages, prices';
    RAISE NOTICE 'Updated table: nomenclature (added fuel_type_id column)';
    RAISE NOTICE 'Created indexes, triggers, functions, and RLS policies';
    RAISE NOTICE 'Ready for price management functionality';
END $$;