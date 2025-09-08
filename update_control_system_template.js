/**
 * Обновление шаблона "Система управления" с полным набором русских полей
 * Синхронизировано с требованиями для управления АЗС
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function updateControlSystemTemplate() {
    console.log('🚀 Обновление шаблона "Система управления" с полным набором полей...');

    // Полный default_params объект с русскими названиями для системы управления
    const controlSystemDefaultParams = {
        // 1. Общие свойства
        "ID": 1,
        "Название": "",
        "Роль системы": "НефтоСервер", // Терминал, НефтоСервер
        "Тип объекта": "АЗС", // КАЗС, АЗС  
        "Наличие резервирования": true,
        
        // 2. Архитектура и ПО
        "Тип ОС": "Windows", // Windows, Linux, RTOS
        "Версия ОС": "Windows Server 2022",
        "Тип сервера": "Сервер", // Сервер, Комп
        "Количество ядер CPU": 4,
        "Объем RAM (ГБ)": 16,
        "Объем хранилища (ГБ)": 1000,
        
        // 3. Функциональные возможности
        "Управляемые сервисы": [
            "Топливо",
            "Магазин", 
            "Кафе",
            "Мойка",
            "Электрозарядка"
        ],
        "Встроенный мониторинг": true,
        
        // 4. Сетевые возможности
        "IP-адрес": "192.168.1.100",
        "Количество сетевых интерфейсов": 2,
        "Поддерживаемые протоколы": [
            "TCP/IP",
            "Modbus RTU",
            "Modbus TCP",
            "OCPP 1.6",
            "HTTP/HTTPS",
            "FTP/SFTP"
        ],
        "Удаленное администрирование": true,
        
        // 5. Надежность и обслуживание
        "Резервное копирование": true,
        "Политика обновлений": "ручная", // автоматическая, ручная
        "Договор техобслуживания": true,
        
        // Дополнительные поля для интеграции
        "Статус": "active",
        "Местоположение": "Серверная",
        "Дата установки": new Date().toISOString().split('T')[0],
        "Последнее обновление ПО": null,
        "Производитель": "Custom",
        "Модель": "Industrial Server",
        "Серийный номер": "",
        
        // Настройки мониторинга
        "Настройки мониторинга": {
            "включен": true,
            "интервал опроса (сек)": 30,
            "логирование событий": true,
            "уведомления": {
                "критические ошибки": true,
                "предупреждения": true,
                "обновления ПО": true,
                "резервное копирование": true
            }
        },
        
        // Связанное оборудование
        "Связанные терминалы": [],
        "Связанные ТРК": [],
        "Связанные резервуары": [],
        
        // Системные поля
        "Торговая точка": "",
        "Дата создания": new Date().toISOString(),
        "Дата обновления": new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        // PATCH запрос для обновления шаблона системы управления
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.control_system&name=eq.${encodeURIComponent('Система управления')}`;
        
        const postData = JSON.stringify({
            default_params: controlSystemDefaultParams,
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
                        console.log('✅ Шаблон "Система управления" обновлен с полным набором полей!');
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

async function verifyControlSystemUpdate() {
    console.log('\n🔍 Проверяем обновленный шаблон "Система управления"...');
    
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.control_system&select=name,system_type,default_params`;
        
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
                            console.log('🔑 Русские поля:', paramKeys.slice(0, 15).join(', '), '...');
                            
                            // Проверяем наличие ключевых русских полей
                            const expectedFields = [
                                'Роль системы', 'Тип ОС', 'Количество ядер CPU', 
                                'Управляемые сервисы', 'Поддерживаемые протоколы',
                                'Настройки мониторинга', 'Резервное копирование'
                            ];
                            
                            const presentFields = expectedFields.filter(field => paramKeys.includes(field));
                            
                            console.log('🎯 Найдены ключевые поля:');
                            presentFields.forEach(field => console.log(`  ✅ ${field}`));
                            
                            const missingFields = expectedFields.filter(field => !paramKeys.includes(field));
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
        await updateControlSystemTemplate();
        await verifyControlSystemUpdate();
        
        console.log('\n🎉 Обновление шаблона "Система управления" завершено успешно!');
        console.log('🏷️  Все поля теперь имеют русские названия как в UI');
        console.log('📋 Включены все категории: Общие свойства, Архитектура, Функции, Сеть, Надежность');
        console.log('⚙️  Шаблон готов для использования при добавлении систем управления в оборудование');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('update_control_system_template.js')) {
    main()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { updateControlSystemTemplate, verifyControlSystemUpdate };