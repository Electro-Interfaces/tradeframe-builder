/**
 * Analyze online orders specifically
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXVreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

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

async function analyzeOnlineOrders() {
    try {
        console.log('🛒 Analyzing online orders in detail...\n');
        
        const operations = await getData('operations');
        console.log(`📊 Total operations: ${operations.length}`);
        
        // Separate online orders from regular sales
        const onlineOrders = operations.filter(op => 
            op.metadata && op.metadata.order_type === 'online'
        );
        const regularSales = operations.filter(op => 
            !(op.metadata && op.metadata.order_type === 'online')
        );
        
        console.log(`🛒 Online orders: ${onlineOrders.length}`);
        console.log(`📊 Regular sales: ${regularSales.length}`);
        
        if (onlineOrders.length === 0) {
            console.log('❌ No online orders found!');
            return;
        }
        
        // Analyze online orders
        let totalOnlineVolume = 0;
        let totalOnlineCost = 0;
        const onlineFuelStats = {};
        const deliveryTypes = {};
        const orderSources = {};
        
        onlineOrders.forEach(order => {
            const volume = parseFloat(order.quantity) || 0;
            const cost = parseFloat(order.total_cost) || 0;
            const fuelType = order.fuel_type;
            
            totalOnlineVolume += volume;
            totalOnlineCost += cost;
            
            // Fuel type stats
            if (!onlineFuelStats[fuelType]) {
                onlineFuelStats[fuelType] = {
                    count: 0,
                    volume: 0,
                    cost: 0,
                    avgPrice: 0
                };
            }
            onlineFuelStats[fuelType].count++;
            onlineFuelStats[fuelType].volume += volume;
            onlineFuelStats[fuelType].cost += cost;
            
            // Delivery analysis
            if (order.metadata) {
                const deliveryType = order.metadata.delivery_type || 'unknown';
                deliveryTypes[deliveryType] = (deliveryTypes[deliveryType] || 0) + 1;
                
                const source = order.metadata.order_source || 'unknown';
                orderSources[source] = (orderSources[source] || 0) + 1;
            }
        });
        
        // Calculate averages
        Object.values(onlineFuelStats).forEach(stats => {
            stats.avgPrice = stats.cost / stats.volume;
        });
        
        // Calculate regular sales stats
        let totalRegularVolume = 0;
        regularSales.forEach(sale => {
            totalRegularVolume += parseFloat(sale.quantity) || 0;
        });
        
        const totalVolume = totalOnlineVolume + totalRegularVolume;
        const onlinePercentage = (totalOnlineVolume / totalVolume * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('🛒 ONLINE ORDERS DETAILED ANALYSIS');
        console.log('='.repeat(60));
        
        console.log(`📈 Volume: ${totalOnlineVolume.toFixed(1)} л (${onlinePercentage}% of total)`);
        console.log(`💰 Revenue: ${totalOnlineCost.toLocaleString('ru-RU')} ₽`);
        console.log(`💵 Average price: ${(totalOnlineCost / totalOnlineVolume).toFixed(2)} ₽/л`);
        
        console.log('\n🔍 ONLINE ORDERS BY FUEL TYPE:');
        Object.entries(onlineFuelStats)
            .sort(([,a], [,b]) => b.volume - a.volume)
            .forEach(([fuelType, stats]) => {
                const percentage = (stats.volume / totalOnlineVolume * 100).toFixed(1);
                console.log(`  ${fuelType}: ${stats.count} заказов, ${stats.volume.toFixed(1)} л (${percentage}%), ${stats.avgPrice.toFixed(2)} ₽/л`);
            });
        
        console.log('\n📦 DELIVERY ANALYSIS:');
        Object.entries(deliveryTypes).forEach(([type, count]) => {
            const percentage = (count / onlineOrders.length * 100).toFixed(1);
            const typeLabel = type === 'delivery' ? 'Доставка' : 
                             type === 'pickup' ? 'Самовывоз' : type;
            console.log(`  ${typeLabel}: ${count} заказов (${percentage}%)`);
        });
        
        console.log('\n📱 ORDER SOURCES:');
        Object.entries(orderSources).forEach(([source, count]) => {
            const percentage = (count / onlineOrders.length * 100).toFixed(1);
            const sourceLabel = source === 'mobile_app' ? 'Мобильное приложение' :
                               source === 'website' ? 'Веб-сайт' :
                               source === 'telegram_bot' ? 'Telegram бот' : source;
            console.log(`  ${sourceLabel}: ${count} заказов (${percentage}%)`);
        });
        
        // Sample online orders
        console.log('\n📝 SAMPLE ONLINE ORDERS:');
        onlineOrders.slice(0, 5).forEach((order, index) => {
            const meta = order.metadata || {};
            console.log(`  ${index + 1}. ${order.fuel_type} ${order.quantity}л × ${order.price}₽ = ${order.total_cost}₽`);
            console.log(`     ${meta.customer_name || 'Customer'} | ${meta.delivery_type || 'unknown'} | ${meta.order_source || 'unknown'}`);
            console.log(`     Order ID: ${meta.order_id || 'N/A'}`);
        });
        
        console.log('\n✅ Online orders analysis completed!');
        
    } catch (error) {
        console.error('❌ Error analyzing online orders:', error.message);
    }
}

analyzeOnlineOrders();