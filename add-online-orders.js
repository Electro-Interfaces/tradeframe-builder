/**
 * Add online orders as 10% of total sales volume
 * Create realistic online order operations with appropriate metadata
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

function generateOperationId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const pointNum = String(Math.floor(Math.random() * 6) + 1).padStart(2, '0');
    const seqNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ORD-${dateStr}-${pointNum}-${seqNum}`;
}

function generateTransactionId() {
    return `TXN-ONLINE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateOrderId() {
    return `ORDER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateRandomQuantity(min = 25, max = 100) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
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

function generateCustomerData() {
    const names = [
        'Алексей Петров', 'Мария Иванова', 'Дмитрий Сидоров', 'Елена Козлова',
        'Андрей Морозов', 'Ольга Федорова', 'Николай Волков', 'Светлана Орлова',
        'Игорь Лебедев', 'Татьяна Попова', 'Сергей Новиков', 'Анна Соколова'
    ];
    
    const phones = [
        '+7 (926) 123-45-67', '+7 (916) 234-56-78', '+7 (903) 345-67-89',
        '+7 (985) 456-78-90', '+7 (977) 567-89-01', '+7 (964) 678-90-12'
    ];
    
    return {
        name: getRandomElement(names),
        phone: getRandomElement(phones),
        customerId: `ONLINE-${Math.floor(Math.random() * 90000) + 10000}`
    };
}

async function addOnlineOrders() {
    try {
        console.log('🛒 Adding online orders as 10% of total volume...\n');
        
        // 1. Get current operations data
        const operations = await getData('operations');
        console.log(`📊 Current operations: ${operations.length}`);
        
        // 2. Calculate total volume by fuel type
        const fuelTypeStats = {};
        let totalVolume = 0;
        
        operations.forEach(op => {
            const fuelType = op.fuel_type;
            const quantity = parseFloat(op.quantity) || 0;
            
            if (!fuelTypeStats[fuelType]) {
                fuelTypeStats[fuelType] = { 
                    totalVolume: 0, 
                    avgPrice: 0, 
                    priceSum: 0, 
                    count: 0,
                    tradingPoints: new Set()
                };
            }
            
            fuelTypeStats[fuelType].totalVolume += quantity;
            fuelTypeStats[fuelType].priceSum += parseFloat(op.price) || 0;
            fuelTypeStats[fuelType].count++;
            fuelTypeStats[fuelType].tradingPoints.add(op.trading_point_id);
            totalVolume += quantity;
        });
        
        // Calculate average prices
        Object.keys(fuelTypeStats).forEach(fuelType => {
            const stats = fuelTypeStats[fuelType];
            stats.avgPrice = stats.priceSum / stats.count;
            stats.tradingPoints = Array.from(stats.tradingPoints);
        });
        
        console.log('⛽ CURRENT FUEL STATISTICS:');
        console.log('='.repeat(60));
        Object.entries(fuelTypeStats).forEach(([fuelType, stats]) => {
            console.log(`${fuelType}: ${stats.totalVolume.toFixed(1)} л (avg: ${stats.avgPrice.toFixed(2)} ₽/л)`);
        });
        console.log(`\nTotal volume: ${totalVolume.toFixed(1)} л`);
        
        // 3. Calculate 10% online orders target
        const onlineTargetVolume = totalVolume * 0.10;
        console.log(`\n🎯 Target online orders volume: ${onlineTargetVolume.toFixed(1)} л (10%)`);
        
        // 4. Distribute online orders by fuel type (proportional to existing sales)
        const onlineOrdersByFuelType = {};
        Object.entries(fuelTypeStats).forEach(([fuelType, stats]) => {
            const proportion = stats.totalVolume / totalVolume;
            const targetVolume = onlineTargetVolume * proportion;
            const avgOrderSize = generateRandomQuantity(30, 80); // Online orders tend to be larger
            const targetOrders = Math.max(1, Math.round(targetVolume / avgOrderSize));
            
            onlineOrdersByFuelType[fuelType] = {
                targetVolume,
                targetOrders,
                avgPrice: stats.avgPrice,
                tradingPoints: stats.tradingPoints
            };
        });
        
        console.log('\n🛒 ONLINE ORDERS DISTRIBUTION:');
        console.log('='.repeat(60));
        Object.entries(onlineOrdersByFuelType).forEach(([fuelType, data]) => {
            console.log(`${fuelType}: ${data.targetOrders} заказов (~${data.targetVolume.toFixed(1)} л)`);
        });
        
        // 5. Get trading points for realistic data
        const tradingPoints = await getData('trading_points');
        const tradingPointsMap = {};
        tradingPoints.forEach(tp => {
            tradingPointsMap[tp.external_id || tp.id] = tp.name;
        });
        
        // 6. Generate online orders
        const onlineOrders = [];
        const deliveryServices = ['Яндекс.Доставка', 'Delivery Club', 'Собственная служба'];
        const orderStatuses = ['completed'];
        
        for (const [fuelType, data] of Object.entries(onlineOrdersByFuelType)) {
            console.log(`\n🔧 Generating ${data.targetOrders} online orders for ${fuelType}...`);
            
            for (let i = 0; i < data.targetOrders; i++) {
                const customer = generateCustomerData();
                const quantity = generateRandomQuantity(30, 90); // Larger quantities for online
                const priceVariation = 0.95 + Math.random() * 0.1; // ±5% variation
                const price = parseFloat((data.avgPrice * priceVariation).toFixed(2));
                const totalCost = parseFloat((quantity * price).toFixed(2));
                
                const tradingPointId = getRandomElement(data.tradingPoints);
                const tradingPointName = tradingPointsMap[tradingPointId.replace('station_', '')] || `АЗС ${tradingPointId}`;
                
                // Random date in the last 20 days (online orders are more recent)
                const daysAgo = Math.floor(Math.random() * 20);
                const hoursAgo = Math.floor(Math.random() * 24);
                const orderTime = new Date();
                orderTime.setDate(orderTime.getDate() - daysAgo);
                orderTime.setHours(orderTime.getHours() - hoursAgo);
                
                const deliveryTime = new Date(orderTime);
                deliveryTime.setMinutes(deliveryTime.getMinutes() + Math.floor(Math.random() * 180) + 30); // 30-210 min delivery
                
                const isDelivery = Math.random() < 0.7; // 70% delivery, 30% pickup
                
                const onlineOrder = {
                    id: generateOperationId(),
                    operation_type: 'sale',
                    status: getRandomElement(orderStatuses),
                    start_time: orderTime.toISOString(),
                    end_time: deliveryTime.toISOString(),
                    duration: Math.floor((deliveryTime - orderTime) / (1000 * 60)), // minutes
                    trading_point_id: tradingPointId,
                    trading_point_name: tradingPointName,
                    device_id: isDelivery ? 'DELIVERY-TRUCK' : 'PICKUP-TERMINAL',
                    transaction_id: generateTransactionId(),
                    fuel_type: fuelType,
                    quantity: quantity,
                    price: price,
                    total_cost: totalCost,
                    payment_method: Math.random() < 0.7 ? 'bank_card' : Math.random() < 0.5 ? 'fuel_card' : 'cash',
                    details: `Онлайн заказ ${fuelType} - ${isDelivery ? 'доставка' : 'самовывоз'}`,
                    progress: 100,
                    operator_name: isDelivery ? 'Служба доставки' : 'Пункт выдачи',
                    customer_id: customer.customerId,
                    vehicle_number: generateVehicleNumber(),
                    metadata: {
                        order_type: 'online',
                        order_id: generateOrderId(),
                        customer_name: customer.name,
                        customer_phone: customer.phone,
                        delivery_type: isDelivery ? 'delivery' : 'pickup',
                        delivery_service: isDelivery ? getRandomElement(deliveryServices) : null,
                        delivery_address: isDelivery ? `г. Санкт-Петербург, ул. ${getRandomElement(['Ленина', 'Пушкина', 'Гагарина', 'Мира'])}, д. ${Math.floor(Math.random() * 100) + 1}` : null,
                        order_source: getRandomElement(['mobile_app', 'website', 'telegram_bot']),
                        discount_applied: Math.random() < 0.3 ? parseFloat((Math.random() * 10).toFixed(2)) : 0,
                        loyalty_points_used: Math.random() < 0.2 ? Math.floor(Math.random() * 500) : 0,
                        special_instructions: Math.random() < 0.3 ? 'Звонить за 15 минут до доставки' : null,
                        delivery_fee: isDelivery && quantity < 50 ? 200 : 0
                    },
                    created_at: orderTime.toISOString(),
                    updated_at: deliveryTime.toISOString()
                };
                
                onlineOrders.push(onlineOrder);
            }
        }
        
        console.log(`\n📝 Generated ${onlineOrders.length} online orders`);
        
        // 7. Insert online orders in batches
        if (onlineOrders.length > 0) {
            console.log(`\n💾 Inserting ${onlineOrders.length} online orders...`);
            const batchSize = 30;
            
            for (let i = 0; i < onlineOrders.length; i += batchSize) {
                const batch = onlineOrders.slice(i, i + batchSize);
                await insertData('operations', batch);
                console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(onlineOrders.length / batchSize)} (${batch.length} orders)`);
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
        
        // 8. Final verification
        const finalOperations = await getData('operations');
        const finalStats = { regular: {}, online: {} };
        let totalRegular = 0, totalOnline = 0;
        let costRegular = 0, costOnline = 0;
        
        finalOperations.forEach(op => {
            const fuelType = op.fuel_type;
            const quantity = parseFloat(op.quantity) || 0;
            const cost = parseFloat(op.total_cost) || 0;
            const isOnline = op.metadata && op.metadata.order_type === 'online';
            
            const category = isOnline ? 'online' : 'regular';
            
            if (!finalStats[category][fuelType]) {
                finalStats[category][fuelType] = { count: 0, volume: 0, cost: 0 };
            }
            
            finalStats[category][fuelType].count++;
            finalStats[category][fuelType].volume += quantity;
            finalStats[category][fuelType].cost += cost;
            
            if (isOnline) {
                totalOnline += quantity;
                costOnline += cost;
            } else {
                totalRegular += quantity;
                costRegular += cost;
            }
        });
        
        console.log('\n' + '='.repeat(70));
        console.log('🎉 FINAL OPERATIONS BREAKDOWN:');
        console.log('='.repeat(70));
        
        const grandTotal = totalRegular + totalOnline;
        const onlinePercentage = (totalOnline / grandTotal * 100).toFixed(1);
        
        console.log(`📊 REGULAR SALES: ${finalOperations.filter(op => !(op.metadata && op.metadata.order_type === 'online')).length} operations`);
        console.log(`   Volume: ${totalRegular.toFixed(1)} л (${(100 - onlinePercentage)}%)`);
        console.log(`   Revenue: ${costRegular.toLocaleString('ru-RU')} ₽`);
        
        console.log(`\n🛒 ONLINE ORDERS: ${finalOperations.filter(op => op.metadata && op.metadata.order_type === 'online').length} orders`);
        console.log(`   Volume: ${totalOnline.toFixed(1)} л (${onlinePercentage}%)`);
        console.log(`   Revenue: ${costOnline.toLocaleString('ru-RU')} ₽`);
        
        console.log(`\n📈 TOTAL: ${finalOperations.length} operations`);
        console.log(`   Volume: ${grandTotal.toFixed(1)} л`);
        console.log(`   Revenue: ${(costRegular + costOnline).toLocaleString('ru-RU')} ₽`);
        
        console.log('\n🔍 ONLINE ORDERS BY FUEL TYPE:');
        Object.entries(finalStats.online).forEach(([fuelType, stats]) => {
            const percentage = (stats.volume / totalOnline * 100).toFixed(1);
            console.log(`   ${fuelType}: ${stats.count} заказов, ${stats.volume.toFixed(1)} л (${percentage}%)`);
        });
        
        console.log('\n✅ Online orders successfully added!');
        console.log(`🎯 Target achieved: ${onlinePercentage}% of total volume through online orders`);
        
    } catch (error) {
        console.error('❌ Error adding online orders:', error.message);
    }
}

addOnlineOrders();