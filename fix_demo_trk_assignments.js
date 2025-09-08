/**
 * Исправление привязки ТРК к резервуарам в демо сети АЗС
 * Каждая АЗС получает свои уникальные номера ТРК
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

// Схема логичного распределения ТРК по АЗС
const trkAssignments = {
    'point1': { // АЗС №001 - Центральная (флагманская, больше всего ТРК)
        name: 'АЗС №001 - Центральная',
        trks: {
            'АИ-92': [{ id: 101, название: 'ТРК-101' }, { id: 102, название: 'ТРК-102' }],
            'АИ-95': [{ id: 103, название: 'ТРК-103' }, { id: 104, название: 'ТРК-104' }],
            'АИ-98': [{ id: 105, название: 'ТРК-105' }],
            'Дизель': [{ id: 106, название: 'ТРК-106' }],
            'default': [{ id: 107, название: 'ТРК-107' }]
        }
    },
    'point2': { // АЗС №002 - Северная (коммерческая, акцент на дизель)
        name: 'АЗС №002 - Северная', 
        trks: {
            'АИ-92': [{ id: 201, название: 'ТРК-201' }],
            'АИ-95': [{ id: 202, название: 'ТРК-202' }],
            'Дизель': [{ id: 203, название: 'ТРК-203' }, { id: 204, название: 'ТРК-204' }],
            'default': [{ id: 205, название: 'ТРК-205' }]
        }
    },
    'point3': { // АЗС №003 - Южная (семейная, разнообразие топлива)
        name: 'АЗС №003 - Южная',
        trks: {
            'АИ-92': [{ id: 301, название: 'ТРК-301' }],
            'АИ-95': [{ id: 302, название: 'ТРК-302' }],
            'АИ-98': [{ id: 303, название: 'ТРК-303' }],
            'Дизель': [{ id: 304, название: 'ТРК-304' }],
            'default': [{ id: 305, название: 'ТРК-305' }]
        }
    },
    'point5': { // АЗС №005 - Промзона (промышленная, больше дизеля)
        name: 'АЗС №005 - Промзона',
        trks: {
            'АИ-92': [{ id: 501, название: 'ТРК-501' }],
            'АИ-95': [{ id: 502, название: 'ТРК-502' }],
            'АИ-98': [{ id: 503, название: 'ТРК-503' }],
            'Дизель': [{ id: 504, название: 'ТРК-504' }, { id: 505, название: 'ТРК-505' }],
            'default': [{ id: 506, название: 'ТРК-506' }]
        }
    },
    'point6': { // АЗС №006 - Окружная (компактная)
        name: 'АЗС №006 - Окружная',
        trks: {
            'АИ-92': [{ id: 601, название: 'ТРК-601' }],
            'АИ-95': [{ id: 602, название: 'ТРК-602' }],
            'АИ-98': [{ id: 603, название: 'ТРК-603' }],
            'Дизель': [{ id: 604, название: 'ТРК-604' }],
            'Дизель зимний': [{ id: 605, название: 'ТРК-605' }],
            'default': [{ id: 606, название: 'ТРК-606' }]
        }
    }
};

// Функция получения ТРК для топлива на конкретной АЗС
function getTrksForFuel(tradingPoint, fuelType) {
    const azs = trkAssignments[tradingPoint];
    if (!azs) return [{ id: 999, название: 'ТРК-999' }];
    
    // Ищем точное совпадение топлива
    if (azs.trks[fuelType]) {
        return azs.trks[fuelType];
    }
    
    // Для дизельных типов
    if (fuelType.includes('Дизель') && azs.trks['Дизель']) {
        return azs.trks['Дизель'];
    }
    
    // Для бензиновых типов
    if (fuelType.includes('АИ-') && azs.trks['АИ-92']) {
        return azs.trks['АИ-92'];
    }
    
    // Дефолтный ТРК
    return azs.trks['default'] || [{ id: 999, название: 'ТРК-999' }];
}

async function fixTrkAssignments() {
    console.log('🔧 Исправление привязки ТРК к резервуарам...');
    
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
            
            // Получаем правильные ТРК для этого топлива на этой АЗС
            const correctTrks = getTrksForFuel(tradingPointCode, fuelType);
            
            // Обновляем параметры резервуара
            const updatedParams = {
                ...params,
                "Связанные насосы": correctTrks
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
            const azsName = trkAssignments[tradingPointCode]?.name || tradingPointCode;
            const trkNames = correctTrks.map(t => t.название).join(', ');
            console.log(`   🔧 ${tank.display_name}: ${trkNames}`);
            
            // Небольшая задержка
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n🎉 Обновление завершено!`);
        console.log(`📊 Обновлено резервуаров: ${updatedCount}`);
        
        // Показываем сводку по АЗС
        console.log(`\n📋 Новая схема привязки ТРК по АЗС:`);
        Object.entries(trkAssignments).forEach(([code, azs]) => {
            console.log(`\n🏢 ${azs.name}:`);
            Object.entries(azs.trks).forEach(([fuel, trks]) => {
                if (fuel !== 'default') {
                    console.log(`   ⛽ ${fuel}: ${trks.map(t => t.название).join(', ')}`);
                }
            });
        });
        
        return true;

    } catch (error) {
        console.error('❌ Ошибка обновления ТРК:', error.message);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('fix_demo_trk_assignments.js')) {
    fixTrkAssignments()
        .then(success => {
            if (success) {
                console.log('\n🎯 Привязка ТРК к резервуарам успешно исправлена!');
                console.log('🔄 Обновите страницу резервуаров, чтобы увидеть изменения');
                console.log('📍 Теперь каждая АЗС имеет свои уникальные номера ТРК');
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

export { fixTrkAssignments };