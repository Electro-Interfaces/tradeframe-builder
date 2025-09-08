/**
 * Прямое обновление шаблона резервуара через Supabase REST API
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function updateTankTemplate() {
    console.log('🚀 Обновление шаблона резервуара через REST API...');

    // Полный default_params объект синхронизированный с Tank interface
    const fullDefaultParams = {
        // Обязательные поля резервуара (синхронизировано с Tank interface)
        id: 1,
        name: "",
        fuelType: "",
        currentLevelLiters: 0,
        bookBalance: 0, // Книжный остаток
        
        // Параметры емкости
        capacityLiters: 50000,
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        
        // Физические параметры
        temperature: 15.0,
        waterLevelMm: 0.0,
        density: 0.725,
        
        // Статус и операционные данные
        status: 'active',
        location: "Зона не указана",
        installationDate: new Date().toISOString().split('T')[0],
        lastCalibration: null,
        supplier: null,
        
        // Датчики (полная синхронизация с Tank interface)
        sensors: [
            { name: "Уровень", status: "ok" },
            { name: "Температура", status: "ok" }
        ],
        linkedPumps: [],
        
        // Уведомления (полная синхронизация)
        notifications: {
            enabled: true,
            drainAlerts: true,
            levelAlerts: true
        },
        
        // Пороговые значения (полная синхронизация с Tank interface)
        thresholds: {
            criticalTemp: {
                min: -10,
                max: 40
            },
            maxWaterLevel: 15,
            notifications: {
                critical: true,
                minimum: true,
                temperature: true,
                water: true
            }
        },
        
        // Системные поля (добавлены для полной синхронизации с Tank interface)
        trading_point_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        // PATCH запрос для обновления шаблона резервуара
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.fuel_tank&name=eq.${encodeURIComponent('Резервуар')}`;
        
        const postData = JSON.stringify({
            default_params: fullDefaultParams,
            updated_at: new Date().toISOString()
        });

        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'PATCH',
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
                        console.log('✅ Шаблон резервуара обновлен успешно!');
                        if (result && result.length > 0) {
                            console.log('📊 Обновленных записей:', result.length);
                            console.log('🔑 Количество полей в default_params:', Object.keys(result[0].default_params || {}).length);
                        }
                        resolve(result);
                    } else {
                        console.log('❌ Ошибка обновления:', res.statusCode, data);
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

async function verifyUpdate() {
    console.log('\n🔍 Проверяем результат обновления...');
    
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.fuel_tank&select=name,system_type,default_params`;
        
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
                        console.log('✅ Проверка выполнена успешно!');
                        
                        if (result && result.length > 0) {
                            const template = result[0];
                            const paramCount = Object.keys(template.default_params || {}).length;
                            const paramKeys = Object.keys(template.default_params || {}).sort();
                            
                            console.log(`📈 Количество полей в шаблоне "${template.name}": ${paramCount}`);
                            console.log('🔑 Поля:', paramKeys.join(', '));
                            
                            // Проверяем наличие ключевых полей Tank interface
                            const requiredFields = [
                                'bookBalance', 'sensors', 'linkedPumps', 'notifications', 
                                'thresholds', 'trading_point_id', 'created_at', 'updated_at'
                            ];
                            
                            const missingFields = requiredFields.filter(field => !paramKeys.includes(field));
                            if (missingFields.length === 0) {
                                console.log('🎉 Все обязательные поля Tank interface присутствуют!');
                            } else {
                                console.log('⚠️  Отсутствуют поля:', missingFields.join(', '));
                            }
                        }
                        
                        resolve(result);
                    } else {
                        console.log('❌ Ошибка проверки:', res.statusCode, data);
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

async function main() {
    try {
        await updateTankTemplate();
        await verifyUpdate();
        
        console.log('\n🎉 Обновление шаблона резервуара завершено успешно!');
        console.log('🏷️  Все поля из Tank interface теперь доступны в default_params');
        console.log('📋 Поля включают: bookBalance, sensors, linkedPumps, notifications, thresholds и системные поля');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('update_tank_template_direct.js')) {
    main()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { updateTankTemplate, verifyUpdate };