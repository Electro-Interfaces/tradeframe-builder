/**
 * Test script to check overview page with real demo data
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getData(table, filters = '') {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*${filters}`;
        
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

async function testOverviewData() {
    try {
        console.log('🔍 Testing Overview Page Data Readiness...\n');
        
        // 1. Check networks
        const networks = await getData('networks');
        console.log(`📡 Networks: ${networks.length} found`);
        networks.forEach(network => {
            console.log(`  - ${network.name} (${network.id})`);
        });
        
        // 2. Check trading points
        const tradingPoints = await getData('trading_points');
        console.log(`\n🏪 Trading Points: ${tradingPoints.length} found`);
        const demoNetwork = networks.find(n => n.name.includes('Демо') || n.name.includes('Demo'));
        const demoTradingPoints = tradingPoints.filter(tp => 
            demoNetwork ? tp.network_id === demoNetwork.id : true
        );
        
        demoTradingPoints.slice(0, 5).forEach(tp => {
            console.log(`  - ${tp.name} (${tp.external_id || tp.id.substring(0, 8)})`);
        });
        
        // 3. Check equipment/tanks
        const equipment = await getData('equipment');
        console.log(`\n🛢️  Equipment/Tanks: ${equipment.length} found`);
        const demoEquipment = equipment.filter(eq => 
            demoTradingPoints.some(tp => tp.id === eq.trading_point_id)
        );
        
        // Count by fuel type
        const fuelTypeCounts = {};
        let totalFuelVolume = 0;
        
        demoEquipment.forEach(eq => {
            if (eq.params && eq.params['Тип топлива']) {
                const fuelType = eq.params['Тип топлива'];
                fuelTypeCounts[fuelType] = (fuelTypeCounts[fuelType] || 0) + 1;
                
                if (eq.params['Текущий уровень (л)']) {
                    totalFuelVolume += eq.params['Текущий уровень (л)'];
                }
            }
        });
        
        console.log(`  Fuel Types Distribution:`);
        Object.entries(fuelTypeCounts).forEach(([type, count]) => {
            console.log(`    ${type}: ${count} tanks`);
        });
        console.log(`  Total Fuel Volume: ${totalFuelVolume.toLocaleString()} L`);
        
        // 4. Check users
        const users = await getData('users');
        console.log(`\n👥 Users: ${users.length} found`);
        
        // 5. Check fuel types
        const fuelTypes = await getData('fuel_types');
        console.log(`\n⛽ Fuel Types: ${fuelTypes.length} found`);
        fuelTypes.forEach(ft => {
            console.log(`  - ${ft.name} (${ft.code})`);
        });
        
        // 6. Check nomenclature
        const nomenclature = await getData('nomenclature');
        console.log(`\n📋 Nomenclature: ${nomenclature.length} found`);
        nomenclature.forEach(nom => {
            console.log(`  - ${nom.name} (${nom.internal_code})`);
        });
        
        // 7. Check operations
        const operations = await getData('operations', '&limit=10');
        console.log(`\n💳 Operations: ${operations.length} found`);
        
        // Summary for overview page
        console.log('\n' + '='.repeat(50));
        console.log('📊 OVERVIEW PAGE DATA SUMMARY');
        console.log('='.repeat(50));
        console.log(`Trading Points: ${demoTradingPoints.length}`);
        console.log(`Tanks/Equipment: ${demoEquipment.length}`);
        console.log(`Users: ${users.length}`);
        console.log(`Total Fuel Volume: ${Math.round(totalFuelVolume).toLocaleString()} L`);
        console.log(`Operations: ${operations.length} (recent)`);
        
        // Check for missing data
        console.log('\n⚠️  MISSING DATA CHECK:');
        if (demoTradingPoints.length === 0) {
            console.log('❌ No trading points found for demo network');
        }
        if (demoEquipment.length === 0) {
            console.log('❌ No equipment/tanks found');
        }
        if (operations.length === 0) {
            console.log('⚠️  No operations data (this is expected)');
        }
        if (totalFuelVolume === 0) {
            console.log('❌ No fuel volume data in tanks');
        }
        
        console.log('\n✅ Overview page should display real demo data!');
        console.log('🌐 Visit: http://localhost:3003');
        
    } catch (error) {
        console.error('❌ Error testing overview data:', error.message);
    }
}

testOverviewData();