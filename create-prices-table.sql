-- Manual SQL execution for prices tables creation
-- Execute these statements one by one

-- Step 1: Add fuel_type_id to nomenclature
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS fuel_type_id UUID REFERENCES fuel_types(id);

-- Step 2: Create prices table
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    nomenclature_id UUID REFERENCES nomenclature(id) ON DELETE SET NULL,
    price_net INTEGER NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    price_gross INTEGER NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    currency VARCHAR(3) DEFAULT 'RUB',
    unit VARCHAR(10) DEFAULT 'L',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Update nomenclature fuel_type_id links
UPDATE nomenclature SET fuel_type_id = (
    SELECT ft.id FROM fuel_types ft WHERE ft.code = nomenclature.internal_code
) WHERE fuel_type_id IS NULL;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_prices_trading_point ON prices(trading_point_id);
CREATE INDEX IF NOT EXISTS idx_prices_fuel_type ON prices(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);
CREATE INDEX IF NOT EXISTS idx_nomenclature_fuel_type ON nomenclature(fuel_type_id);