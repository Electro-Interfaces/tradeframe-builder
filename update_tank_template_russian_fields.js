/**
 * Обновление шаблона резервуара с русскими названиями полей
 * Синхронизировано с UI раздела резервуаров
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function updateTankTemplateWithRussianFields() {
    console.log('🚀 Обновление шаблона резервуара с русскими названиями полей...');

    // Полный default_params объект с русскими названиями (как в UI резервуаров)
    const russianFieldsDefaultParams = {
        // Основные характеристики резервуара
        "ID": 1,
        "Название": "",
        "Тип топлива": "",
        "Текущий уровень (л)": 0,
        "Книжный остаток": 0, // Уже на русском
        
        // Параметры емкости
        "Емкость (л)": 50000,
        "Минимальный уровень (%)": 20,
        "Критический уровень (%)": 10,
        
        // Физические параметры (синхронизировано с UI)
        "Температура": 15.0,
        "Подтоварная вода": 0.0, // мм (как в UI)
        "Плотность": 0.725,
        
        // Статус и операционные данные
        "Статус": "active",
        "Местоположение": "Зона не указана",
        "Дата установки": new Date().toISOString().split('T')[0],
        "Последняя калибровка": null,
        "Поставщик": null,
        
        // Датчики (как в UI)
        "Датчики": [
            { "название": "Уровень", "статус": "ok" },
            { "название": "Температура", "статус": "ok" }
        ],
        "Связанные насосы": [],
        
        // Уведомления
        "Настройки уведомлений": {
            "включены": true,
            "уведомления о сливе": true,
            "уведомления об уровне": true
        },
        
        // Пороговые значения (с русскими названиями как в UI форме настроек)
        "Пороговые значения": {
            "критическая температура": {
                "мин": -10,  // "Мин. температура (°C)" из UI
                "макс": 40   // "Макс. температура (°C)" из UI
            },
            "максимальный уровень воды (мм)": 15, // Точно как в UI форме
            "уведомления": {
                "критический уровень": true,  // Как в UI настроек
                "минимальный уровень": true,  // Как в UI настроек
                "температура": true,
                "уровень воды": true  // Как в UI настроек
            }
        },
        
        // Системные поля
        "Торговая точка": "",
        "Дата создания": new Date().toISOString(),
        "Дата обновления": new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        // PATCH запрос для обновления шаблона резервуара
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.fuel_tank&name=eq.${encodeURIComponent('Резервуар')}`;
        
        const postData = JSON.stringify({
            default_params: russianFieldsDefaultParams,
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
                        console.log('✅ Шаблон резервуара обновлен с русскими названиями полей!');
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

async function verifyRussianFieldsUpdate() {
    console.log('\n🔍 Проверяем результат обновления с русскими полями...');
    
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
                            console.log('🔑 Русские поля:', paramKeys.slice(0, 10).join(', '), '...');
                            
                            // Проверяем наличие ключевых русских полей
                            const expectedRussianFields = [
                                'Температура', 'Подтоварная вода', 'Книжный остаток', 
                                'Критический уровень (%)', 'Минимальный уровень (%)',
                                'Пороговые значения', 'Настройки уведомлений'
                            ];
                            
                            const presentRussianFields = expectedRussianFields.filter(field => paramKeys.includes(field));
                            
                            console.log('🎯 Найдены русские поля:');
                            presentRussianFields.forEach(field => console.log(`  ✅ ${field}`));
                            
                            const missingFields = expectedRussianFields.filter(field => !paramKeys.includes(field));
                            if (missingFields.length > 0) {
                                console.log('⚠️  Отсутствуют поля:');
                                missingFields.forEach(field => console.log(`  ❌ ${field}`));
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
        await updateTankTemplateWithRussianFields();
        await verifyRussianFieldsUpdate();
        
        console.log('\n🎉 Обновление шаблона резервуара с русскими полями завершено успешно!');
        console.log('🏷️  Все поля теперь имеют русские названия как в UI раздела резервуаров');
        console.log('📋 Включены: Температура, Подтоварная вода, Критический уровень (%), и др.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('update_tank_template_russian_fields.js')) {
    main()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { updateTankTemplateWithRussianFields, verifyRussianFieldsUpdate };