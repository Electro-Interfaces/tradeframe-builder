/**
 * Обновление статусов датчиков в демо резервуарах
 * Создает реалистичные и разнообразные статусы датчиков
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Утилита для HTTP запросов
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data ? JSON.parse(data) : null);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// Генерация реалистичных статусов датчиков для разных АЗС
function generateSensorStatuses(tradingPointCode, fuelType, tankNumber) {
    const scenarios = {
        // АЗС №001 - Центральная (флагманская, все работает)
        'point1': () => ({
            level: 'ok',
            temperature: 'ok'
        }),
        
        // АЗС №002 - Северная (одна проблема с датчиком температуры в дизеле)
        'point2': (fuel) => ({
            level: 'ok',
            temperature: fuel === 'Дизель' ? 'error' : 'ok'
        }),
        
        // АЗС №003 - Южная (проблемы с уровнем АИ-98, остальное ОК)
        'point3': (fuel) => ({
            level: fuel === 'АИ-98' ? 'error' : 'ok',
            temperature: 'ok'
        }),
        
        // АЗС №005 - Промзона (старое оборудование, больше проблем)
        'point5': () => ({
            level: Math.random() > 0.3 ? 'ok' : 'error',
            temperature: 'ok'
        }),
        
        // Дефолтные значения (смешанные статусы)
        'default': () => ({
            level: Math.random() > 0.85 ? 'error' : 'ok',
            temperature: Math.random() > 0.9 ? 'error' : 'ok'
        })
    };

    const generator = scenarios[tradingPointCode] || scenarios.default;
    const statuses = generator(fuelType);
    
    return [
        { "название": "Уровень", "статус": statuses.level },
        { "название": "Температура", "статус": statuses.temperature }
    ];
}

async function updateTankSensors() {
    console.log('🔧 Обновление статусов датчиков в демо резервуарах...');
    
    try {
        // Получаем все резервуары из equipment
        const equipmentUrl = `${SUPABASE_URL}/rest/v1/equipment?system_type=eq.fuel_tank&select=*`;
        const equipmentOptions = {
            ...url.parse(equipmentUrl),
            method: 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const tanks = await makeRequest(equipmentOptions);
        console.log(`✅ Найдено резервуаров: ${tanks.length}`);

        let updatedCount = 0;

        for (const tank of tanks) {
            const params = tank.params || {};
            const tradingPointCode = params["Торговая точка"] || 'default';
            const fuelType = params["Тип топлива"] || 'АИ-92';
            
            // Генерируем новые статусы датчиков
            const newSensors = generateSensorStatuses(tradingPointCode, fuelType);
            
            // Обновляем параметры резервуара
            const updatedParams = {
                ...params,
                "Датчики": newSensors
            };

            // Отправляем PATCH запрос
            const updateUrl = `${SUPABASE_URL}/rest/v1/equipment?id=eq.${tank.id}`;
            const updateOptions = {
                ...url.parse(updateUrl),
                method: 'PATCH',
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            const updateData = JSON.stringify({
                params: updatedParams,
                updated_at: new Date().toISOString()
            });

            await makeRequest(updateOptions, updateData);
            updatedCount++;
            
            // Выводим статус обновления
            const sensorStatus = newSensors.map(s => `${s.название}:${s.статус === 'ok' ? '✅' : '❌'}`).join(' ');
            console.log(`   🔧 ${tank.display_name}: ${sensorStatus}`);
            
            // Небольшая задержка
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n🎉 Обновление завершено!`);
        console.log(`📊 Обновлено резервуаров: ${updatedCount}`);
        
        // Показываем сводку по АЗС
        console.log(`\n📋 Сводка по статусам датчиков:`);
        console.log(`   🏛️  АЗС №001 - Центральная: Все датчики работают (флагманская АЗС)`);
        console.log(`   🏢 АЗС №002 - Северная: Проблема с температурой в дизельном баке`);
        console.log(`   🏠 АЗС №003 - Южная: Проблема с уровнем в баке АИ-98`);
        console.log(`   🏭 АЗС №005 - Промзона: Периодические проблемы (старое оборудование)`);
        
        return true;

    } catch (error) {
        console.error('❌ Ошибка обновления датчиков:', error.message);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('update_demo_sensors.js')) {
    updateTankSensors()
        .then(success => {
            if (success) {
                console.log('\n🎯 Датчики демо резервуаров успешно обновлены!');
                console.log('🔄 Обновите страницу резервуаров, чтобы увидеть изменения');
                process.exit(0);
            } else {
                console.log('\n💥 Обновление завершилось с ошибками');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { updateTankSensors };