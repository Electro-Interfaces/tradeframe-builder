/**
 * Создание демо систем управления для всех торговых точек сети АЗС
 * Использует прямые HTTP запросы к Supabase REST API
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Данные торговых точек демо сети
const demoTradingPoints = [
    {
        id: "9baf5375-9929-4774-8366-c0609b9f2a51",
        code: "point1", 
        name: "АЗС №001 - Центральная",
        location: "Центральный район"
    },
    {
        id: "9be94f90-84d1-4557-b746-460e13485b65", 
        code: "point2",
        name: "АЗС №002 - Северная", 
        location: "Северный район"
    },
    {
        id: "f2566905-c748-4240-ac31-47b626ab625d",
        code: "point3", 
        name: "АЗС №003 - Южная",
        location: "Южный район"
    },
    {
        id: "f7963207-2732-4fae-988e-c73eef7645ca",
        code: "point5", 
        name: "АЗС №005 - Промзона",
        location: "Промышленная зона"
    },
    {
        id: "35f56ffd-826c-43b3-8f15-0f0e870f20cd",
        code: "point6", 
        name: "АЗС №006 - Окружная", 
        location: "Окружное шоссе"
    }
];

// Утилита для HTTP запросов
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
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

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// Функция генерации уникальных данных для каждой системы управления
function generateControlSystemData(tradingPoint, index) {
    const configs = [
        // АЗС №001 - Центральная (флагманская АЗС с максимальной конфигурацией)
        {
            osType: "Windows",
            osVersion: "Windows Server 2022 Datacenter",
            serverType: "Сервер",
            cpuCores: 8,
            ramGb: 32,
            storageGb: 2000,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Кафе", "Мойка", "Электрозарядка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "OCPP 1.6", "HTTP/HTTPS", "FTP/SFTP", "SNMP"],
            ipBase: "192.168.1.",
            manufacturer: "Dell",
            model: "PowerEdge R750",
            location: "Серверная комната"
        },
        // АЗС №002 - Северная (стандартная конфигурация)  
        {
            osType: "Windows",
            osVersion: "Windows Server 2019 Standard", 
            serverType: "Сервер",
            cpuCores: 6,
            ramGb: 16,
            storageGb: 1000,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Мойка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "HTTP/HTTPS", "FTP/SFTP"],
            ipBase: "192.168.2.",
            manufacturer: "HP", 
            model: "ProLiant DL380 Gen10",
            location: "Техническое помещение"
        },
        // АЗС №003 - Южная (расширенная конфигурация)
        {
            osType: "Linux",
            osVersion: "Ubuntu Server 22.04 LTS",
            serverType: "Сервер", 
            cpuCores: 6,
            ramGb: 24,
            storageGb: 1500,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Кафе", "Мойка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "HTTP/HTTPS", "SSH/SFTP"],
            ipBase: "192.168.3.",
            manufacturer: "Supermicro",
            model: "SuperServer 5019S-M",
            location: "Серверный шкаф"
        },
        // АЗС №005 - Промзона (промышленная конфигурация)
        {
            osType: "RTOS",
            osVersion: "QNX Neutrino 7.1", 
            serverType: "Промышленный ПК",
            cpuCores: 4,
            ramGb: 16,
            storageGb: 500,
            role: "НефтоСервер",
            services: ["Топливо", "Электрозарядка"],
            protocols: ["TCP/IP", "Modbus RTU", "CAN Bus", "Profibus"],
            ipBase: "10.0.5.",
            manufacturer: "Siemens",
            model: "SIMATIC IPC547G",
            location: "Промышленный щит"
        },
        // АЗС №006 - Окружная (компактная конфигурация)
        {
            osType: "Windows", 
            osVersion: "Windows 11 IoT Enterprise",
            serverType: "Комп",
            cpuCores: 4,
            ramGb: 8,
            storageGb: 512,
            role: "Терминал",
            services: ["Топливо", "Магазин"],
            protocols: ["TCP/IP", "Modbus RTU", "HTTP/HTTPS"],
            ipBase: "192.168.6.",
            manufacturer: "ASUS",
            model: "PN50 Mini PC",
            location: "Касса оператора"
        }
    ];

    const config = configs[index] || configs[0];
    const pointNumber = tradingPoint.name.match(/№(\d+)/)?.[1] || (index + 1);
    
    return {
        // Основная информация
        "ID": 100 + index,
        "Название": `Система управления ${tradingPoint.name}`,
        "Роль системы": config.role,
        "Тип объекта": "АЗС",
        "Наличие резервирования": index < 3, // Первые 3 АЗС с резервированием
        "Статус": "active",
        
        // Архитектура и ПО
        "Тип ОС": config.osType,
        "Версия ОС": config.osVersion,
        "Тип сервера": config.serverType,
        "Количество ядер CPU": config.cpuCores,
        "Объем RAM (ГБ)": config.ramGb,
        "Объем хранилища (ГБ)": config.storageGb,
        
        // Функциональные возможности
        "Управляемые сервисы": config.services,
        "Встроенный мониторинг": true,
        
        // Сетевые возможности
        "IP-адрес": `${config.ipBase}100`,
        "Количество сетевых интерфейсов": index < 2 ? 3 : 2,
        "Поддерживаемые протоколы": config.protocols,
        "Удаленное администрирование": true,
        
        // Надежность и обслуживание
        "Резервное копирование": true,
        "Политика обновлений": index < 3 ? "автоматическая" : "ручная",
        "Договор техобслуживания": true,
        
        // Дополнительные поля
        "Производитель": config.manufacturer,
        "Модель": config.model,
        "Серийный номер": `SCS${pointNumber}${String(Date.now()).slice(-6)}`,
        "Местоположение": config.location,
        "Дата установки": getRandomInstallDate(index),
        "Последнее обновление ПО": getRandomUpdateDate(),
        
        // Настройки мониторинга
        "Настройки мониторинга": {
            "включен": true,
            "интервал опроса (сек)": 30 + (index * 10),
            "логирование событий": true,
            "уведомления": {
                "критические ошибки": true,
                "предупреждения": true,
                "обновления ПО": index < 3,
                "резервное копирование": true
            }
        },
        
        // Связанное оборудование
        "Связанные терминалы": [],
        "Связанные ТРК": [],
        "Связанные резервуары": [],
        
        // Системные поля
        "Торговая точка": tradingPoint.code,
        "Дата создания": new Date().toISOString(),
        "Дата обновления": new Date().toISOString()
    };
}

function getRandomInstallDate(index) {
    const dates = [
        "2024-01-15", "2024-03-22", "2024-02-10", 
        "2024-04-05", "2024-05-18"
    ];
    return dates[index] || "2024-06-01";
}

function getRandomUpdateDate() {
    const updates = [
        "2024-11-15", "2024-10-28", "2024-11-03",
        "2024-09-20", "2024-11-01"
    ];
    return updates[Math.floor(Math.random() * updates.length)];
}

// Генерация UUID (простая версия)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function createDemoControlSystems() {
    console.log('🚀 Создание демо систем управления для всех торговых точек...');
    
    try {
        // Получаем ID шаблона системы управления
        const templateRequestUrl = `${SUPABASE_URL}/rest/v1/equipment_templates?system_type=eq.control_system&name=eq.${encodeURIComponent('Система управления')}&select=id`;
        const parsedTemplateUrl = url.parse(templateRequestUrl);
        
        const templateOptions = {
            hostname: parsedTemplateUrl.hostname,
            port: parsedTemplateUrl.port || 443,
            path: parsedTemplateUrl.path,
            method: 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const templateResult = await makeRequest(templateOptions);
        
        if (!templateResult || templateResult.length === 0) {
            throw new Error('Шаблон "Система управления" не найден');
        }
        
        const templateId = templateResult[0].id;
        console.log('✅ Найден шаблон системы управления:', templateId);
        
        let createdCount = 0;
        
        for (let i = 0; i < demoTradingPoints.length; i++) {
            const tradingPoint = demoTradingPoints[i];
            const systemData = generateControlSystemData(tradingPoint, i);
            
            console.log(`\n📦 Создание системы управления для ${tradingPoint.name}...`);
            
            // Проверяем существующие системы управления для этой торговой точки
            const checkRequestUrl = `${SUPABASE_URL}/rest/v1/equipment?trading_point_id=eq.${tradingPoint.id}&system_type=eq.control_system&select=id`;
            const parsedCheckUrl = url.parse(checkRequestUrl);
            
            const checkOptions = {
                hostname: parsedCheckUrl.hostname,
                port: parsedCheckUrl.port || 443,
                path: parsedCheckUrl.path,
                method: 'GET',
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            const existing = await makeRequest(checkOptions);
            if (existing && existing.length > 0) {
                console.log(`⚠️  Система управления для ${tradingPoint.name} уже существует, пропускаем`);
                continue;
            }
            
            // Создаем систему управления
            const equipmentId = generateUUID();
            const equipmentPayload = {
                id: equipmentId,
                trading_point_id: tradingPoint.id,
                template_id: templateId,
                name: 'Система управления',
                system_type: 'control_system',
                display_name: systemData["Название"],
                serial_number: systemData["Серийный номер"],
                external_id: `ctrl_${tradingPoint.code}`,
                status: "online", // Используем статус online как в существующем оборудовании
                installation_date: `${systemData["Дата установки"]}T00:00:00Z`,
                params: systemData,
                bindings: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const createRequestUrl = `${SUPABASE_URL}/rest/v1/equipment`;
            const parsedCreateUrl = url.parse(createRequestUrl);
            const postData = JSON.stringify(equipmentPayload);
            
            const createOptions = {
                hostname: parsedCreateUrl.hostname,
                port: parsedCreateUrl.port || 443,
                path: parsedCreateUrl.path,
                method: 'POST',
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Prefer': 'return=minimal'
                }
            };

            await makeRequest(createOptions, postData);
            createdCount++;
            
            console.log(`✅ Создана система управления: ${systemData["Название"]}`);
            console.log(`   📋 Модель: ${systemData["Производитель"]} ${systemData["Модель"]}`);
            console.log(`   💻 ОС: ${systemData["Тип ОС"]} (${systemData["Версия ОС"]})`);
            console.log(`   🔧 Конфигурация: ${systemData["Количество ядер CPU"]} cores, ${systemData["Объем RAM (ГБ)"]} GB RAM`);
            console.log(`   🌐 Сервисы: ${systemData["Управляемые сервисы"].join(', ')}`);
            console.log(`   🔗 Протоколы: ${systemData["Поддерживаемые протоколы"].length} протоколов`);
        }
        
        console.log(`\n🎉 Создание систем управления завершено!`);
        console.log(`📊 Всего создано: ${createdCount} систем управления`);
        console.log(`🏢 Охвачены все торговые точки демо сети АЗС`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при создании систем управления:', error);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('create_demo_control_systems_rest.js')) {
    createDemoControlSystems()
        .then(success => {
            if (success) {
                console.log('\n🎯 Все системы управления успешно созданы и готовы к использованию!');
                console.log('🔧 Теперь в разделе "Оборудование" для каждой АЗС доступна своя система управления');
                console.log('📋 Каждая система имеет уникальную конфигурацию в зависимости от типа и назначения АЗС');
                process.exit(0);
            } else {
                console.log('\n💥 Создание систем управления завершилось с ошибками');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { createDemoControlSystems };