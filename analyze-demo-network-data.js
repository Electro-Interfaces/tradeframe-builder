/**
 * Анализ данных демо сети АЗС
 * Создаем таблицу связности: номенклатура → оборудование → резервуары
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

async function analyzeNetworkData() {
    try {
        console.log('📋 АНАЛИЗ ДАННЫХ ДЕМО СЕТИ АЗС');
        console.log('='.repeat(80));
        console.log('🔍 Загружаем данные из всех таблиц...\n');
        
        // 1. Получаем все данные параллельно
        const [
            networks,
            nomenclature,
            equipment,
            fuelTypes,
            tradingPoints
        ] = await Promise.all([
            getData('networks'),
            getData('nomenclature'),
            getData('equipment'),
            getData('fuel_types'),
            getData('trading_points')
        ]);

        console.log('✅ Данные загружены:');
        console.log(`   - Сети: ${networks.length}`);
        console.log(`   - Номенклатура: ${nomenclature.length}`);
        console.log(`   - Оборудование: ${equipment.length}`);
        console.log(`   - Виды топлива: ${fuelTypes.length}`);
        console.log(`   - Торговые точки: ${tradingPoints.length}\n`);

        // 2. Находим демо сеть
        const demoNetwork = networks.find(n => n.name === 'Демо сеть АЗС');
        if (!demoNetwork) {
            console.error('❌ Демо сеть АЗС не найдена!');
            return;
        }

        console.log('🏢 ДЕМО СЕТЬ АЗС');
        console.log('='.repeat(50));
        console.log(`ID: ${demoNetwork.id}`);
        console.log(`Название: ${demoNetwork.name}`);
        console.log(`Описание: ${demoNetwork.description || 'Не указано'}`);
        console.log(`Статус: ${demoNetwork.is_active ? 'Активна' : 'Неактивна'}\n`);

        // 3. Анализируем номенклатуру для демо сети
        const demoNomenclature = nomenclature.filter(n => n.network_id === demoNetwork.id && n.is_active);
        console.log('📝 НОМЕНКЛАТУРА ДЕМО СЕТИ');
        console.log('='.repeat(50));
        console.log(`Всего активных позиций в номенклатуре: ${demoNomenclature.length}`);
        
        if (demoNomenclature.length > 0) {
            console.log('\nСписок видов топлива в номенклатуре:');
            demoNomenclature.forEach((item, index) => {
                console.log(`${index + 1}. ${item.name}`);
                if (item.description) console.log(`   Описание: ${item.description}`);
                if (item.category) console.log(`   Категория: ${item.category}`);
            });
        } else {
            console.log('❌ В номенклатуре нет активных позиций для демо сети!');
        }

        // 4. Анализируем торговые точки демо сети
        const demoTradingPoints = tradingPoints.filter(tp => tp.network_id === demoNetwork.id);
        console.log('\n🏪 ТОРГОВЫЕ ТОЧКИ ДЕМО СЕТИ');
        console.log('='.repeat(50));
        console.log(`Всего торговых точек: ${demoTradingPoints.length}`);
        
        if (demoTradingPoints.length > 0) {
            console.log('\nСписок торговых точек:');
            demoTradingPoints.forEach((tp, index) => {
                console.log(`${index + 1}. ${tp.name} (ID: ${tp.external_id || tp.id})`);
                if (tp.address) console.log(`   Адрес: ${tp.address}`);
            });
        }

        // 5. Анализируем оборудование (резервуары) для торговых точек демо сети
        console.log('\n🛢️  ОБОРУДОВАНИЕ И РЕЗЕРВУАРЫ');
        console.log('='.repeat(50));
        
        const demoTradingPointIds = demoTradingPoints.map(tp => tp.id);
        const demoEquipment = equipment.filter(eq => 
            demoTradingPointIds.includes(eq.trading_point_id)
        );
        
        console.log(`Всего единиц оборудования: ${demoEquipment.length}`);
        
        // Группируем по торговым точкам
        const equipmentByTradingPoint = {};
        demoEquipment.forEach(eq => {
            const tradingPoint = demoTradingPoints.find(tp => tp.id === eq.trading_point_id);
            const tpName = tradingPoint ? tradingPoint.name : `Unknown (${eq.trading_point_id})`;
            
            if (!equipmentByTradingPoint[tpName]) {
                equipmentByTradingPoint[tpName] = [];
            }
            equipmentByTradingPoint[tpName].push(eq);
        });

        // Выводим оборудование по торговым точкам
        Object.entries(equipmentByTradingPoint).forEach(([tpName, equipment]) => {
            console.log(`\n📍 ${tpName}:`);
            console.log(`   Резервуаров: ${equipment.length}`);
            
            equipment.forEach((eq, index) => {
                const fuelType = eq.params?.['Тип топлива'] || 'Не указан';
                const capacity = eq.params?.['Емкость (л)'] || 'Не указана';
                const currentLevel = eq.params?.['Текущий уровень (л)'] || 'Не указан';
                
                console.log(`   ${index + 1}. ${eq.name}`);
                console.log(`      Тип: ${eq.type}`);
                console.log(`      Вид топлива: ${fuelType}`);
                console.log(`      Емкость: ${capacity} л`);
                console.log(`      Текущий уровень: ${currentLevel} л`);
                console.log(`      Статус: ${eq.is_active ? 'Активен' : 'Неактивен'}`);
            });
        });

        // 6. Создаем сводную таблицу
        console.log('\n📊 СВОДНАЯ ТАБЛИЦА СООТВЕТСТВИЯ');
        console.log('='.repeat(80));
        
        // Собираем виды топлива из номенклатуры
        const nomenclatureFuelTypes = new Set(demoNomenclature.map(n => n.name));
        
        // Собираем виды топлива из оборудования
        const equipmentFuelTypes = new Set();
        demoEquipment.forEach(eq => {
            const fuelType = eq.params?.['Тип топлива'];
            if (fuelType) equipmentFuelTypes.add(fuelType);
        });
        
        // Собираем все уникальные виды топлива
        const allFuelTypes = new Set([...nomenclatureFuelTypes, ...equipmentFuelTypes]);
        
        console.log('┌─────────────────────────────────────┬─────────────────────────────────────┬─────────────────────────────────────┐');
        console.log('│          НОМЕНКЛАТУРА               │            ОБОРУДОВАНИЕ              │           РЕЗЕРВУАРЫ                │');
        console.log('├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────┤');
        
        [...allFuelTypes].sort().forEach(fuelType => {
            const inNomenclature = nomenclatureFuelTypes.has(fuelType) ? '✅' : '❌';
            const equipmentCount = demoEquipment.filter(eq => eq.params?.['Тип топлива'] === fuelType).length;
            const inEquipment = equipmentCount > 0 ? `✅ (${equipmentCount})` : '❌';
            const tankLocations = [];
            
            // Находим где расположены резервуары с этим топливом
            demoEquipment.forEach(eq => {
                if (eq.params?.['Тип топлива'] === fuelType) {
                    const tradingPoint = demoTradingPoints.find(tp => tp.id === eq.trading_point_id);
                    if (tradingPoint) {
                        tankLocations.push(tradingPoint.name);
                    }
                }
            });
            
            const tankInfo = tankLocations.length > 0 ? 
                `✅ ${tankLocations.join(', ')}` : 
                '❌';
            
            console.log(`│ ${fuelType.padEnd(35)} │ ${inNomenclature.padEnd(35)} │ ${tankInfo.padEnd(35)} │`);
        });
        
        console.log('└─────────────────────────────────────┴─────────────────────────────────────┴─────────────────────────────────────┘');
        
        // 7. Статистика и рекомендации
        console.log('\n📈 СТАТИСТИКА И АНАЛИЗ');
        console.log('='.repeat(50));
        
        const nomenclatureCount = nomenclatureFuelTypes.size;
        const equipmentTypesCount = equipmentFuelTypes.size;
        const matchingTypes = [...nomenclatureFuelTypes].filter(type => equipmentFuelTypes.has(type)).length;
        
        console.log(`Видов топлива в номенклатуре: ${nomenclatureCount}`);
        console.log(`Видов топлива в оборудовании: ${equipmentTypesCount}`);
        console.log(`Совпадающих видов топлива: ${matchingTypes}`);
        console.log(`Процент соответствия: ${Math.round((matchingTypes / Math.max(nomenclatureCount, equipmentTypesCount)) * 100)}%`);
        
        // Находим несоответствия
        const onlyInNomenclature = [...nomenclatureFuelTypes].filter(type => !equipmentFuelTypes.has(type));
        const onlyInEquipment = [...equipmentFuelTypes].filter(type => !nomenclatureFuelTypes.has(type));
        
        if (onlyInNomenclature.length > 0) {
            console.log('\n⚠️  Виды топлива только в номенклатуре (нет резервуаров):');
            onlyInNomenclature.forEach(type => console.log(`   - ${type}`));
        }
        
        if (onlyInEquipment.length > 0) {
            console.log('\n⚠️  Виды топлива только в резервуарах (нет в номенклатуре):');
            onlyInEquipment.forEach(type => console.log(`   - ${type}`));
        }
        
        // 8. Анализ по торговым точкам
        console.log('\n🏪 ДЕТАЛЬНЫЙ АНАЛИЗ ПО ТОРГОВЫМ ТОЧКАМ');
        console.log('='.repeat(60));
        
        demoTradingPoints.forEach(tp => {
            const tpEquipment = demoEquipment.filter(eq => eq.trading_point_id === tp.id);
            const tpFuelTypes = new Set(tpEquipment.map(eq => eq.params?.['Тип топлива']).filter(Boolean));
            
            console.log(`\n📍 ${tp.name}:`);
            console.log(`   Резервуаров: ${tpEquipment.length}`);
            console.log(`   Видов топлива: ${tpFuelTypes.size}`);
            
            if (tpFuelTypes.size > 0) {
                console.log('   Виды топлива на точке:');
                [...tpFuelTypes].sort().forEach(fuelType => {
                    const count = tpEquipment.filter(eq => eq.params?.['Тип топлива'] === fuelType).length;
                    const totalCapacity = tpEquipment
                        .filter(eq => eq.params?.['Тип топлива'] === fuelType)
                        .reduce((sum, eq) => sum + (eq.params?.['Емкость (л)'] || 0), 0);
                    
                    console.log(`     • ${fuelType}: ${count} резервуаров, ${totalCapacity.toLocaleString('ru-RU')} л общая емкость`);
                });
            }
        });
        
        console.log('\n✅ Анализ данных демо сети завершен!');
        console.log('\n💡 Рекомендации:');
        if (onlyInNomenclature.length > 0) {
            console.log('   - Добавить резервуары для видов топлива из номенклатуры');
        }
        if (onlyInEquipment.length > 0) {
            console.log('   - Добавить виды топлива из резервуаров в номенклатуру');
        }
        if (matchingTypes === Math.max(nomenclatureCount, equipmentTypesCount)) {
            console.log('   - Данные полностью согласованы! 👍');
        }
        
    } catch (error) {
        console.error('❌ Ошибка анализа данных:', error.message);
    }
}

analyzeNetworkData();