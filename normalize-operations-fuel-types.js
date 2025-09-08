/**
 * Normalize operations table fuel_type from string to UUID
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

async function updateOperation(id, fuel_type_id) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/operations?id=eq.${id}`;
        
        const postData = JSON.stringify({ fuel_type_id });

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
        console.log('🔍 Getting fuel types and operations data...');
        
        const [fuelTypes, operations] = await Promise.all([
            getData('fuel_types'),
            getData('operations')
        ]);
        
        console.log(`📊 Found ${fuelTypes.length} fuel types and ${operations.length} operations`);
        
        // Create fuel type mapping
        const fuelTypeMap = {};
        fuelTypes.forEach(ft => {
            fuelTypeMap[ft.name] = ft.id;
            
            // Additional mappings for compatibility
            if (ft.name === 'ДТ Летнее') {
                fuelTypeMap['ДТ'] = ft.id;
            }
        });
        
        console.log('\n📋 Fuel type mapping:');
        Object.entries(fuelTypeMap).forEach(([name, id]) => {
            console.log(`  ${name} → ${id.substring(0, 8)}...`);
        });
        
        // Analyze operations
        const fuelTypeUsage = {};
        operations.forEach(op => {
            const fuelType = op.fuel_type;
            fuelTypeUsage[fuelType] = (fuelTypeUsage[fuelType] || 0) + 1;
        });
        
        console.log('\n📈 Current fuel type usage in operations:');
        Object.entries(fuelTypeUsage).forEach(([fuelType, count]) => {
            const mappedId = fuelTypeMap[fuelType];
            console.log(`  ${fuelType}: ${count} operations → ${mappedId ? 'MAPPED' : 'NOT MAPPED'}`);
        });
        
        const toUpdate = [];
        
        for (const operation of operations) {
            const fuelTypeName = operation.fuel_type;
            const fuelTypeId = fuelTypeMap[fuelTypeName];
            
            if (fuelTypeId && !operation.fuel_type_id) {
                toUpdate.push({
                    id: operation.id,
                    fuel_type: fuelTypeName,
                    fuel_type_id: fuelTypeId,
                    transaction_id: operation.transaction_id
                });
            }
        }
        
        console.log(`\n🎯 Found ${toUpdate.length} operations to update with fuel_type_id`);
        
        // Group updates by fuel type for batch processing
        const updateGroups = {};
        toUpdate.forEach(update => {
            if (!updateGroups[update.fuel_type]) {
                updateGroups[update.fuel_type] = [];
            }
            updateGroups[update.fuel_type].push(update);
        });
        
        for (const [fuelType, updates] of Object.entries(updateGroups)) {
            console.log(`\n🔄 Updating ${updates.length} operations with ${fuelType}...`);
            
            for (const update of updates) {
                try {
                    await updateOperation(update.id, update.fuel_type_id);
                    console.log(`✅ Updated ${update.transaction_id}`);
                } catch (error) {
                    console.log(`❌ Failed ${update.transaction_id}: ${error.message}`);
                }
                
                // Small delay between updates
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('\n🎉 Operations normalization completed!');
        console.log(`✅ Updated ${toUpdate.length} operations with fuel_type_id references`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();