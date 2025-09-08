/**
 * Simple migration to create prices table using existing SQL tool
 */

import { readFileSync } from 'fs';

// Key SQL statements from the migration
const createStatements = [
    `-- Add fuel_type_id to nomenclature
    ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS fuel_type_id UUID REFERENCES fuel_types(id);`,
    
    `-- Create prices table
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
    );`,
    
    `-- Create price_packages table
    CREATE TABLE IF NOT EXISTS price_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        trading_point_ids UUID[] NOT NULL DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        created_by UUID NOT NULL REFERENCES users(id),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(network_id, code)
    );`,
    
    `-- Update nomenclature fuel_type_id links
    UPDATE nomenclature SET fuel_type_id = (
        SELECT ft.id FROM fuel_types ft WHERE ft.code = nomenclature.internal_code
    ) WHERE fuel_type_id IS NULL;`,
    
    `-- Create indexes
    CREATE INDEX IF NOT EXISTS idx_prices_trading_point ON prices(trading_point_id);`,
    `CREATE INDEX IF NOT EXISTS idx_prices_fuel_type ON prices(fuel_type_id);`,
    `CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);`,
    `CREATE INDEX IF NOT EXISTS idx_nomenclature_fuel_type ON nomenclature(fuel_type_id);`
];

console.log('🚀 Simple Prices Migration');
console.log('==========================');

for (let i = 0; i < createStatements.length; i++) {
    const statement = createStatements[i];
    console.log(`\n📝 Step ${i+1}/${createStatements.length}:`);
    console.log(statement.trim().split('\n')[0].replace('--', '').trim());
    
    try {
        // This will be executed manually by copying to tools/sql-direct.js
        console.log('✅ Ready for execution');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

console.log('\n🎯 Next Steps:');
console.log('1. Execute each SQL statement via node tools/sql-direct.js');
console.log('2. Verify tables created successfully');
console.log('3. Continue with data standardization');