/**
 * Execute single SQL statements via Supabase REST API
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const statements = [
    "ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS fuel_type_id UUID REFERENCES fuel_types(id)",
    
    `CREATE TABLE IF NOT EXISTS prices (
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
    )`,
    
    `UPDATE nomenclature SET fuel_type_id = (
        SELECT ft.id FROM fuel_types ft WHERE ft.code = nomenclature.internal_code
    ) WHERE fuel_type_id IS NULL`,
    
    "CREATE INDEX IF NOT EXISTS idx_prices_trading_point ON prices(trading_point_id)",
    "CREATE INDEX IF NOT EXISTS idx_prices_fuel_type ON prices(fuel_type_id)",
    "CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active)",
    "CREATE INDEX IF NOT EXISTS idx_nomenclature_fuel_type ON nomenclature(fuel_type_id)"
];

async function executeRawSQL(sql) {
    return new Promise((resolve, reject) => {
        // Try direct SQL execution via PostgREST
        const requestUrl = `${SUPABASE_URL}/rest/v1/rpc/exec`;
        
        const postData = JSON.stringify({
            sql: sql
        });

        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Success');
                    resolve(true);
                } else {
                    console.log(`❌ Error ${res.statusCode}:`, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function main() {
    console.log('🚀 Executing SQL statements...\n');
    
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`📝 Step ${i+1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        try {
            await executeRawSQL(statement);
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
        } catch (error) {
            console.log(`❌ Error in step ${i+1}:`, error.message);
            if (!error.message.includes('already exists')) {
                console.log('⚠️ Continuing despite error...');
            }
        }
    }
    
    console.log('\n🎉 Migration steps completed!');
    console.log('🔍 Verify with: node tools/sql-direct.js tables');
}

main().catch(console.error);