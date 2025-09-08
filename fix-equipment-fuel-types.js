/**
 * Fix equipment fuel types standardization
 * Replace "Дизель" with "ДТ" in equipment params
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getEquipment() {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment?select=*`;
        
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
        console.log('🔍 Getting equipment data...');
        const equipment = await getEquipment();
        
        console.log(`📊 Found ${equipment.length} equipment records`);
        
        const toUpdate = [];
        
        for (const item of equipment) {
            const params = item.params;
            if (params && params['Тип топлива']) {
                const fuelType = params['Тип топлива'];
                console.log(`📋 ${item.display_name}: ${fuelType}`);
                
                if (fuelType === 'Дизель') {
                    console.log(`🔄 Need to update: ${item.id}`);
                    toUpdate.push({
                        id: item.id,
                        params: {
                            ...params,
                            'Тип топлива': 'ДТ'
                        }
                    });
                }
            }
        }
        
        console.log(`\n🎯 Found ${toUpdate.length} records to update`);
        
        for (const update of toUpdate) {
            console.log(`🔄 Updating ${update.id}...`);
            try {
                await updateEquipment(update.id, update.params);
                console.log('✅ Updated successfully');
            } catch (error) {
                console.log(`❌ Update failed: ${error.message}`);
            }
            
            // Small delay between updates
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('\n🎉 Fuel type standardization completed!');
        console.log(`✅ Updated ${toUpdate.length} equipment records`);
        console.log('📝 Changed "Дизель" → "ДТ"');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();