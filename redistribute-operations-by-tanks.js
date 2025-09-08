/**
 * Redistribute operations to match all fuel types available in tank equipment
 * Remove unsupported fuel types and ensure all tank fuel types have operations
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

async function deleteData(table, filters) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
        
        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'DELETE',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
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

        req.end();
    });
}

async function insertData(table, data) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${table}`;
        
        const postData = JSON.stringify(data);

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

// Fuel pricing (rubles per liter, without VAT)
const FUEL_PRICES = {
    'АИ-92': 48.50,
    'АИ-95': 53.20,
    'АИ-98': 56.20,
    'ДТ': 49.50,
    'Дизель': 49.50,
    'Дизель зимний': 50.50
};

function generateTransactionId() {
    return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateOperationId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const pointNum = String(Math.floor(Math.random() * 6) + 1).padStart(2, '0');
    const seqNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `TXN-${dateStr}-${pointNum}-${seqNum}`;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateRandomQuantity(min = 15, max = 80) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

async function redistributeOperations() {
    try {
        console.log('🔄 Redistributing operations to match tank fuel types...\n');
        
        // 1. Get equipment (tanks) and their fuel types
        const equipment = await getData('equipment');
        const tankFuelTypes = {};
        let totalTanks = 0;
        
        equipment.forEach(eq => {
            if (eq.params && eq.params['Тип топлива']) {
                const fuelType = eq.params['Тип топлива'];
                const tradingPoint = eq.params['Торговая точка'] || eq.trading_point_id;
                
                if (!tankFuelTypes[fuelType]) {
                    tankFuelTypes[fuelType] = {
                        count: 0,
                        tradingPoints: [],
                        capacity: 0
                    };
                }
                tankFuelTypes[fuelType].count++;
                tankFuelTypes[fuelType].tradingPoints.push(tradingPoint);
                tankFuelTypes[fuelType].capacity += eq.params['Емкость (л)'] || 50000;
                totalTanks++;
            }
        });
        
        console.log('🛢️  FUEL TYPES IN TANK EQUIPMENT:');
        console.log('='.repeat(60));
        Object.entries(tankFuelTypes).forEach(([fuelType, data]) => {
            console.log(`${fuelType}: ${data.count} резервуаров, ${Math.round(data.capacity / 1000)}К л емкость`);
        });
        
        // 2. Get current operations
        const operations = await getData('operations');
        console.log(`\n📊 Current operations: ${operations.length}`);
        
        // 3. Get trading points for realistic data
        const tradingPoints = await getData('trading_points');
        const tradingPointsMap = {};
        tradingPoints.forEach(tp => {
            tradingPointsMap[tp.external_id || tp.id] = tp.name;
        });
        
        // 4. Delete unsupported operations (that don't match tank fuel types)
        const supportedFuelTypes = Object.keys(tankFuelTypes);
        const unsupportedOperations = operations.filter(op => 
            !supportedFuelTypes.includes(op.fuel_type)
        );
        
        if (unsupportedOperations.length > 0) {
            console.log(`\n🗑️  Removing ${unsupportedOperations.length} operations with unsupported fuel types...`);
            for (const op of unsupportedOperations) {
                await deleteData('operations', `id=eq.${op.id}`);
                console.log(`   Removed: ${op.fuel_type} operation ${op.id}`);
            }
        }
        
        // 5. Calculate target operations per fuel type based on tank capacity
        const totalCapacity = Object.values(tankFuelTypes).reduce((sum, data) => sum + data.capacity, 0);
        const targetTotalOperations = 300; // Target number of operations
        const operationsPerFuelType = {};
        
        Object.entries(tankFuelTypes).forEach(([fuelType, data]) => {
            const capacityRatio = data.capacity / totalCapacity;
            const minOperations = Math.max(20, data.count * 8); // At least 20 ops per fuel type, 8 per tank
            const targetOperations = Math.max(minOperations, Math.round(targetTotalOperations * capacityRatio));
            operationsPerFuelType[fuelType] = targetOperations;
        });
        
        console.log('\n🎯 TARGET OPERATIONS DISTRIBUTION:');
        console.log('='.repeat(60));
        Object.entries(operationsPerFuelType).forEach(([fuelType, target]) => {
            const current = operations.filter(op => op.fuel_type === fuelType && supportedFuelTypes.includes(op.fuel_type)).length;
            console.log(`${fuelType}: ${current} → ${target} операций (${target - current > 0 ? '+' + (target - current) : target - current})`);
        });
        
        // 6. Generate new operations for each fuel type
        const newOperations = [];
        const operators = ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Козлов К.К.', 'Морозов М.М.', 'Федоров Ф.Ф.'];
        const paymentMethods = ['cash', 'bank_card', 'fuel_card'];
        
        for (const [fuelType, targetCount] of Object.entries(operationsPerFuelType)) {
            const currentCount = operations.filter(op => op.fuel_type === fuelType && supportedFuelTypes.includes(op.fuel_type)).length;
            const needToGenerate = Math.max(0, targetCount - currentCount);
            
            console.log(`\n🔧 Generating ${needToGenerate} operations for ${fuelType}...`);
            
            const basePrice = FUEL_PRICES[fuelType] || 50.00;
            const fuelData = tankFuelTypes[fuelType];
            
            for (let i = 0; i < needToGenerate; i++) {
                const quantity = generateRandomQuantity(20, 75);
                const priceVariation = 0.95 + Math.random() * 0.1; // ±5% price variation
                const price = parseFloat((basePrice * priceVariation).toFixed(2));
                const totalCost = parseFloat((quantity * price).toFixed(2));
                
                const tradingPointId = getRandomElement(fuelData.tradingPoints);
                const tradingPointName = tradingPointsMap[tradingPointId] || `АЗС ${tradingPointId}`;
                
                // Random date in the last 30 days
                const daysAgo = Math.floor(Math.random() * 30);
                const hoursAgo = Math.floor(Math.random() * 24);
                const startTime = new Date();
                startTime.setDate(startTime.getDate() - daysAgo);
                startTime.setHours(startTime.getHours() - hoursAgo);
                
                const endTime = new Date(startTime);
                endTime.setMinutes(endTime.getMinutes() + Math.floor(Math.random() * 10) + 2);
                
                const operation = {
                    id: generateOperationId(),
                    operation_type: 'sale',
                    status: 'completed',
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    duration: Math.floor((endTime - startTime) / (1000 * 60)), // minutes
                    trading_point_id: `station_${tradingPointId}`,
                    trading_point_name: tradingPointName,
                    device_id: `PUMP-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
                    transaction_id: generateTransactionId(),
                    fuel_type: fuelType,
                    quantity: quantity,
                    price: price,
                    total_cost: totalCost,
                    payment_method: getRandomElement(paymentMethods),
                    details: `Продажа топлива ${fuelType}`,
                    progress: 100,
                    operator_name: getRandomElement(operators),
                    customer_id: `CUST-${Math.floor(Math.random() * 90000) + 10000}`,
                    vehicle_number: generateVehicleNumber(),
                    metadata: {},
                    created_at: startTime.toISOString(),
                    updated_at: endTime.toISOString()
                };
                
                newOperations.push(operation);
            }
        }
        
        // 7. Insert new operations in batches
        if (newOperations.length > 0) {
            console.log(`\n📝 Inserting ${newOperations.length} new operations...`);
            const batchSize = 50;
            
            for (let i = 0; i < newOperations.length; i += batchSize) {
                const batch = newOperations.slice(i, i + batchSize);
                await insertData('operations', batch);
                console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newOperations.length / batchSize)} (${batch.length} operations)`);
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // 8. Final verification
        const finalOperations = await getData('operations');
        const finalStats = {};
        let finalTotal = 0;
        let finalCost = 0;
        
        finalOperations.forEach(op => {
            const fuelType = op.fuel_type;
            if (!finalStats[fuelType]) {
                finalStats[fuelType] = { count: 0, volume: 0, cost: 0 };
            }
            finalStats[fuelType].count++;
            finalStats[fuelType].volume += parseFloat(op.quantity) || 0;
            finalStats[fuelType].cost += parseFloat(op.total_cost) || 0;
            finalTotal += parseFloat(op.quantity) || 0;
            finalCost += parseFloat(op.total_cost) || 0;
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 FINAL OPERATIONS DISTRIBUTION:');
        console.log('='.repeat(60));
        
        Object.entries(finalStats).forEach(([fuelType, stats]) => {
            const percentage = (stats.volume / finalTotal * 100).toFixed(1);
            const avgPrice = (stats.cost / stats.volume).toFixed(2);
            console.log(`${fuelType}:`);
            console.log(`   ${stats.count} операций | ${stats.volume.toFixed(1)} л (${percentage}%) | ₽${avgPrice}/л`);
        });
        
        console.log('\n📊 OVERALL STATISTICS:');
        console.log(`Total operations: ${finalOperations.length}`);
        console.log(`Total volume: ${finalTotal.toFixed(1)} л`);
        console.log(`Total revenue: ${finalCost.toLocaleString('ru-RU')} ₽`);
        console.log(`Average price: ${(finalCost / finalTotal).toFixed(2)} ₽/л`);
        console.log(`Fuel types with operations: ${Object.keys(finalStats).length}/${Object.keys(tankFuelTypes).length}`);
        
        console.log('\n✅ Operations redistribution completed!');
        console.log('🔗 All tank fuel types now have corresponding sales operations');
        
    } catch (error) {
        console.error('❌ Error redistributing operations:', error.message);
    }
}

function generateVehicleNumber() {
    const letters = 'АВЕКМНОРСТУХ';
    const regions = ['77', '99', '178', '197', '199', '777'];
    
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const numbers = String(Math.floor(Math.random() * 900) + 100);
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const region = getRandomElement(regions);
    
    return `${letter1}${numbers}${letter2}${letter3}${region}`;
}

redistributeOperations();