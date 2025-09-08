/**
 * Analyze fuel types in operations and calculate volumes
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

async function analyzeOperationsFuelTypes() {
    try {
        console.log('🔍 Analyzing operations fuel types and volumes...\n');
        
        // Get all operations
        const operations = await getData('operations');
        console.log(`📊 Total operations found: ${operations.length}\n`);
        
        if (operations.length === 0) {
            console.log('❌ No operations data found');
            return;
        }
        
        // Analyze fuel types and volumes
        const fuelTypeStats = {};
        let totalVolume = 0;
        let totalCost = 0;
        
        operations.forEach(op => {
            const fuelType = op.fuel_type;
            const quantity = parseFloat(op.quantity) || 0;
            const cost = parseFloat(op.total_cost) || 0;
            const price = parseFloat(op.price) || 0;
            
            if (!fuelTypeStats[fuelType]) {
                fuelTypeStats[fuelType] = {
                    count: 0,
                    totalVolume: 0,
                    totalCost: 0,
                    avgPrice: 0,
                    minPrice: Infinity,
                    maxPrice: 0,
                    transactions: []
                };
            }
            
            const stats = fuelTypeStats[fuelType];
            stats.count++;
            stats.totalVolume += quantity;
            stats.totalCost += cost;
            stats.minPrice = Math.min(stats.minPrice, price);
            stats.maxPrice = Math.max(stats.maxPrice, price);
            stats.transactions.push({
                id: op.transaction_id,
                quantity,
                price,
                cost,
                trading_point: op.trading_point_name,
                date: op.start_time
            });
            
            totalVolume += quantity;
            totalCost += cost;
        });
        
        // Calculate average prices
        Object.keys(fuelTypeStats).forEach(fuelType => {
            const stats = fuelTypeStats[fuelType];
            stats.avgPrice = stats.totalCost / stats.totalVolume;
        });
        
        console.log('⛽ FUEL TYPES IN OPERATIONS:');
        console.log('=' .repeat(50));
        
        // Sort by total volume
        const sortedFuelTypes = Object.entries(fuelTypeStats)
            .sort(([,a], [,b]) => b.totalVolume - a.totalVolume);
            
        sortedFuelTypes.forEach(([fuelType, stats]) => {
            console.log(`\n🔹 ${fuelType}:`);
            console.log(`   Операций: ${stats.count}`);
            console.log(`   Общий объем: ${stats.totalVolume.toFixed(2)} л`);
            console.log(`   Общая стоимость: ${stats.totalCost.toLocaleString('ru-RU')} ₽`);
            console.log(`   Средняя цена: ${stats.avgPrice.toFixed(2)} ₽/л`);
            console.log(`   Диапазон цен: ${stats.minPrice.toFixed(2)} - ${stats.maxPrice.toFixed(2)} ₽/л`);
            
            // Show recent transactions
            const recentTxs = stats.transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);
                
            console.log(`   Последние операции:`);
            recentTxs.forEach(tx => {
                console.log(`     - ${tx.quantity.toFixed(1)}л × ${tx.price.toFixed(2)}₽ = ${tx.cost.toFixed(2)}₽ (${tx.trading_point})`);
            });
        });
        
        console.log('\n' + '='.repeat(50));
        console.log('📈 ИТОГОВАЯ СТАТИСТИКА:');
        console.log('='.repeat(50));
        console.log(`Общий объем всех операций: ${totalVolume.toFixed(2)} л`);
        console.log(`Общая стоимость: ${totalCost.toLocaleString('ru-RU')} ₽`);
        console.log(`Средняя цена по всем видам: ${(totalCost / totalVolume).toFixed(2)} ₽/л`);
        console.log(`Видов топлива: ${Object.keys(fuelTypeStats).length}`);
        console.log(`Всего транзакций: ${operations.length}`);
        
        console.log('\n📋 ВИДЫ ТОПЛИВА ПО ОБЪЕМУ:');
        sortedFuelTypes.forEach(([fuelType, stats], index) => {
            const percentage = (stats.totalVolume / totalVolume * 100).toFixed(1);
            console.log(`${index + 1}. ${fuelType}: ${stats.totalVolume.toFixed(1)} л (${percentage}%)`);
        });
        
        // Compare with equipment fuel types
        const equipment = await getData('equipment');
        const equipmentFuelTypes = {};
        
        equipment.forEach(eq => {
            if (eq.params && eq.params['Тип топлива']) {
                const fuelType = eq.params['Тип топлива'];
                equipmentFuelTypes[fuelType] = (equipmentFuelTypes[fuelType] || 0) + 1;
            }
        });
        
        console.log('\n🔗 СРАВНЕНИЕ С ОБОРУДОВАНИЕМ:');
        console.log('='.repeat(50));
        console.log('В операциях       | В оборудовании');
        console.log('-'.repeat(50));
        
        const allFuelTypes = new Set([
            ...Object.keys(fuelTypeStats),
            ...Object.keys(equipmentFuelTypes)
        ]);
        
        allFuelTypes.forEach(fuelType => {
            const inOperations = fuelTypeStats[fuelType] ? '✅' : '❌';
            const inEquipment = equipmentFuelTypes[fuelType] ? '✅' : '❌';
            const opVolume = fuelTypeStats[fuelType]?.totalVolume.toFixed(1) || '0';
            const eqCount = equipmentFuelTypes[fuelType] || 0;
            
            console.log(`${fuelType.padEnd(15)} | ${inOperations} ${opVolume}л | ${inEquipment} ${eqCount} резервуаров`);
        });
        
        console.log('\n✅ Analysis completed!');
        
    } catch (error) {
        console.error('❌ Error analyzing operations:', error.message);
    }
}

analyzeOperationsFuelTypes();