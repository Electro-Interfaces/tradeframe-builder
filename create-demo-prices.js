/**
 * Create demo prices for all trading points and fuel types
 * Note: Since prices table doesn't exist in Supabase yet, we'll create sample data structure
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getData(table) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
        
        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const result = JSON.parse(data);
                        resolve(result);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// Current fuel prices in kopecks (without VAT)
const FUEL_PRICES = {
    'АИ-92': 4850,    // 48.50 рублей
    'АИ-95': 5320,    // 53.20 рублей  
    'АИ-98': 5620,    // 56.20 рублей
    'ДТ Летнее': 4950, // 49.50 рублей
    'ДТ Зимнее': 5050, // 50.50 рублей
    'ДТ Арктическое': 5150, // 51.50 рублей
    'Пропан': 2800,   // 28.00 рублей
    'Бутан': 3200     // 32.00 рублей
};

function calculateGrossPrice(netPrice, vatRate = 20) {
    return Math.round(netPrice * (1 + vatRate / 100));
}

function addRegionalVariation(basePrice, tradingPointId) {
    // Add small regional price variations
    const variations = {
        '9baf5375-9929-4774-8366-c0609b9f2a51': 1.02, // Центральная +2%
        '9be94f90-84d1-4557-b746-460e13485b65': 0.98, // Северная -2%
        'f2566905-c748-4240-ac31-47b626ab625d': 1.01, // Южная +1%
        'f7963207-2732-4fae-988e-c73eef7645ca': 0.97, // Промзона -3%
        '35f56ffd-826c-43b3-8f15-0f0e870f20cd': 1.03, // Окружная +3%
    };
    
    const variation = variations[tradingPointId] || 1.0;
    return Math.round(basePrice * variation);
}

async function main() {
    try {
        console.log('🔍 Getting trading points and fuel types...');
        
        const [tradingPoints, fuelTypes, users] = await Promise.all([
            getData('trading_points'),
            getData('fuel_types'),
            getData('users')
        ]);
        
        console.log(`📊 Found ${tradingPoints.length} trading points and ${fuelTypes.length} fuel types`);
        
        const defaultUserId = users.length > 0 ? users[0].id : '00000000-0000-0000-0000-000000000000';
        console.log(`👤 Using user ID: ${defaultUserId}`);
        
        const priceData = [];
        
        // Generate prices for each trading point and fuel type combination
        for (const tradingPoint of tradingPoints) {
            console.log(`\n🏪 ${tradingPoint.name} (${tradingPoint.id})`);
            
            for (const fuelType of fuelTypes) {
                const basePriceNet = FUEL_PRICES[fuelType.name];
                
                if (basePriceNet) {
                    const regionalPriceNet = addRegionalVariation(basePriceNet, tradingPoint.id);
                    const priceGross = calculateGrossPrice(regionalPriceNet, 20);
                    
                    const priceRecord = {
                        id: `price_${tradingPoint.external_id || tradingPoint.id.split('-')[0]}_${fuelType.code}`,
                        trading_point_id: tradingPoint.id,
                        trading_point_name: tradingPoint.name,
                        fuel_type_id: fuelType.id,
                        fuel_type_name: fuelType.name,
                        fuel_type_code: fuelType.code,
                        price_net: regionalPriceNet,
                        vat_rate: 20.00,
                        price_gross: priceGross,
                        price_net_rubles: (regionalPriceNet / 100).toFixed(2),
                        price_gross_rubles: (priceGross / 100).toFixed(2),
                        source: 'demo',
                        currency: 'RUB',
                        unit: 'L',
                        valid_from: new Date().toISOString(),
                        valid_to: null,
                        is_active: true,
                        created_by: defaultUserId,
                        reason: 'Demo prices generation',
                        metadata: {
                            generated_at: new Date().toISOString(),
                            base_price: basePriceNet,
                            regional_multiplier: regionalPriceNet / basePriceNet
                        }
                    };
                    
                    priceData.push(priceRecord);
                    
                    console.log(`  💰 ${fuelType.name} (${fuelType.code}): ${priceRecord.price_net_rubles} → ${priceRecord.price_gross_rubles} руб/л`);
                } else {
                    console.log(`  ⚠️  ${fuelType.name}: No base price defined`);
                }
            }
        }
        
        console.log(`\n📊 Generated ${priceData.length} price records`);
        
        // Save to JSON file for manual import
        const fs = await import('fs');
        const outputFile = 'demo-prices-data.json';
        
        fs.writeFileSync(outputFile, JSON.stringify(priceData, null, 2));
        console.log(`💾 Saved demo prices to: ${outputFile}`);
        
        // Generate SQL INSERT statements
        const sqlFile = 'demo-prices-insert.sql';
        let sqlContent = '-- Demo prices INSERT statements\\n-- Generated: ' + new Date().toISOString() + '\\n\\n';
        
        priceData.forEach(price => {
            sqlContent += `INSERT INTO prices (
    id, trading_point_id, fuel_type_id, price_net, vat_rate, price_gross,
    source, currency, unit, valid_from, is_active, created_by, reason, metadata
) VALUES (
    '${price.id}', '${price.trading_point_id}', '${price.fuel_type_id}',
    ${price.price_net}, ${price.vat_rate}, ${price.price_gross},
    '${price.source}', '${price.currency}', '${price.unit}',
    '${price.valid_from}', ${price.is_active}, '${price.created_by}',
    '${price.reason}', '${JSON.stringify(price.metadata).replace(/'/g, "''")}'
);\\n\\n`;
        });
        
        fs.writeFileSync(sqlFile, sqlContent);
        console.log(`📝 Saved SQL INSERT statements to: ${sqlFile}`);
        
        console.log('\\n🎉 Demo prices generation completed!');
        console.log(`✅ Created ${priceData.length} price records across ${tradingPoints.length} trading points`);
        console.log(`🔗 Price-Fuel-Trading Point chain is now complete!`);
        
        // Summary statistics
        const fuelTypeStats = {};
        priceData.forEach(price => {
            if (!fuelTypeStats[price.fuel_type_name]) {
                fuelTypeStats[price.fuel_type_name] = {
                    count: 0,
                    min_price: Infinity,
                    max_price: 0,
                    avg_price: 0
                };
            }
            const stats = fuelTypeStats[price.fuel_type_name];
            stats.count++;
            stats.min_price = Math.min(stats.min_price, price.price_gross);
            stats.max_price = Math.max(stats.max_price, price.price_gross);
        });
        
        console.log('\\n📈 Price Statistics by Fuel Type:');
        Object.entries(fuelTypeStats).forEach(([fuelType, stats]) => {
            const avgPrice = priceData
                .filter(p => p.fuel_type_name === fuelType)
                .reduce((sum, p) => sum + p.price_gross, 0) / stats.count;
            
            console.log(`  ${fuelType}:`);
            console.log(`    Count: ${stats.count} trading points`);
            console.log(`    Price range: ${(stats.min_price/100).toFixed(2)} - ${(stats.max_price/100).toFixed(2)} руб/л`);
            console.log(`    Average: ${(avgPrice/100).toFixed(2)} руб/л`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();