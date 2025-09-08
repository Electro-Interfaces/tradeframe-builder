/**
 * Add fuel_type_id to equipment params based on fuel type mapping
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

async function updateEquipment(id, params) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment?id=eq.${id}`;
        
        const postData = JSON.stringify({ params });

        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'PATCH',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Prefer': 'return=minimal'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
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
    try {
        console.log('🔍 Getting fuel types and equipment data...');
        
        const [fuelTypes, equipment] = await Promise.all([
            getData('fuel_types'),
            getData('equipment')
        ]);
        
        console.log(`📊 Found ${fuelTypes.length} fuel types and ${equipment.length} equipment records`);
        
        // Create fuel type mapping
        const fuelTypeMap = {};
        fuelTypes.forEach(ft => {
            // Map by name
            fuelTypeMap[ft.name] = ft.id;
            
            // Additional mappings for compatibility
            if (ft.name === 'ДТ Летнее') {
                fuelTypeMap['ДТ'] = ft.id;
                fuelTypeMap['Дизель'] = ft.id;
            }
        });
        
        console.log('\n📋 Fuel type mapping:');
        Object.entries(fuelTypeMap).forEach(([name, id]) => {
            console.log(`  ${name} → ${id}`);
        });
        
        const toUpdate = [];
        
        for (const item of equipment) {
            const params = item.params;
            if (params && params['Тип топлива']) {
                const fuelTypeName = params['Тип топлива'];
                const fuelTypeId = fuelTypeMap[fuelTypeName];
                
                console.log(`\n📋 ${item.display_name}:`);
                console.log(`   Fuel Type: ${fuelTypeName}`);
                console.log(`   Fuel Type ID: ${fuelTypeId || 'NOT FOUND'}`);
                
                if (fuelTypeId && !params.fuel_type_id) {
                    toUpdate.push({
                        id: item.id,
                        display_name: item.display_name,
                        params: {
                            ...params,
                            fuel_type_id: fuelTypeId
                        }
                    });
                }
            }
        }
        
        console.log(`\n🎯 Found ${toUpdate.length} records to update with fuel_type_id`);
        
        for (const update of toUpdate) {
            console.log(`🔄 Updating ${update.display_name}...`);
            try {
                await updateEquipment(update.id, update.params);
                console.log('✅ Updated successfully');
            } catch (error) {
                console.log(`❌ Update failed: ${error.message}`);
            }
            
            // Small delay between updates
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('\n🎉 Fuel type ID assignment completed!');
        console.log(`✅ Updated ${toUpdate.length} equipment records with fuel_type_id references`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();