const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjU4MTgxMCwiZXhwIjoyMDQyMTU3ODEwfQ.YYUPuWuZoHqWCF6yGAx1BzGBALY6bpRfqkjxOhSLNLQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoOperations() {
    console.log('🔨 Создание демонстрационных операций за август 2025...');
    
    // Получаем торговые точки
    const { data: tradingPoints, error: tpError } = await supabase
        .from('trading_points')
        .select('id, name');
    
    if (tpError) {
        console.error('❌ Ошибка получения торговых точек:', tpError);
        return;
    }
    
    console.log('📍 Найдено торговых точек:', tradingPoints.length);
    
    const operations = [];
    const fuelTypes = ['АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'АИ-100'];
    const paymentMethods = ['bank_card', 'cash', 'corporate_card'];
    const operationTypes = ['refueling', 'fuel_purchase', 'service'];
    
    // Генерируем операции за август 2025
    const startDate = new Date('2025-08-01');
    const endDate = new Date('2025-08-31');
    
    for (let day = 1; day <= 31; day++) {
        const currentDate = new Date('2025-08-' + day.toString().padStart(2, '0'));
        
        // 10-30 операций в день
        const operationsPerDay = Math.floor(Math.random() * 20) + 10;
        
        for (let i = 0; i < operationsPerDay; i++) {
            const tradingPoint = tradingPoints[Math.floor(Math.random() * tradingPoints.length)];
            const fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
            
            // Случайное время в течение дня
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const startTime = new Date(currentDate);
            startTime.setHours(hour, minute, 0, 0);
            
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + Math.floor(Math.random() * 10) + 2);
            
            // Случайные параметры
            const quantity = Math.round((Math.random() * 60 + 10) * 100) / 100; // 10-70 литров
            const basePrice = fuelType === 'АИ-92' ? 52.50 : 
                             fuelType === 'АИ-95' ? 55.90 :
                             fuelType === 'АИ-98' ? 59.30 :
                             fuelType === 'ДТ' ? 54.20 : 62.10; // АИ-100
            
            const price = basePrice + (Math.random() * 4 - 2); // ±2 рубля от базовой цены
            const totalCost = Math.round(quantity * price * 100) / 100;
            
            const operation = {
                id: `op-${day}-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                operation_type: operationType,
                status: Math.random() > 0.1 ? 'completed' : (Math.random() > 0.5 ? 'in_progress' : 'failed'),
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration: Math.floor((endTime - startTime) / 1000),
                trading_point_id: tradingPoint.id,
                trading_point_name: tradingPoint.name,
                device_id: `device-${Math.floor(Math.random() * 10) + 1}`,
                transaction_id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                fuel_type: fuelType,
                quantity: quantity,
                price: Math.round(price * 100) / 100,
                total_cost: totalCost,
                payment_method: paymentMethod,
                details: JSON.stringify({
                    pump: Math.floor(Math.random() * 8) + 1,
                    nozzle: Math.floor(Math.random() * 2) + 1,
                    receipt_number: `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
                    customer_type: Math.random() > 0.7 ? 'corporate' : 'individual'
                }),
                progress: 100,
                operator_name: ['Иван Петров', 'Мария Сидорова', 'Алексей Козлов', 'Елена Новикова'][Math.floor(Math.random() * 4)],
                customer_id: Math.random() > 0.6 ? `customer-${Math.floor(Math.random() * 1000)}` : null,
                vehicle_number: Math.random() > 0.5 ? generateCarNumber() : null,
                metadata: JSON.stringify({
                    weather: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
                    temperature: Math.floor(Math.random() * 20) + 15,
                    demo: true
                }),
                created_at: startTime.toISOString(),
                updated_at: endTime.toISOString()
            };
            
            operations.push(operation);
        }
    }
    
    console.log('📊 Создано операций:', operations.length);
    
    // Разбиваем на батчи по 1000 операций
    const batchSize = 1000;
    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize));
    }
    
    console.log('📦 Количество батчей:', batches.length);
    
    // Вставляем данные батчами
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`⚡ Вставка батча ${i + 1}/${batches.length} (${batch.length} операций)...`);
        
        const { error } = await supabase
            .from('operations')
            .upsert(batch);
        
        if (error) {
            console.error(`❌ Ошибка при вставке батча ${i + 1}:`, error);
            continue;
        }
        
        console.log(`✅ Батч ${i + 1} успешно вставлен`);
    }
    
    console.log('🎉 Создание демонстрационных операций завершено!');
}

function generateCarNumber() {
    const letters = 'АВЕКМНОРСТУХ';
    const numbers = Math.floor(Math.random() * 900) + 100;
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const region = Math.floor(Math.random() * 199) + 1;
    
    return `${letter1}${numbers}${letter2}${letter3}${region.toString().padStart(2, '0')}`;
}

// Запускаем создание
createDemoOperations().catch(console.error);