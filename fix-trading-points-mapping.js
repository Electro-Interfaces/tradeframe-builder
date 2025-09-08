/**
 * Исправление связи между операциями и торговыми точками
 * Создаем правильное соответствие между operations.trading_point_id и trading_points.id
 */

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function fixTradingPointsMapping() {
    console.log('🔧 Исправляем связь между операциями и торговыми точками...');
    
    try {
        // Загружаем торговые точки
        const tradingPointsResponse = await fetch(`${supabaseUrl}/rest/v1/trading_points`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        const tradingPoints = await tradingPointsResponse.json();
        console.log('✅ Загружено торговых точек:', tradingPoints.length);
        
        // Создаем маппинг station_XX -> UUID
        const stationMapping = {
            'station_01': tradingPoints.find(tp => tp.name.includes('001'))?.id,
            'station_02': tradingPoints.find(tp => tp.name.includes('002'))?.id,
            'station_03': tradingPoints.find(tp => tp.name.includes('003'))?.id,
            'station_04': tradingPoints.find(tp => tp.name.includes('004'))?.id,
            'station_05': tradingPoints.find(tp => tp.name.includes('005'))?.id,
        };
        
        console.log('📊 Маппинг станций:', stationMapping);
        
        // Проверяем что все ID найдены
        const missingMappings = Object.entries(stationMapping).filter(([key, value]) => !value);
        if (missingMappings.length > 0) {
            console.log('⚠️ Не найдены торговые точки для:', missingMappings.map(([key]) => key));
            
            // Добавим недостающие торговые точки
            const networkId = tradingPoints[0]?.network_id;
            if (networkId) {
                for (const [stationId] of missingMappings) {
                    const stationNumber = stationId.replace('station_', '').padStart(3, '0');
                    console.log(`➕ Создаем торговую точку для ${stationId}...`);
                    
                    const newTradingPoint = {
                        network_id: networkId,
                        name: `АЗС №${stationNumber}`,
                        external_id: stationId,
                        address: `Адрес АЗС ${stationNumber}`,
                        is_active: true
                    };
                    
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
                        stationMapping[stationId] = createdTP.id;
                        console.log(`✅ Создана торговая точка ${stationId} с ID ${createdTP.id}`);
                    } else {
                        console.error(`❌ Ошибка создания ${stationId}:`, await createResponse.text());
                    }
                }
            }
        }
        
        // Теперь обновляем операции
        console.log('\n🔄 Обновляем trading_point_id в операциях...');
        
        for (const [oldId, newId] of Object.entries(stationMapping)) {
            if (!newId) continue;
            
            console.log(`📝 Обновляем операции ${oldId} -> ${newId}...`);
            
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/operations?trading_point_id=eq.${oldId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trading_point_id: newId })
            });
            
            if (updateResponse.ok) {
                console.log(`✅ Обновлены операции для ${oldId}`);
            } else {
                console.error(`❌ Ошибка обновления операций ${oldId}:`, await updateResponse.text());
            }
        }
        
        // Проверяем результат
        console.log('\n🧪 Проверяем результат...');
        
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/operations?status=eq.completed&limit=10`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        if (checkResponse.ok) {
            const operations = await checkResponse.json();
            const tradingPointIds = [...new Set(operations.map(op => op.trading_point_id))];
            console.log('✅ Уникальные trading_point_id после обновления:', tradingPointIds);
            
            // Проверяем что все ID теперь существуют в справочнике
            const allTradingPointIds = tradingPoints.map(tp => tp.id);
            const validIds = tradingPointIds.filter(id => allTradingPointIds.includes(id));
            const invalidIds = tradingPointIds.filter(id => !allTradingPointIds.includes(id));
            
            console.log('✅ Корректных ID:', validIds.length);
            console.log('❌ Некорректных ID:', invalidIds.length);
            
            if (invalidIds.length === 0) {
                console.log('🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!');
                console.log('💡 Теперь данные должны отображаться для конкретных торговых точек');
            } else {
                console.log('⚠️ Остались некорректные ID:', invalidIds);
            }
        }
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
    }
}

// Запуск
fixTradingPointsMapping().catch(console.error);