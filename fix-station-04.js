/**
 * Доисправляем station_04 и проверяем результат
 */

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function fixStation04() {
    console.log('🔧 Доисправляем station_04...');
    
    try {
        // Получаем структуру таблицы торговых точек
        const tradingPointsResponse = await fetch(`${supabaseUrl}/rest/v1/trading_points?limit=1`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        const sampleTP = (await tradingPointsResponse.json())[0];
        console.log('📊 Структура торговой точки:', Object.keys(sampleTP));
        
        // Создаем торговую точку без is_active
        const networkId = sampleTP.network_id;
        const newTradingPoint = {
            network_id: networkId,
            name: 'АЗС №004',
            external_id: 'station_04',
            address: 'Адрес АЗС 004'
        };
        
        console.log('➕ Создаем торговую точку station_04...');
        
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/trading_points`, {
            method: 'POST',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(newTradingPoint)
        });
        
        if (createResponse.ok) {
            const [createdTP] = await createResponse.json();
            const newId = createdTP.id;
            console.log(`✅ Создана торговая точка station_04 с ID ${newId}`);
            
            // Обновляем операции
            console.log('🔄 Обновляем операции station_04...');
            
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/operations?trading_point_id=eq.station_04`, {
                method: 'PATCH',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trading_point_id: newId })
            });
            
            if (updateResponse.ok) {
                console.log(`✅ Обновлены операции для station_04`);
            } else {
                console.error(`❌ Ошибка обновления операций:`, await updateResponse.text());
            }
            
        } else {
            console.error('❌ Ошибка создания station_04:', await createResponse.text());
        }
        
        // Финальная проверка
        console.log('\n🧪 Финальная проверка...');
        
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/operations?status=eq.completed&limit=100`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        if (checkResponse.ok) {
            const operations = await checkResponse.json();
            const tradingPointIds = [...new Set(operations.map(op => op.trading_point_id))];
            console.log('✅ Уникальные trading_point_id:', tradingPointIds);
            
            // Получаем все торговые точки для проверки
            const allTPResponse = await fetch(`${supabaseUrl}/rest/v1/trading_points`, {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                }
            });
            
            const allTradingPoints = await allTPResponse.json();
            const allTPIds = allTradingPoints.map(tp => tp.id);
            
            const validIds = tradingPointIds.filter(id => allTPIds.includes(id));
            const invalidIds = tradingPointIds.filter(id => !allTPIds.includes(id));
            
            console.log('✅ Корректных ID:', validIds.length);
            console.log('❌ Некорректных ID:', invalidIds.length);
            
            if (invalidIds.length === 0) {
                console.log('🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО ПОЛНОСТЬЮ!');
                console.log('💡 Теперь можно тестировать фильтрацию по торговым точкам');
                
                // Тестируем конкретную торговую точку
                const testTradingPointId = validIds[0];
                console.log(`\n🧪 Тестируем фильтрацию по ${testTradingPointId}...`);
                
                const testResponse = await fetch(`${supabaseUrl}/rest/v1/operations?status=eq.completed&trading_point_id=eq.${testTradingPointId}`, {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`
                    }
                });
                
                const testOps = await testResponse.json();
                console.log(`✅ Найдено операций для тестовой точки: ${testOps.length}`);
                console.log(`💰 Общая сумма: ${testOps.reduce((sum, op) => sum + (op.total_cost || 0), 0)}`);
                
            } else {
                console.log('⚠️ Остались некорректные ID:', invalidIds);
            }
        }
        
    } catch (error) {
        console.error('💥 Ошибка:', error);
    }
}

fixStation04().catch(console.error);