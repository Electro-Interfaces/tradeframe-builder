/**
 * Создание демо-данных резервуаров для всех АЗС Демо сети
 * Парк резервуаров согласно техническому заданию
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Mapping торговых точек
const tradingPointsMapping = {
    'АЗС №001 - Центральная': { external_id: 'point1', id: '9baf5375-9929-4774-8366-c0609b9f2a51' },
    'АЗС №002 - Северная': { external_id: 'point2', id: '9be94f90-84d1-4557-b746-460e13485b65' },
    'АЗС №003 - Южная': { external_id: 'point3', id: 'f2566905-c748-4240-ac31-47b626ab625d' },
    'АЗС №005 - Промзона': { external_id: 'point5', id: 'f7963207-2732-4fae-988e-c73eef7645ca' },
    'АЗС №006 - Окружная': { external_id: 'point6', id: '35f56ffd-826c-43b3-8f15-0f0e870f20cd' }
};

// Спецификация парка резервуаров согласно ТЗ
const tankSpecifications = [
    // АЗС №001 - Центральная: 2 резервуара (АИ-92, АИ-95)
    {
        station: 'АЗС №001 - Центральная',
        tanks: [
            { fuelType: 'АИ-92', capacity: 50000, location: 'Северная зона' },
            { fuelType: 'АИ-95', capacity: 50000, location: 'Южная зона' }
        ]
    },
    // АЗС №002 - Северная: 3 резервуара (АИ-92, АИ-95, Дизель)
    {
        station: 'АЗС №002 - Северная',
        tanks: [
            { fuelType: 'АИ-92', capacity: 40000, location: 'Основная зона' },
            { fuelType: 'АИ-95', capacity: 40000, location: 'Основная зона' },
            { fuelType: 'Дизель', capacity: 45000, location: 'Промышленная зона' }
        ]
    },
    // АЗС №003 - Южная: 4 резервуара (АИ-92, АИ-95, АИ-98, Дизель)  
    {
        station: 'АЗС №003 - Южная',
        tanks: [
            { fuelType: 'АИ-92', capacity: 55000, location: 'Зона А' },
            { fuelType: 'АИ-95', capacity: 55000, location: 'Зона А' },
            { fuelType: 'АИ-98', capacity: 30000, location: 'Зона Б' },
            { fuelType: 'Дизель', capacity: 60000, location: 'Зона Б' }
        ]
    },
    // АЗС №005 - Промзона: 5 резервуаров (АИ-92, АИ-95 x2, АИ-98, Дизель)
    {
        station: 'АЗС №005 - Промзона',
        tanks: [
            { fuelType: 'АИ-92', capacity: 50000, location: 'Западная секция' },
            { fuelType: 'АИ-95', capacity: 50000, location: 'Западная секция' },
            { fuelType: 'АИ-95', capacity: 55000, location: 'Восточная секция' }, // Второй резервуар АИ-95
            { fuelType: 'АИ-98', capacity: 30000, location: 'Центральная секция' },
            { fuelType: 'Дизель', capacity: 70000, location: 'Восточная секция' }
        ]
    },
    // АЗС №006 - Окружная: 5 резервуаров (все 5 видов топлива включая Дизель зимний)
    {
        station: 'АЗС №006 - Окружная',
        tanks: [
            { fuelType: 'АИ-92', capacity: 45000, location: 'Секция 1' },
            { fuelType: 'АИ-95', capacity: 50000, location: 'Секция 1' },
            { fuelType: 'АИ-98', capacity: 25000, location: 'Секция 2' },
            { fuelType: 'Дизель', capacity: 55000, location: 'Секция 2' },
            { fuelType: 'Дизель зимний', capacity: 40000, location: 'Секция 3' }
        ]
    }
];

// Получение шаблона резервуара  
async function getEquipmentTemplate() {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.fuel_tank&select=*`;
        
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
                        resolve(result[0]); // Берем первый шаблон резервуара
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

// Создание одного резервуара
async function createTankEquipment(tankData, stationName, templateId) {
    return new Promise((resolve, reject) => {
        const stationInfo = tradingPointsMapping[stationName];
        if (!stationInfo) {
            reject(new Error(`Торговая точка не найдена: ${stationName}`));
            return;
        }

        // Генерируем реалистичные данные на основе шаблона
        const currentLevel = Math.floor(tankData.capacity * (0.3 + Math.random() * 0.5)); // 30-80% заполнение
        const bookBalance = Math.floor(currentLevel + (Math.random() - 0.5) * 500); // Книжный остаток близко к факту
        
        // Параметры с русскими названиями (как в обновленном шаблоне)
        const equipmentParams = {
            "ID": Math.floor(Math.random() * 1000) + 1,
            "Название": `Резервуар №${Math.floor(Math.random() * 10) + 1} (${tankData.fuelType})`,
            "Тип топлива": tankData.fuelType,
            "Текущий уровень (л)": currentLevel,
            "Книжный остаток": bookBalance,
            "Емкость (л)": tankData.capacity,
            "Минимальный уровень (%)": 20,
            "Критический уровень (%)": 10,
            "Температура": Math.floor(12 + Math.random() * 8), // 12-20°C
            "Подтоварная вода": Math.floor(Math.random() * 3), // 0-3 мм
            "Плотность": tankData.fuelType.includes('Дизель') ? 0.835 : 0.725,
            "Статус": "active",
            "Местоположение": tankData.location,
            "Дата установки": new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            "Последняя калибровка": new Date(2024, 8 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            "Поставщик": ['Лукойл', 'Роснефть', 'Газпром нефть', 'Татнефть'][Math.floor(Math.random() * 4)],
            "Датчики": [
                { "название": "Уровень", "статус": Math.random() > 0.1 ? "ok" : "error" },
                { "название": "Температура", "статус": Math.random() > 0.05 ? "ok" : "error" }
            ],
            "Связанные насосы": [
                { "id": Math.floor(Math.random() * 10) + 1, "название": `ТРК-${Math.floor(Math.random() * 8) + 1}` }
            ],
            "Настройки уведомлений": {
                "включены": true,
                "уведомления о сливе": true,
                "уведомления об уровне": true
            },
            "Пороговые значения": {
                "критическая температура": {
                    "мин": -15,
                    "макс": 45
                },
                "максимальный уровень воды (мм)": 15,
                "уведомления": {
                    "критический уровень": true,
                    "минимальный уровень": true,
                    "температура": true,
                    "уровень воды": true
                }
            },
            "Торговая точка": stationInfo.external_id,
            "Дата создания": new Date().toISOString(),
            "Дата обновления": new Date().toISOString()
        };

        const equipmentData = {
            name: "Резервуар",
            display_name: `Резервуар ${tankData.fuelType} - ${stationName}`,
            system_type: "fuel_tank",
            template_id: templateId,
            trading_point_id: stationInfo.id,
            serial_number: `TANK-${stationInfo.external_id.toUpperCase()}-${tankData.fuelType.replace(/[^A-Za-z0-9]/g, '')}`,
            external_id: `${stationInfo.external_id}_tank_${tankData.fuelType.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            status: "online",
            installation_date: equipmentParams["Дата установки"] + "T00:00:00Z",
            params: equipmentParams
        };

        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment`;
        
        const postData = JSON.stringify(equipmentData);

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
                'Prefer': 'return=representation'
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
                        const result = data ? JSON.parse(data) : null;
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

        req.write(postData);
        req.end();
    });
}

// Основная функция создания всех резервуаров
async function createAllDemoTanks() {
    console.log('🚀 Создание демо-данных резервуаров для Демо сети АЗС');
    console.log('📋 Всего АЗС: 5, всего резервуаров: 19\n');

    try {
        // Получаем шаблон резервуара
        console.log('🔍 Получение шаблона резервуара...');
        const template = await getEquipmentTemplate();
        if (!template) {
            throw new Error('Шаблон резервуара не найден');
        }
        console.log(`✅ Шаблон получен: ${template.name} (ID: ${template.id})\n`);

        let totalCreated = 0;

        // Создаем резервуары для каждой АЗС
        for (const stationSpec of tankSpecifications) {
            console.log(`🏪 Создание резервуаров для ${stationSpec.station}`);
            console.log(`📊 Количество резервуаров: ${stationSpec.tanks.length}`);

            for (let i = 0; i < stationSpec.tanks.length; i++) {
                const tankSpec = stationSpec.tanks[i];
                try {
                    console.log(`  📦 Создание резервуара ${i + 1}: ${tankSpec.fuelType} (${tankSpec.capacity}л, ${tankSpec.location})`);
                    
                    const result = await createTankEquipment(tankSpec, stationSpec.station, template.id);
                    
                    if (result && result.length > 0) {
                        console.log(`    ✅ Создан: ${result[0].display_name} (ID: ${result[0].id})`);
                        totalCreated++;
                    }
                    
                    // Пауза между созданием резервуаров
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (error) {
                    console.log(`    ❌ Ошибка создания резервуара ${tankSpec.fuelType}: ${error.message}`);
                }
            }
            console.log(''); // Пустая строка между АЗС
        }

        console.log(`🎉 Создание завершено!`);
        console.log(`📈 Всего создано резервуаров: ${totalCreated} из 19 планируемых`);
        
        return totalCreated;

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        return 0;
    }
}

// Функция проверки созданных данных
async function verifyCreatedTanks() {
    console.log('\n🔍 Проверка созданных резервуаров...');
    
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment?system_type=eq.fuel_tank&select=*`;
        
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
                        const tanks = JSON.parse(data);
                        console.log(`✅ Найдено резервуаров в базе: ${tanks.length}`);
                        
                        // Группировка по торговым точкам
                        const tanksByStation = {};
                        tanks.forEach(tank => {
                            const stationId = tank.trading_point_id;
                            if (!tanksByStation[stationId]) {
                                tanksByStation[stationId] = [];
                            }
                            tanksByStation[stationId].push(tank);
                        });

                        console.log('\n📊 Распределение по АЗС:');
                        Object.entries(tradingPointsMapping).forEach(([stationName, info]) => {
                            const stationTanks = tanksByStation[info.id] || [];
                            console.log(`  ${stationName}: ${stationTanks.length} резервуаров`);
                            stationTanks.forEach(tank => {
                                const fuelType = tank.params?.["Тип топлива"] || 'Неизвестно';
                                console.log(`    • ${tank.display_name} (${fuelType})`);
                            });
                        });

                        resolve(tanks);
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

// Запуск если вызван напрямую
async function main() {
    const createdCount = await createAllDemoTanks();
    if (createdCount > 0) {
        await verifyCreatedTanks();
        console.log('\n🏁 Демо-данные резервуаров успешно созданы!');
        return true;
    } else {
        console.log('\n💥 Не удалось создать демо-данные');
        return false;
    }
}

if (process.argv[1].endsWith('create_demo_tanks.js')) {
    main()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { createAllDemoTanks, verifyCreatedTanks };