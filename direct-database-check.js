/**
 * Прямая проверка базы данных для диагностики проблемы с торговыми точками
 */

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function checkDatabase() {
    console.log('🔍 Начинаем диагностику базы данных...');
    
    try {
        // Проверяем операции
        console.log('\n1️⃣ Проверяем операции...');
        const operationsResponse = await fetch(`${supabaseUrl}/rest/v1/operations?limit=10`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        if (operationsResponse.ok) {
            const operations = await operationsResponse.json();
            console.log('✅ Операций найдено:', operations.length);
            console.log('📊 Образцы операций:', operations.slice(0, 3).map(op => ({
                id: op.id,
                trading_point_id: op.trading_point_id,
                trading_point_id_type: typeof op.trading_point_id,
                status: op.status,
                total_cost: op.total_cost
            })));
        } else {
            console.error('❌ Ошибка загрузки операций:', operationsResponse.status);
        }
        
        // Проверяем торговые точки
        console.log('\n2️⃣ Проверяем торговые точки...');
        const tradingPointsResponse = await fetch(`${supabaseUrl}/rest/v1/trading_points?limit=10`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        if (tradingPointsResponse.ok) {
            const tradingPoints = await tradingPointsResponse.json();
            console.log('✅ Торговых точек найдено:', tradingPoints.length);
            console.log('📊 Образцы торговых точек:', tradingPoints.slice(0, 3).map(tp => ({
                id: tp.id,
                id_type: typeof tp.id,
                name: tp.name,
                network_id: tp.network_id
            })));
        } else {
            console.error('❌ Ошибка загрузки торговых точек:', tradingPointsResponse.status);
        }
        
        // Проверяем завершенные операции конкретно
        console.log('\n3️⃣ Проверяем завершенные операции...');
        const completedOpsResponse = await fetch(`${supabaseUrl}/rest/v1/operations?status=eq.completed&limit=20`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        if (completedOpsResponse.ok) {
            const completedOps = await completedOpsResponse.json();
            console.log('✅ Завершенных операций найдено:', completedOps.length);
            
            const withTradingPoint = completedOps.filter(op => op.trading_point_id);
            console.log('📍 Операций с trading_point_id:', withTradingPoint.length);
            
            if (withTradingPoint.length > 0) {
                const tradingPointStats = {};
                withTradingPoint.forEach(op => {
                    const tpId = op.trading_point_id;
                    tradingPointStats[tpId] = (tradingPointStats[tpId] || 0) + 1;
                });
                
                console.log('📊 Операций по торговым точкам:', tradingPointStats);
                
                // Тестируем фильтрацию по первой торговой точке
                const firstTradingPointId = Object.keys(tradingPointStats)[0];
                if (firstTradingPointId) {
                    console.log(`\n4️⃣ Тестируем фильтрацию по торговой точке ${firstTradingPointId}...`);
                    
                    const filteredResponse = await fetch(`${supabaseUrl}/rest/v1/operations?status=eq.completed&trading_point_id=eq.${firstTradingPointId}`, {
                        headers: {
                            'apikey': serviceKey,
                            'Authorization': `Bearer ${serviceKey}`
                        }
                    });
                    
                    if (filteredResponse.ok) {
                        const filteredOps = await filteredResponse.json();
                        console.log('✅ Фильтрация работает! Найдено операций:', filteredOps.length);
                        console.log('💰 Общая сумма:', filteredOps.reduce((sum, op) => sum + (op.total_cost || 0), 0));
                        
                        if (filteredOps.length === 0) {
                            console.log('⚠️ ПРОБЛЕМА: Фильтрация возвращает 0 операций, хотя они должны быть');
                        }
                    } else {
                        console.error('❌ Ошибка фильтрации:', filteredResponse.status);
                    }
                }
            } else {
                console.log('🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Ни одна завершенная операция не имеет trading_point_id!');
            }
        } else {
            console.error('❌ Ошибка загрузки завершенных операций:', completedOpsResponse.status);
        }
        
        console.log('\n🎉 Диагностика завершена!');
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
    }
}

// Запуск
checkDatabase().catch(console.error);